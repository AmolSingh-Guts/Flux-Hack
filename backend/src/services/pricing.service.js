import { findCurrentPlanPrice } from '../models/plan.model.js';
import ApiError from '../utils/ApiError.js';
import { roundMoney, toNumber } from '../utils/money.utils.js';

async function loadProduct(connection, productId) {
  const [rows] = await connection.query(
    `SELECT p.*,
       (SELECT COALESCE(SUM(tr.percentage), 0)
        FROM product_taxes pt
        INNER JOIN tax_rules tr ON tr.id = pt.tax_rule_id
        WHERE pt.product_id = p.id AND tr.is_active = 1) AS tax_rate
     FROM products p
     WHERE p.id = ?
     LIMIT 1`,
    [productId],
  );

  if (!rows[0]) {
    throw new ApiError(400, 'One or more selected products do not exist.');
  }

  return rows[0];
}

async function loadVariant(connection, variantId, productId) {
  const [rows] = await connection.query(
    `SELECT * FROM product_variants
     WHERE id = ? AND product_id = ? AND is_active = 1
     LIMIT 1`,
    [variantId, productId],
  );

  if (!rows[0]) {
    throw new ApiError(
      400,
      'A selected product variant does not belong to its product or is inactive.',
    );
  }

  return rows[0];
}

async function loadPlan(connection, planId, productId) {
  const [rows] = await connection.query(
    `SELECT * FROM plans
     WHERE id = ? AND product_id = ? AND status = 'ACTIVE'
     LIMIT 1`,
    [planId, productId],
  );

  if (!rows[0]) {
    throw new ApiError(
      400,
      'A selected plan does not belong to its product or is inactive.',
    );
  }

  return rows[0];
}

export async function priceLines(connection, rawLines) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new ApiError(400, 'At least one line item is required.');
  }

  const lines = [];

  for (const [index, rawLine] of rawLines.entries()) {
    const quantity = toNumber(rawLine.quantity);
    if (quantity <= 0) {
      throw new ApiError(400, `Line ${index + 1} must have a positive quantity.`);
    }

    const product = await loadProduct(connection, rawLine.productId);
    if (product.status !== 'ACTIVE') {
      throw new ApiError(
        400,
        `Product "${product.name}" is inactive and cannot be used.`,
      );
    }

    const variant = rawLine.variantId
      ? await loadVariant(connection, rawLine.variantId, product.id)
      : null;
    const plan = rawLine.planId
      ? await loadPlan(connection, rawLine.planId, product.id)
      : null;

    if (plan && quantity < Number(plan.minimum_quantity)) {
      throw new ApiError(
        400,
        `Plan "${plan.name}" requires a minimum quantity of ${plan.minimum_quantity}.`,
      );
    }

    let calculatedUnitPrice = toNumber(product.sales_price);

    if (variant) {
      calculatedUnitPrice = roundMoney(
        calculatedUnitPrice + toNumber(variant.additional_price),
      );
    }

    if (plan) {
      const planPrice = await findCurrentPlanPrice(plan.id, connection);
      if (!planPrice) {
        throw new ApiError(400, `Plan "${plan.name}" has no active price.`);
      }
      calculatedUnitPrice = toNumber(planPrice.price);
    }

    const unitPrice =
      rawLine.unitPrice !== undefined && rawLine.unitPrice !== null
        ? roundMoney(toNumber(rawLine.unitPrice))
        : calculatedUnitPrice;

    if (unitPrice < 0) {
      throw new ApiError(400, 'Unit price cannot be negative.');
    }

    const subtotal = roundMoney(quantity * unitPrice);
    const requestedDiscount = roundMoney(toNumber(rawLine.discountAmount));
    const discountAmount = roundMoney(
      Math.min(Math.max(requestedDiscount, 0), subtotal),
    );
    const taxRate = roundMoney(toNumber(product.tax_rate));
    const taxableAmount = roundMoney(subtotal - discountAmount);
    const taxAmount = roundMoney((taxableAmount * taxRate) / 100);
    const lineTotal = roundMoney(taxableAmount + taxAmount);

    const description =
      rawLine.description?.trim() ||
      [
        product.name,
        variant?.name ? `— ${variant.name}` : null,
        plan?.name ? `(${plan.name})` : null,
      ]
        .filter(Boolean)
        .join(' ');

    lines.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      planId: plan?.id ?? null,
      description,
      quantity,
      unitPrice,
      taxRate,
      taxAmount,
      discountAmount,
      lineTotal,
      sortOrder: index,
    });
  }

  const totals = lines.reduce(
    (accumulator, line) => ({
      subtotal: roundMoney(accumulator.subtotal + line.quantity * line.unitPrice),
      discountAmount: roundMoney(
        accumulator.discountAmount + line.discountAmount,
      ),
      taxAmount: roundMoney(accumulator.taxAmount + line.taxAmount),
      totalAmount: roundMoney(accumulator.totalAmount + line.lineTotal),
    }),
    { subtotal: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 },
  );

  return { lines, totals };
}

export function calculateInvoiceTotal(lines, discountAmount = 0) {
  const totals = lines.reduce(
    (accumulator, line) => ({
      subtotal: roundMoney(accumulator.subtotal + line.quantity * line.unitPrice),
      lineDiscount: roundMoney(
        accumulator.lineDiscount + line.discountAmount,
      ),
      taxAmount: roundMoney(accumulator.taxAmount + line.taxAmount),
    }),
    { subtotal: 0, lineDiscount: 0, taxAmount: 0 },
  );
  const headerDiscount = roundMoney(
    Math.min(Math.max(toNumber(discountAmount), 0), totals.subtotal),
  );
  const totalAmount = roundMoney(
    totals.subtotal - totals.lineDiscount - headerDiscount + totals.taxAmount,
  );

  return {
    ...totals,
    discountAmount: roundMoney(totals.lineDiscount + headerDiscount),
    headerDiscountAmount: headerDiscount,
    totalAmount,
  };
}
