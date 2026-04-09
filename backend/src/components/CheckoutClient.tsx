"use client";

import { useEffect, useState, useTransition } from "react";

type CartResponse = {
  cart: {
    items: { qty: number; product: { title: string } }[];
    totalCents: number;
    currency: string;
  };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("sl-SI", { style: "currency", currency }).format(
    cents / 100,
  );
}

function CheckoutClient() {
  const [cart, setCart] = useState<CartResponse["cart"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/cart", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as CartResponse;
      setCart(data.cart);
    })();
  }, []);

  function checkout() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok) {
        setError(data?.error ?? "Checkout failed");
        return;
      }
      if (!data?.url) {
        setError("Missing checkout URL");
        return;
      }
      window.location.href = data.url;
    });
  }

  if (!cart) return <p style={{ marginTop: 14, color: "#544237" }}>Nalaganje ...</p>;
  if (cart.items.length === 0) {
    return <p style={{ marginTop: 14, color: "#544237" }}>Košarica je prazna.</p>;
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ color: "#544237", lineHeight: 1.6 }}>
        <div>
          Skupaj: <strong>{formatMoney(cart.totalCents, cart.currency)}</strong>
        </div>
        <div style={{ marginTop: 10 }}>
          {cart.items.map((item) => (
            <div key={item.product.title}>
              {item.product.title} x {item.qty}
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p style={{ marginTop: 12, color: "#7a1f10", fontWeight: 800 }}>{error}</p>
      ) : null}

      <button
        type="button"
        className="button button--primary"
        style={{ marginTop: 16 }}
        onClick={checkout}
        disabled={isPending}
      >
        Plačaj s kartico (Stripe)
      </button>
    </div>
  );
}

export default CheckoutClient;
