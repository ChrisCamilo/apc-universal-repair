import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createPrisma } from "./client.js";
import { copyDatabase, holdsData, type TableName } from "./copy.js";
import { checkDatabase, migrationNames } from "./migrate.js";
import { databaseProvider } from "./provider.js";

// Imports a server from before into the one the desktop app runs: the data of an old clone's PostgreSQL database or
// SQLite file, copied by copyDatabase (see copy.ts) into the database in use, and the photo files its rows name,
// copied from the old photos folder into the new one. importProblem says first why it can't: a source of a newer
// version, one that isn't an APC server's, one that lacks migrations of this version (which the desktop app offers to
// apply, as they only add tables), or a target that already holds data. Photos go first, so a copy that fails leaves
// only files no row names yet, and the data's copy keeps nothing.

/** Why an import can't start. */
export type ImportProblem = "sourceBehind" | "sourceNewer" | "sourceNotApc" | "targetHasData";
/** What an import copied: each table's rows on both sides, and the photo files copied and not found. */
export type ImportResult = { tables: Record<TableName, { source: number; target: number }>; photos: { copied: number; missing: number } };
/** Where an import takes its data from and puts it. */
export type ImportSetup = {
  /** The old server's DATABASE_URL. */
  from: string;
  /** The DATABASE_URL of the database in use, empty and migrated. */
  to: string;
  /** The old server's photos folder, e.g. apps\api\uploads\photos of its clone; without one no file is copied. */
  photosFrom?: string;
  /** The photos folder of the server in use. */
  photosTo: string;
};

/**
 * Copies the photo files the source's rows name, the photo and its thumbnail, into the new photos folder.
 * @param source The old server's database.
 * @param from The old photos folder, if any.
 * @param to The new photos folder, made when missing.
 * @returns How many files were copied, and how many weren't found.
 */
async function copyPhotos(source: PrismaClient, from: string | undefined, to: string): Promise<ImportResult["photos"]> {
  const files = (await source.itemPhoto.findMany({ select: { file: true, thumbFile: true } })).flatMap((photo) => [photo.file, photo.thumbFile]);
  mkdirSync(to, { recursive: true });
  let copied = 0;
  for (const file of files) {
    const original = from && path.join(from, file);
    if (original && existsSync(original)) {
      copyFileSync(original, path.join(to, file));
      copied++;
    }
  }
  return { copied, missing: files.length - copied };
}

/**
 * Says why an import can't start, checking the source first and then the target.
 * @param from The old server's DATABASE_URL.
 * @param to The DATABASE_URL of the database in use.
 * @returns The first problem found, or undefined when it can start.
 */
export async function importProblem(from: string, to: string): Promise<ImportProblem | undefined> {
  const source = await checkDatabase(from);
  if (source.newer.length > 0) {
    return "sourceNewer";
  }
  if (source.foreign || source.missing.length === migrationNames(databaseProvider(from)).length) {
    return "sourceNotApc";
  }
  if (source.missing.length > 0) {
    return "sourceBehind";
  }
  const client = createPrisma(to);
  try {
    return (await holdsData(client)) ? "targetHasData" : undefined;
  } finally {
    await client.$disconnect();
  }
}

/**
 * Imports an old server's data and photos into the database in use, once importProblem finds nothing in the way.
 * @param setup Where the data comes from and goes to.
 * @param onCopied Called after each table, e.g. to show progress.
 * @returns What was copied.
 */
export async function importServer(setup: ImportSetup, onCopied?: (table: TableName, rows: number) => void): Promise<ImportResult> {
  const problem = await importProblem(setup.from, setup.to);
  if (problem) {
    throw new Error(`The import can't start: ${problem}.`);
  }
  const source = createPrisma(setup.from);
  const target = createPrisma(setup.to);
  try {
    const photos = await copyPhotos(source, setup.photosFrom, setup.photosTo);
    return { tables: await copyDatabase(source, target, onCopied), photos };
  } finally {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
  }
}
