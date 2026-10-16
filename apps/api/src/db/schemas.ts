// The PostgreSQL and SQLite schemas hold the same models (see docs/database.md). They may differ only where the
// databases do: the generator and datasource blocks, and native types (@db.…). Spacing is left out too, since
// `prisma format` lines columns up by the longest name.

/** The generator and datasource blocks, which name the provider and the client's folder. */
const SETUP_BLOCK = /^(generator|datasource)\s+\w+\s*\{[\s\S]*?^\}/gm;
/** A native type, e.g. @db.VarChar(32). */
const NATIVE_TYPE = /@db\.\w+(\([^)]*\))?/g;

/**
 * Lists how the models of two schemas differ, line by line.
 * @param postgresql The PostgreSQL schema's text.
 * @param sqlite The SQLite schema's text.
 * @returns One line per difference, e.g. 'Only in SQLite: "photoCount Int"'; empty when the models are the same.
 */
export function modelDifferences(postgresql: string, sqlite: string): string[] {
  const [left, right] = [modelLines(postgresql), modelLines(sqlite)];
  const unmatched = (lines: string[], other: string[]) => {
    const rest = [...other];
    return lines.filter((line) => {
      const at = rest.indexOf(line);
      if (at >= 0) {
        rest.splice(at, 1);
        return false;
      }
      return true;
    });
  };
  return [
    ...unmatched(left, right).map((line) => `Only in PostgreSQL: "${line}"`),
    ...unmatched(right, left).map((line) => `Only in SQLite: "${line}"`),
  ];
}

/**
 * Reads a schema's models as they are compared: without the setup blocks and native types, each line trimmed with
 * single spaces, and no blank lines.
 * @param schema The schema's text.
 * @returns The lines.
 */
function modelLines(schema: string): string[] {
  return schema
    .replace(/\r\n/g, "\n")
    .replace(SETUP_BLOCK, "")
    .split("\n")
    .map((line) => line.replace(NATIVE_TYPE, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
