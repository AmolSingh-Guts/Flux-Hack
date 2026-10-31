export function productTaxRate(product) {
  return (product?.taxes ?? []).reduce(
    (sum, tax) => sum + Number(tax.percentage ?? 0),
    0,
  );
}

export function baseUnitPrice(line, products, plans) {
  const product = products.find((item) => String(item.id) === String(line.productId));
  const variant = product?.variants?.find(
    (item) => String(item.id) === String(line.variantId),
  );
  const plan = plans.find((item) => String(item.id) === String(line.planId));

  if (plan && Number(plan.price) >= 0) {
    return Number(plan.price);
  }

  if (!product) {
    return 0;
  }

  return Number(product.sales_price ?? 0) + Number(variant?.additional_price ?? 0);
}

export function unitPriceFor(line, products, plans) {
  if (line.unitPrice !== '' && line.unitPrice !== null && line.unitPrice !== undefined) {
    return Number(line.unitPrice) || 0;
  }

  return baseUnitPrice(line, products, plans);
}

export function computeLines(lines, products, plans = []) {
  const rows = lines.map((line) => {
    const product = products.find((item) => String(item.id) === String(line.productId));
    const unitPrice = unitPriceFor(line, products, plans);
    const quantity = Number(line.quantity) || 0;
    const discountAmount = Number(line.discountAmount) || 0;
    const taxRate = productTaxRate(product);
    const subtotal = quantity * unitPrice;
    const taxable = Math.max(0, subtotal - discountAmount);
    const taxAmount = (taxable * taxRate) / 100;
    const lineTotal = taxable + taxAmount;

    return {
      product,
      unitPrice,
      quantity,
      discountAmount,
      taxRate,
      subtotal,
      taxAmount,
      lineTotal,
      hasError: !product || quantity <= 0,
    };
  });

  const totals = rows.reduce(
    (accumulator, row) => ({
      subtotal: accumulator.subtotal + row.subtotal,
      discountAmount: accumulator.discountAmount + row.discountAmount,
      taxAmount: accumulator.taxAmount + row.taxAmount,
      totalAmount: accumulator.totalAmount + row.lineTotal,
    }),
    { subtotal: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0 },
  );

  return { rows, totals };
}

export function serializeLines(lines, products, plans = [], { planId } = {}) {
  return lines.map((line) => {
    const product = products.find((item) => String(item.id) === String(line.productId));
    const variant = product?.variants?.find(
      (item) => String(item.id) === String(line.variantId),
    );
    const matchedPlan = plans.find((item) => String(item.id) === String(line.planId));
    const headerPlan = planId
      ? plans.find((item) => String(item.id) === String(planId))
      : null;
    const plan =
      matchedPlan ??
      (headerPlan && String(headerPlan.product_id) === String(product?.id)
        ? headerPlan
        : null);

    const descriptionParts = [
      product?.name,
      variant?.name ? `— ${variant.name}` : null,
      plan?.name ? `(${plan.name})` : null,
    ].filter(Boolean);

    return {
      productId: Number(line.productId),
      variantId: line.variantId ? Number(line.variantId) : null,
      ...(plan ? { planId: Number(plan.id) } : {}),
      description: line.description?.trim() || descriptionParts.join(' ') || null,
      quantity: Number(line.quantity),
      unitPrice:
        line.unitPrice === '' || line.unitPrice === null || line.unitPrice === undefined
          ? null
          : Number(line.unitPrice),
      discountAmount: Number(line.discountAmount) || 0,
    };
  });
}

export function newLine(overrides = {}) {
  return {
    productId: '',
    variantId: '',
    planId: '',
    description: '',
    quantity: 1,
    unitPrice: '',
    discountAmount: '',
    ...overrides,
  };
}
