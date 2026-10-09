import { Share } from 'react-native';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { CSV_TEMPLATE, CSV_TEMPLATE_NAME } from '@apc/shared/item-csv';

// The CSV import and export on the phone: the file picked from the phone's files, copied into the app's cache so its
// text can be read whatever app keeps it, and the template and the exported list handed to the phone's share sheet, to
// save or send them.

/**
 * Opens the phone's files to pick a CSV file and reads its text.
 * @returns The file's name and text, or null when the user cancels.
 */
export async function pickCsv(): Promise<{ name: string; text: string } | null> {
  try {
    const [file] = await pick({ type: [types.csv, types.plainText] });
    const name = file.name ?? 'estoque.csv';
    const [copy] = await keepLocalCopy({ files: [{ uri: file.uri, fileName: name }], destination: 'cachesDirectory' });
    if (copy.status === 'error') {
      throw new Error(copy.copyError);
    }
    return { name, text: await (await fetch(copy.localUri)).text() };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }
}

/**
 * Hands an exported list to the phone's share sheet, to save it or send it to a computer.
 * @param name The file's name, e.g. "estoque-2026-10-09.csv".
 * @param csv The file's text.
 * @returns Whether it was shared; false when the share sheet was closed without sharing.
 */
export async function shareCsv(name: string, csv: string): Promise<boolean> {
  const result = await Share.share({ title: name, message: csv });
  return result.action !== Share.dismissedAction;
}

/** Hands the template to the phone's share sheet, to save it or send it to a computer. */
export async function shareTemplate() {
  await Share.share({ title: CSV_TEMPLATE_NAME, message: CSV_TEMPLATE });
}
