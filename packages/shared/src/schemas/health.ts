import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string(),
  /** The API's version, from apps/api/package.json, the same as the desktop app's on a release, e.g. "0.2.0". */
  version: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
