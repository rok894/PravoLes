"use client";

import { useMemo, useState, useTransition } from "react";

type Product = {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  priceCents: number;
  originalPriceCents: number | null;
  discountPercent: number;
  currency: string;
};

type Props = {
  products: Product[];
  onCartChanged?: () => void;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency }).format(
    cents / 100,
  );
}

function ProductGrid({ products, onCartChanged }: Props) {
  const [isPending, startTransition] = useTransition();
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const sorted = useMemo(
    () => products.slice().sort((a, b) => a.title.localeCompare(b.title)),
    [products],
  );

  function add(productId: string) {
    startTransition(async () => {
      setLastAddedId(productId);
      await fetch("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      onCartChanged?.();
      setTimeout(() => setLastAddedId(null), 900);
    });
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <span>Izdelki</span>
        <h2>Izberite izdelek in dodajte v košarico</h2>
      </div>

      <div className="product-grid">
        {sorted.map((product) => (
          <article className="product-card" key={product.id}>
            <div className="product-card__image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.alt} loading="lazy" />
            </div>
            <div className="product-card__body">
              <div className="product-card__top">
                <h3>{product.title}</h3>
                <div className="product-card__price">
                  <span className="product-card__price-current">
                    {formatMoney(product.priceCents, product.currency)}
                  </span>
                  {product.originalPriceCents ? (
                    <span className="product-card__price-meta">
                      <span className="product-card__price-old">
                        {formatMoney(product.originalPriceCents, product.currency)}
                      </span>
                      <span className="product-card__discount">
                        -{product.discountPercent}%
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
              <p>{product.description}</p>
              <div className="product-card__actions">
                <button
                  type="button"
                  className="button button--primary button--small"
                  onClick={() => add(product.id)}
                  disabled={isPending}
                >
                  {lastAddedId === product.id ? "Dodano" : "Dodaj v košarico"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export type { Product };
export default ProductGrid;
