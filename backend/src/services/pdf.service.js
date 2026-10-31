import PDFDocument from 'pdfkit';
import { formatCurrency } from '../utils/money.utils.js';

const COLORS = {
  navy: '#0f172a',
  blue: '#257beb',
  slate: '#64748b',
  light: '#f1f5f9',
  border: '#e2e8f0',
  dark: '#1e293b',
};

function money(value, currency = 'INR') {
  return formatCurrency(value, currency).replace('₹', 'INR ');
}

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function drawLabelValue(doc, x, y, label, value, width = 220) {
  doc
    .fillColor(COLORS.slate)
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(label.toUpperCase(), x, y, { width });
  doc
    .fillColor(COLORS.dark)
    .fontSize(10)
    .font('Helvetica')
    .text(value ?? '—', x, y + 12, { width });
}

function drawHeader(doc, company, documentLabel, documentNumber) {
  const pageWidth = doc.page.width;
  const margin = 50;

  doc
    .rect(0, 0, pageWidth, 112)
    .fill(COLORS.navy);

  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(company.company_name ?? 'Brightloop Software', margin, 34, {
      width: 320,
    });

  doc
    .fillColor('#cbd5e1')
    .fontSize(9)
    .font('Helvetica')
    .text(
      [company.address, company.city, company.state, company.country]
        .filter(Boolean)
        .join(', '),
      margin,
      62,
      { width: 320 },
    );

  doc.text(
    [company.email, company.phone, company.gst_number ? `GSTIN ${company.gst_number}` : null]
      .filter(Boolean)
      .join('  •  '),
    margin,
    76,
    { width: 360 },
  );

  doc
    .fillColor('#ffffff')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text(documentLabel.toUpperCase(), pageWidth - margin - 220, 36, {
      width: 220,
      align: 'right',
    });

  doc
    .fillColor('#cbd5e1')
    .fontSize(10)
    .font('Helvetica')
    .text(documentNumber, pageWidth - margin - 220, 68, {
      width: 220,
      align: 'right',
    });

  return 140;
}

function drawPartyBlock(doc, { customer, meta }) {
  const margin = 50;
  const pageWidth = doc.page.width;
  const y = 140;

  doc
    .fillColor(COLORS.slate)
    .fontSize(8)
    .font('Helvetica-Bold')
    .text('BILL TO', margin, y);

  doc
    .fillColor(COLORS.dark)
    .fontSize(11)
    .font('Helvetica-Bold')
    .text(customer.customer_name ?? customer.name ?? 'Customer', margin, y + 14, {
      width: 240,
    });

  doc
    .fillColor(COLORS.slate)
    .fontSize(9)
    .font('Helvetica')
    .text(
      [
        customer.company_name,
        customer.customer_address ?? customer.address,
        [customer.customer_city ?? customer.city, customer.customer_state ?? customer.state]
          .filter(Boolean)
          .join(', '),
        customer.customer_country ?? customer.country,
        customer.customer_email ?? customer.email,
        customer.customer_gst_number ?? customer.gst_number
          ? `GSTIN ${customer.customer_gst_number ?? customer.gst_number}`
          : null,
      ]
        .filter(Boolean)
        .join('\n'),
      margin,
      y + 30,
      { width: 260, lineGap: 2 },
    );

  const metaX = pageWidth - margin - 200;
  let metaY = y;

  for (const item of meta) {
    drawLabelValue(doc, metaX, metaY, item.label, item.value, 200);
    metaY += 34;
  }

  return Math.max(metaY, y + 120);
}

function drawTable(doc, startY, columns, rows) {
  const margin = 50;
  const tableWidth = doc.page.width - margin * 2;
  let y = startY;

  doc.rect(margin, y, tableWidth, 26).fill(COLORS.navy);
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

  let cursor = margin + 8;
  for (const column of columns) {
    doc.text(column.label.toUpperCase(), cursor, y + 9, {
      width: column.width - 12,
      align: column.align ?? 'left',
    });
    cursor += column.width;
  }

  y += 26;

  rows.forEach((row, index) => {
    const rowHeight = 30;

    if (y + rowHeight > doc.page.height - 120) {
      doc.addPage();
      y = 50;
    }

    doc
      .rect(margin, y, tableWidth, rowHeight)
      .fill(index % 2 === 0 ? '#ffffff' : COLORS.light);
    doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica');

    cursor = margin + 8;
    for (const column of columns) {
      doc.text(String(row[column.key] ?? ''), cursor, y + 10, {
        width: column.width - 12,
        align: column.align ?? 'left',
        ellipsis: true,
        height: 14,
      });
      cursor += column.width;
    }

    y += rowHeight;
  });

  doc
    .moveTo(margin, y)
    .lineTo(margin + tableWidth, y)
    .strokeColor(COLORS.border)
    .stroke();

  return y;
}

function drawTotals(doc, startY, { subtotal, discountAmount, taxAmount, totalAmount, amountPaid, balanceDue }, currency) {
  const pageWidth = doc.page.width;
  const margin = 50;
  const boxWidth = 240;
  const x = pageWidth - margin - boxWidth;
  let y = startY + 18;

  const rows = [
    ['Subtotal', money(subtotal, currency)],
    ['Discount', `- ${money(discountAmount, currency)}`],
    ['Tax', money(taxAmount, currency)],
  ];

  for (const [label, value] of rows) {
    doc.fillColor(COLORS.slate).fontSize(9).font('Helvetica').text(label, x, y, {
      width: boxWidth - 100,
    });
    doc.fillColor(COLORS.dark).text(value, x + boxWidth - 100, y, {
      width: 100,
      align: 'right',
    });
    y += 18;
  }

  doc
    .moveTo(x, y + 2)
    .lineTo(x + boxWidth, y + 2)
    .strokeColor(COLORS.border)
    .stroke();

  y += 12;
  doc.fillColor(COLORS.navy).fontSize(11).font('Helvetica-Bold').text('Total', x, y, {
    width: boxWidth - 100,
  });
  doc.text(money(totalAmount, currency), x + boxWidth - 100, y, {
    width: 100,
    align: 'right',
  });
  y += 24;

  if (amountPaid !== undefined) {
    doc.fillColor(COLORS.slate).fontSize(9).font('Helvetica').text('Amount paid', x, y, {
      width: boxWidth - 100,
    });
    doc.fillColor(COLORS.dark).text(money(amountPaid, currency), x + boxWidth - 100, y, {
      width: 100,
      align: 'right',
    });
    y += 18;
    doc.fillColor(COLORS.navy).fontSize(10).font('Helvetica-Bold').text('Balance due', x, y, {
      width: boxWidth - 100,
    });
    doc.text(money(balanceDue, currency), x + boxWidth - 100, y, {
      width: 100,
      align: 'right',
    });
    y += 22;
  }

  return y;
}

function drawFooter(doc, company, notes) {
  const pageWidth = doc.page.width;
  const margin = 50;
  const y = doc.page.height - 96;

  doc
    .moveTo(margin, y)
    .lineTo(pageWidth - margin, y)
    .strokeColor(COLORS.border)
    .stroke();

  if (notes) {
    doc
      .fillColor(COLORS.slate)
      .fontSize(8)
      .font('Helvetica')
      .text(notes, margin, y + 10, { width: pageWidth - margin * 2, height: 30 });
  }

  doc
    .fillColor(COLORS.slate)
    .fontSize(8)
    .font('Helvetica')
    .text(
      company.invoice_footer ?? 'Thank you for choosing Brightloop Software.',
      margin,
      doc.page.height - 46,
      { width: pageWidth - margin * 2, align: 'center' },
    );
}

function renderDocument(builder) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      builder(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateQuotationPdf(quotation, company) {
  return renderDocument((doc) => {
    const startY = drawHeader(
      doc,
      company,
      'Quotation',
      quotation.quotation_number,
    );
    const partyEnd = drawPartyBlock(doc, {
      customer: quotation,
      meta: [
        { label: 'Issue date', value: formatDate(quotation.created_at) },
        { label: 'Valid until', value: formatDate(quotation.valid_until) },
        { label: 'Status', value: quotation.status },
      ],
    });

    const rows = quotation.lines.map((line, index) => ({
      index: index + 1,
      description: line.description,
      quantity: Number(line.quantity).toFixed(2),
      unitPrice: money(line.unit_price, quotation.currency),
      tax: `${Number(line.tax_rate).toFixed(2)}%`,
      total: money(line.line_total, quotation.currency),
    }));

    const tableEnd = drawTable(doc, partyEnd + 24, [
      { key: 'index', label: '#', width: 25 },
      { key: 'description', label: 'Description', width: 200 },
      { key: 'quantity', label: 'Qty', width: 45, align: 'right' },
      { key: 'unitPrice', label: 'Unit price', width: 80, align: 'right' },
      { key: 'tax', label: 'Tax', width: 45, align: 'right' },
      { key: 'total', label: 'Total', width: 100, align: 'right' },
    ], rows);

    const totalsEnd = drawTotals(doc, tableEnd, {
      subtotal: quotation.subtotal,
      discountAmount: quotation.discount_amount,
      taxAmount: quotation.tax_amount,
      totalAmount: quotation.total_amount,
    }, quotation.currency);

    if (quotation.notes) {
      doc
        .fillColor(COLORS.slate)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('NOTES', 50, totalsEnd + 24);
      doc
        .fillColor(COLORS.dark)
        .fontSize(9)
        .font('Helvetica')
        .text(quotation.notes, 50, totalsEnd + 38, { width: 300 });
    }

    if (quotation.terms_text) {
      doc
        .fillColor(COLORS.slate)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('TERMS', 50, totalsEnd + 84);
      doc
        .fillColor(COLORS.dark)
        .fontSize(9)
        .font('Helvetica')
        .text(quotation.terms_text, 50, totalsEnd + 98, { width: 420 });
    }

    drawFooter(doc, company);
  });
}

export async function generateInvoicePdf(invoice, company) {
  return renderDocument((doc) => {
    const startY = drawHeader(doc, company, 'Invoice', invoice.invoice_number);
    const partyEnd = drawPartyBlock(doc, {
      customer: invoice,
      meta: [
        { label: 'Invoice date', value: formatDate(invoice.invoice_date) },
        { label: 'Due date', value: formatDate(invoice.due_date) },
        { label: 'Status', value: invoice.status },
      ],
    });

    const rows = invoice.lines.map((line, index) => ({
      index: index + 1,
      description: line.description,
      quantity: Number(line.quantity).toFixed(2),
      unitPrice: money(line.unit_price, invoice.currency),
      tax: `${Number(line.tax_rate).toFixed(2)}%`,
      total: money(line.line_total, invoice.currency),
    }));

    const tableEnd = drawTable(doc, partyEnd + 24, [
      { key: 'index', label: '#', width: 25 },
      { key: 'description', label: 'Description', width: 200 },
      { key: 'quantity', label: 'Qty', width: 45, align: 'right' },
      { key: 'unitPrice', label: 'Unit price', width: 80, align: 'right' },
      { key: 'tax', label: 'Tax', width: 45, align: 'right' },
      { key: 'total', label: 'Total', width: 100, align: 'right' },
    ], rows);

    const totalsEnd = drawTotals(doc, tableEnd, {
      subtotal: invoice.subtotal,
      discountAmount: invoice.discount_amount,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      amountPaid: invoice.amount_paid,
      balanceDue: invoice.balance_due,
    }, invoice.currency);

    if (invoice.billing_period_start && invoice.billing_period_end) {
      doc
        .fillColor(COLORS.slate)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Billing period: ${formatDate(invoice.billing_period_start)} — ${formatDate(invoice.billing_period_end)}`,
          50,
          totalsEnd + 18,
          { width: 320 },
        );
    }

    if (invoice.notes) {
      doc
        .fillColor(COLORS.dark)
        .fontSize(9)
        .font('Helvetica')
        .text(invoice.notes, 50, totalsEnd + 36, { width: 320 });
    }

    drawFooter(doc, company);
  });
}

export async function generateReceiptPdf(payment, company) {
  return renderDocument((doc) => {
    drawHeader(doc, company, 'Receipt', payment.payment_number);
    const partyEnd = drawPartyBlock(doc, {
      customer: {
        customer_name: payment.customer_name,
        company_name: payment.company_name,
        customer_email: payment.customer_email,
        customer_address: payment.customer_address,
      },
      meta: [
        { label: 'Payment date', value: formatDate(payment.payment_date) },
        { label: 'Method', value: String(payment.payment_method).replaceAll('_', ' ') },
        { label: 'Invoice', value: payment.invoice_number },
      ],
    });

    let y = partyEnd + 30;
    doc
      .rect(50, y, doc.page.width - 100, 26)
      .fill(COLORS.navy);
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('DESCRIPTION', 58, y + 9);
    doc.text('AMOUNT', doc.page.width - 158, y + 9, { width: 100, align: 'right' });
    y += 26;

    doc.fillColor(COLORS.dark).fontSize(10).font('Helvetica');
    doc.text(`Payment received for invoice ${payment.invoice_number}`, 58, y + 12, {
      width: 360,
    });
    doc.text(money(payment.amount, payment.currency), doc.page.width - 158, y + 12, {
      width: 100,
      align: 'right',
    });
    y += 40;

    doc
      .moveTo(50, y)
      .lineTo(doc.page.width - 50, y)
      .strokeColor(COLORS.border)
      .stroke();

    doc.fillColor(COLORS.navy).fontSize(11).font('Helvetica-Bold').text('Total paid', doc.page.width - 258, y + 14, {
      width: 200,
    });
    doc.text(money(payment.amount, payment.currency), doc.page.width - 158, y + 14, {
      width: 100,
      align: 'right',
    });

    if (payment.transaction_reference) {
      doc
        .fillColor(COLORS.slate)
        .fontSize(9)
        .font('Helvetica')
        .text(`Transaction reference: ${payment.transaction_reference}`, 50, y + 50);
    }

    drawFooter(doc, company);
  });
}
