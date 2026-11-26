import { z } from "zod";

// Why the API refuses a request, as both apps read it. Every refusal carries a reason, a stable key the apps write their
// text from, in the language chosen, from the catalog of the feature it belongs to; its message stays in English, for
// logs and developers. A status can have several reasons (a 409 of the lists is a name taken, an entry in use or a
// merge it can't take), so the apps read the reason, never the status.

/** Every reason the API refuses with, by feature. */
export const REFUSAL_REASONS = [
  // The session, the login, the sign-up and the devices.
  "loggedOut",
  "loginRefused",
  "entryRefused",
  "usernameTaken",
  "devicePending",
  "deviceRefused",
  "deviceNotFound",
  "notOnServer",
  "tooManyAttempts",
  // The catalog.
  "nodeNotFound",
  "brandInCatalog",
  "modelInCatalog",
  "modelTaken",
  "nodeInUse",
  "periodOutside",
  "periodsOutsideYears",
  "periodTaken",
  // The items, their photos and the import.
  "itemNotFound",
  "brandNotFound",
  "foreignBrand",
  "idTaken",
  "codeRepeated",
  "codeTaken",
  "partBrandRepeated",
  "photosInvalid",
  "photoNotFound",
  "photoUnsigned",
  "importConflict",
  // The item lists.
  "entryNotFound",
  "vehicleBrandNotFound",
  "entryInUse",
  "entryTaken",
  "mergeSame",
  "mergeShared",
  "mergeOtherBrand",
  // The phone's copy.
  "cursorGone",
  // Any request.
  "invalid",
  "hostNotAllowed",
  "routeNotFound",
  "requestRefused",
  "serverError",
] as const;

/** A refusal's body: its status, its name, its message in English, its reason, and the fields or entries at fault. */
export const refusalSchema = z.object({
  statusCode: z.int(),
  error: z.string(),
  message: z.string(),
  reason: z.enum(REFUSAL_REASONS),
  details: z.array(z.record(z.string(), z.unknown())).optional(),
  code: z.string().optional(),
});

/** Why the API refused a request. */
export type RefusalReason = (typeof REFUSAL_REASONS)[number];
/** A refusal's body. */
export type Refusal = z.infer<typeof refusalSchema>;

/**
 * Reads why a response was refused, from its body; null when it isn't a refusal, such as a body that isn't JSON or a
 * reply from something other than the API.
 * @param response The response, refused.
 * @returns The refusal's reason, or null.
 */
export async function refusalReason(response: Response): Promise<RefusalReason | null> {
  const body = await response
    .clone()
    .json()
    .catch(() => null);
  const read = refusalSchema.safeParse(body);
  return read.success ? read.data.reason : null;
}
