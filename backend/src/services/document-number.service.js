import { getCompanySettings } from '../models/settings.model.js';

/**
 * Generates a human-readable document number inside the caller's transaction.
 * The row lock serialises concurrent requests for the same document type/year.
 */
export async function nextDocumentNumber(
  connection,
  { type, prefix, date = new Date() },
) {
  const year = new Date(date).getUTCFullYear();

  await connection.query(
    `INSERT IGNORE INTO document_sequences (document_type, year, next_number)
     VALUES (?, ?, 1)`,
    [type, year],
  );

  const [rows] = await connection.query(
    `SELECT next_number
     FROM document_sequences
     WHERE document_type = ? AND year = ?
     FOR UPDATE`,
    [type, year],
  );

  const currentNumber = rows[0].next_number;

  await connection.query(
    `UPDATE document_sequences
     SET next_number = next_number + 1
     WHERE document_type = ? AND year = ?`,
    [type, year],
  );

  return `${prefix}-${year}-${String(currentNumber).padStart(6, '0')}`;
}

/**
 * Reads the configured prefix from company settings before generating a number.
 */
export async function nextConfiguredDocumentNumber(
  connection,
  { type, settingKey, fallbackPrefix, date = new Date() },
) {
  const settings = await getCompanySettings(connection);
  const prefix = settings?.[settingKey]?.trim() || fallbackPrefix;

  return nextDocumentNumber(connection, { type, prefix, date });
}
