// `pnpm --filter @apc/api photos:compress`: reduces the photos stored before photos were reduced on saving, the way
// they are reduced now (see reduceStoredPhoto), and saves each new file name in its row. It runs once after the
// update and is safe to run again: a photo already reduced is left as it is. Reads DATABASE_URL and PHOTOS_DIR from
// apps/api/.env; run it with the API off or idle.
import "dotenv/config";
import { prisma } from "../db/client.js";
import { reduceStoredPhoto } from "./photos.js";

let reduced = 0;
let kept = 0;
let failed = 0;
for (const row of await prisma.itemPhoto.findMany({ select: { id: true, file: true } })) {
  try {
    const file = await reduceStoredPhoto(row, async (file) => {
      await prisma.itemPhoto.update({ where: { id: row.id }, data: { file } });
    });
    if (file) {
      reduced += 1;
    } else {
      kept += 1;
    }
  } catch (error) {
    failed += 1;
    console.error(`Photo ${row.id} (${row.file}) couldn't be reduced:`, error);
  }
}
console.log(`${reduced} photos reduced, ${kept} already reduced, ${failed} failed.`);
await prisma.$disconnect();
process.exitCode = failed > 0 ? 1 : 0;
