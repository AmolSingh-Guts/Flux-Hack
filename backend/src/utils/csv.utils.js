export function toCsv(rows, columns) {
  const escapeValue = (value) => {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    return /[",\n\r]/.test(stringValue)
      ? `"${stringValue.replaceAll('"', '""')}"`
      : stringValue;
  };

  const header = columns.map((column) => escapeValue(column.label)).join(',');
  const body = rows
    .map((row) =>
      columns.map((column) => escapeValue(row[column.key])).join(','),
    )
    .join('\n');

  return `${header}\n${body}`;
}

export function sendCsv(response, filename, csv) {
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename.replaceAll('"', '')}"`,
  );
  response.status(200).send(csv);
}
