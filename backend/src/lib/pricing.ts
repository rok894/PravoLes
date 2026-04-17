function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(0, Math.trunc(value)));
}

function salePriceCentsFromDiscountPercent(baseCents: number, discountPercent: number) {
  const base = Math.max(1, Math.trunc(baseCents));
  const pct = clampDiscountPercent(discountPercent);
  if (pct <= 0) return base;
  return Math.max(1, Math.round((base * (100 - pct)) / 100));
}

function discountPercentFromSalePriceCents(baseCents: number, saleCents: number) {
  const base = Math.max(1, Math.trunc(baseCents));
  const sale = Math.max(1, Math.trunc(saleCents));
  if (sale >= base) return 0;
  const pct = Math.round(((base - sale) / base) * 100);
  return clampDiscountPercent(pct);
}

function effectivePriceCents(product: { priceCents: number; discountPercent?: number | null; salePriceCents?: number | null }) {
  const base = Math.max(1, Math.trunc(product.priceCents));

  const explicitSale =
    typeof product.salePriceCents === "number" && Number.isFinite(product.salePriceCents)
      ? Math.trunc(product.salePriceCents)
      : null;
  if (explicitSale && explicitSale > 0 && explicitSale < base) {
    return explicitSale;
  }

  const pct = clampDiscountPercent(product.discountPercent ?? 0);
  return salePriceCentsFromDiscountPercent(base, pct);
}

function publicProduct<T extends { priceCents: number; discountPercent?: number | null; currency: string }>(
  product: T & {
    id: string;
    title: string;
    description: string;
    image: string;
    alt: string;
  },
) {
  const base = Math.max(1, Math.trunc(product.priceCents));
  const sale = effectivePriceCents(product);
  const hasDiscount = sale < base;
  const pct = hasDiscount ? discountPercentFromSalePriceCents(base, sale) : 0;
  const original = hasDiscount ? base : null;

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    image: product.image,
    alt: product.alt,
    currency: product.currency,
    priceCents: sale,
    originalPriceCents: original,
    discountPercent: pct,
  };
}

export {
  clampDiscountPercent,
  discountPercentFromSalePriceCents,
  effectivePriceCents,
  publicProduct,
  salePriceCentsFromDiscountPercent,
};
