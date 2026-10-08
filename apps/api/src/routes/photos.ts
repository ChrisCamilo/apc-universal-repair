import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { z } from "zod";
import { itemIdParamsSchema, itemSchema } from "@apc/shared/items";
import { ITEM_PHOTO_LIMIT, PHOTO_PARTS } from "@apc/shared/photos";
import { prisma } from "../db/client.js";
import { ITEM_INCLUDE, toItem } from "../items/items.js";
import { checkPhoto, photosDir, removePhotoFiles, storePhoto } from "../photos/photos.js";
import { notFound } from "./items.js";

// An item's photos. PUT /items/:id/photos sets them all at once, in the order of the request's parts: a "keep" part
// keeps a saved photo by its id and a "photo" part adds a new file, so one request adds, removes, replaces and
// reorders. Everything sent is checked before anything is stored: at most 3 photos, each new one a JPG, PNG or
// WebP up to 3 MB by its content, and each kept one a photo of this item. Photos left out are deleted with their
// files. GET /photos/:file serves the stored files, which never change, since each new photo gets a new id.

/** Content type of each stored file, by extension. */
const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
// A stored file's name: a photo id, "-thumb" for the thumbnail, and its extension; nothing else is served.
const photoFileParamsSchema = z.object({
  file: z.string().regex(/^[0-9a-f-]{36}(-thumb)?\.(jpg|png|webp)$/, "Not a photo file."),
});

const uuidSchema = z.uuid();

/** One photo of the new set: a saved one kept, or a new file with what checkPhoto found. */
type PhotoEntry = { keep: string } | { buffer: Buffer; ext: "jpg" | "png" | "webp" };

/**
 * Answers 400 naming what keeps the photos from being saved.
 * @param reply Reply to send.
 * @param messages One message per problem, e.g. "Photo 2 is larger than 3 MB."
 * @returns The sent reply.
 */
function badPhotos(reply: FastifyReply, messages: string[]) {
  return reply.status(400).send({
    statusCode: 400,
    error: "Bad Request",
    message: "The photos can't be saved.",
    details: messages.map((message) => ({ field: "photos", message })),
  });
}

/**
 * Tells whether a part's value is a photo id.
 * @param value The value of a form part.
 * @returns True for a UUID.
 */
function isUuid(value: unknown): boolean {
  return uuidSchema.safeParse(value).success;
}

export function registerPhotoRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.put(
    "/items/:id/photos",
    { schema: { params: itemIdParamsSchema, response: { 200: itemSchema } } },
    async (request, reply) => {
      const entries: PhotoEntry[] = [];
      const problems: string[] = [];
      for await (const part of request.parts()) {
        const number = entries.length + problems.length + 1;
        if (part.type === "file" && part.fieldname === PHOTO_PARTS.file) {
          const buffer = await part.toBuffer();
          const checked = part.file.truncated ? { problem: "is larger than 3 MB" } : await checkPhoto(buffer);
          if ("problem" in checked) {
            problems.push(`Photo ${number} ${checked.problem}.`);
          } else {
            entries.push({ buffer, ext: checked.ext });
          }
        } else if (part.type === "field" && part.fieldname === PHOTO_PARTS.keep && isUuid(part.value)) {
          entries.push({ keep: String(part.value) });
        } else {
          problems.push(`Part ${number} is neither a "${PHOTO_PARTS.keep}" photo id nor a "${PHOTO_PARTS.file}" file.`);
        }
      }
      if (entries.length + problems.length > ITEM_PHOTO_LIMIT) {
        problems.push(`An item holds at most ${ITEM_PHOTO_LIMIT} photos.`);
      }
      if (problems.length > 0) {
        return badPhotos(reply, problems);
      }

      const { id } = request.params;
      const item = await prisma.item.findUnique({ where: { id }, include: ITEM_INCLUDE });
      if (!item) {
        return notFound(reply);
      }
      const saved = new Map(item.photos.map((photo) => [photo.id, photo]));
      const kept = entries.flatMap((entry) => ("keep" in entry ? [entry.keep] : []));
      if (kept.some((photoId) => !saved.has(photoId)) || new Set(kept).size < kept.length) {
        return badPhotos(reply, ["Kept photos must be this item's photos, each kept once."]);
      }

      const photos = await Promise.all(
        entries.map(async (entry) => {
          if ("keep" in entry) {
            return saved.get(entry.keep)!;
          }
          const photoId = randomUUID();
          return { id: photoId, ...(await storePhoto(photoId, entry.buffer, entry.ext)) };
        }),
      );
      const added = photos.filter((photo) => !saved.has(photo.id));
      try {
        await prisma.$transaction([
          prisma.itemPhoto.deleteMany({ where: { itemId: id } }),
          prisma.itemPhoto.createMany({
            data: photos.map(({ id: photoId, file, thumbFile }, position) => ({ id: photoId, itemId: id, position, file, thumbFile })),
          }),
        ]);
      } catch (error) {
        await removePhotoFiles(added.flatMap((photo) => [photo.file, photo.thumbFile]));
        throw error;
      }
      await removePhotoFiles(
        item.photos.filter((photo) => !kept.includes(photo.id)).flatMap((photo) => [photo.file, photo.thumbFile]),
      );
      return toItem((await prisma.item.findUnique({ where: { id }, include: ITEM_INCLUDE }))!);
    },
  );

  routes.get("/photos/:file", { schema: { params: photoFileParamsSchema } }, async (request, reply) => {
    const { file } = request.params;
    const content = await readFile(path.join(photosDir(), file)).catch(() => null);
    if (!content) {
      return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Photo not found." });
    }
    return reply
      .header("cache-control", "public, max-age=31536000, immutable")
      .type(CONTENT_TYPES[path.extname(file).slice(1)])
      .send(content);
  });
}
