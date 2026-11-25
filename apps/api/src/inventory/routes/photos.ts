import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { itemBrandIdParamsSchema, itemSchema } from "@apc/domain/items";
import { answer, notFound, refuse, unauthorized } from "../../http/replies.js";
import { replaceBrandPhotos, type PhotoPart } from "../brandPhotos.js";
import { photosDir } from "../photos.js";
import { validPhotoSignature, type SessionLookup } from "../../auth/sessions.js";

// The photo routes. PUT /items/:id/brands/:brandId/photos reads the request's parts and sets the brand's photos to
// them (see ../brandPhotos.ts), answering the item, or 400 for a set that breaks the rules and 404 for an item or brand
// that isn't there. GET /photos/:file serves the stored files, which never change, since each new photo gets a new id.
// It is open without a session, as <img> can't send one, but only at a path the API signed for a live session (see
// sessions.ts), answering 401 otherwise; the browser keeps the file only for this device, until the path changes.

/** Content type of each stored file, by extension. */
const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
// A stored file's name: a photo id, "-thumb" for the thumbnail, and its extension; nothing else is served.
const photoFileParamsSchema = z.object({
  file: z.string().regex(/^[0-9a-f-]{36}(-thumb)?\.(jpg|png|webp)$/, "Not a photo file."),
});
/** Refuses a stored file that isn't there. */
const PHOTO_NOT_FOUND = notFound("Photo not found.");
/** The session a photo path is signed for, and its signature; a path without them is answered 401. */
const photoSignatureQuerySchema = z.object({ session: z.string().optional(), signature: z.string().optional() });
/** Refuses a photo path the API didn't sign for a live session. */
const UNSIGNED = unauthorized("This photo path isn't signed for a session.");

/**
 * Registers the item photo routes.
 * @param app The Fastify app.
 * @param sessions Where the sessions signed photo paths name are looked up.
 */
export function registerPhotoRoutes(app: FastifyInstance, sessions: SessionLookup) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.put(
    "/items/:id/brands/:brandId/photos",
    { schema: { params: itemBrandIdParamsSchema, response: { 200: itemSchema } } },
    async (request, reply) => {
      const parts: PhotoPart[] = [];
      for await (const part of request.parts()) {
        parts.push(
          part.type === "file"
            ? { field: part.fieldname, file: await part.toBuffer(), truncated: part.file.truncated }
            : { field: part.fieldname, value: part.value },
        );
      }
      return answer(reply, await replaceBrandPhotos(request.params.id, request.params.brandId, parts, request.session));
    },
  );

  routes.get(
    "/photos/:file",
    { config: { public: true }, schema: { params: photoFileParamsSchema, querystring: photoSignatureQuerySchema } },
    async (request, reply) => {
      const { file } = request.params;
      const { session: sessionId, signature } = request.query;
      const session = sessionId && signature ? await sessions.byId(sessionId) : null;
      if (!session || !validPhotoSignature(session, file, signature!)) {
        return refuse(reply, UNSIGNED);
      }
      const content = await readFile(path.join(photosDir(), file)).catch(() => null);
      if (!content) {
        return refuse(reply, PHOTO_NOT_FOUND);
      }
      return reply
        .header("cache-control", "private, max-age=31536000, immutable")
        .type(CONTENT_TYPES[path.extname(file).slice(1)])
        .send(content);
    },
  );
}
