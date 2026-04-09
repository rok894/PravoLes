"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

type CartProduct = {
  id: string;
  title: string;
  priceCents: number;
  currency: string;
};

type CartItem = {
  product: CartProduct;
  qty: number;
  lineTotalCents: number;
};

type CartResponse = {
  cart: {
    id: string;
    status: string;
    items: CartItem[];
    totalCents: number;
    currency: string;
  };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency }).format(
    cents / 100,
  );
}

function CartSidebar() {
  const [cart, setCart] = useState<CartResponse["cart"] | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as CartResponse;
      setCart(data.cart);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totalCount = useMemo(
    () => (cart ? cart.items.reduce((sum, item) => sum + item.qty, 0) : 0),
    [cart],
  );

  async function add(productId: string) {
    await fetch("/api/cart/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    refresh();
  }

  async function setQty(productId: string, qty: number) {
    await fetch("/api/cart/items", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, qty }),
    });
    refresh();
  }

  async function remove(productId: string) {
    await fetch("/api/cart/items", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    refresh();
  }

  async function clear() {
    await fetch("/api/cart/items", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    refresh();
  }

  return (
    <section className="cart" aria-label="Košarica">
      <div className="cart__header">
        <div className="cart__title">
          Košarica <span className="cart__count">{totalCount}</span>
        </div>
        <button
          type="button"
          className="cart__clear"
          onClick={() => startTransition(clear)}
          disabled={!cart || cart.items.length === 0 || isPending}
        >
          Počisti
        </button>
      </div>

      {!cart ? (
        <p className="cart__empty">Nalaganje ...</p>
      ) : cart.items.length === 0 ? (
        <p className="cart__empty">Košarica je prazna.</p>
      ) : (
        <div className="cart__items">
          {cart.items.map((item) => (
            <div className="cart__item" key={item.product.id}>
              <div className="cart__item-main">
                <div className="cart__item-title">{item.product.title}</div>
                <div className="cart__item-meta">
                  {item.qty} x{" "}
                  {formatMoney(item.product.priceCents, item.product.currency)}
                </div>
              </div>
              <div className="cart__item-actions">
                <button
                  type="button"
                  className="cart__btn"
                  onClick={() => startTransition(() => add(item.product.id))}
                  disabled={isPending}
                >
                  +
                </button>
                <button
                  type="button"
                  className="cart__btn"
                  onClick={() =>
                    startTransition(() => setQty(item.product.id, item.qty - 1))
                  }
                  disabled={isPending}
                >
                  -
                </button>
                <button
                  type="button"
                  className="cart__btn cart__btn--danger"
                  onClick={() => startTransition(() => remove(item.product.id))}
                  disabled={isPending}
                >
                  Odstrani
                </button>
              </div>
              <div className="cart__line-total">
                {formatMoney(item.lineTotalCents, cart.currency)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="cart__footer">
        <div className="cart__total">
          Skupaj:{" "}
          <span className="cart__total-value">
            {cart ? formatMoney(cart.totalCents, cart.currency) : "—"}
          </span>
        </div>
        <a className="cart__checkout" href="/checkout">
          Nadaljuj na plačilo
        </a>
      </div>
    </section>
  );
}

export default CartSidebar;
