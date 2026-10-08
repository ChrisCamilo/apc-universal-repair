import { Share } from 'react-native';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import { CSV_TEMPLATE, CSV_TEMPLATE_NAME } from '@apc/shared/item-csv';

// The CSV import on the phone: the file picked from the phone's files, copied into the app's cache so its text can
// be read whatever app keeps it, and the template handed to the phone's share sheet, to save or send it.

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

/** Hands the template to the phone's share sheet, to save it or send it to a computer. */
export async function shareTemplate() {
  await Share.share({ title: CSV_TEMPLATE_NAME, message: CSV_TEMPLATE });
}
