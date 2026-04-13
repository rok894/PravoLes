import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartProduct = {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  priceCents: number;
  currency: string;
};

type CartItem = {
  product: CartProduct;
  qty: number;
};

type CartState = {
  items: CartItem[];
};

type CartApi = {
  items: CartItem[];
  totalCount: number;
  totalPriceCents: number;
  add: (product: CartProduct) => void;
  removeOne: (id: string) => void;
  removeAll: (id: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "pravoles_cart_v2";

function safeParseCart(json: string | null): CartState | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as unknown;
    if (!value || typeof value !== "object") return null;
    const items = (value as { items?: unknown }).items;
    if (!Array.isArray(items)) return null;
    const parsedItems: CartItem[] = [];
    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== "object") continue;
      const product = (rawItem as { product?: unknown }).product;
      const qty = (rawItem as { qty?: unknown }).qty;
      if (!product || typeof product !== "object") continue;
      const id = (product as { id?: unknown }).id;
      const title = (product as { title?: unknown }).title;
      const description = (product as { description?: unknown }).description;
      const image = (product as { image?: unknown }).image;
      const alt = (product as { alt?: unknown }).alt;
      const priceCents = (product as { priceCents?: unknown }).priceCents;
      const currency = (product as { currency?: unknown }).currency;
      if (
        typeof id !== "string" ||
        typeof title !== "string" ||
        typeof description !== "string" ||
        typeof image !== "string" ||
        typeof alt !== "string" ||
        typeof priceCents !== "number" ||
        typeof currency !== "string"
      ) {
        continue;
      }
      const qtyNum = typeof qty === "number" ? qty : 1;
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) continue;
      parsedItems.push({
        product: { id, title, description, image, alt, priceCents, currency },
        qty: Math.floor(qtyNum),
      });
    }
    return { items: parsedItems };
  } catch {
    return null;
  }
}

const CartContext = createContext<CartApi | null>(null);

function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    const fromStorage = safeParseCart(localStorage.getItem(STORAGE_KEY));
    return fromStorage ?? { items: [] };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const api = useMemo<CartApi>(() => {
    const totalCount = state.items.reduce((sum, item) => sum + item.qty, 0);
    const totalPriceCents = state.items.reduce(
      (sum, item) => sum + item.product.priceCents * item.qty,
      0,
    );

    function add(product: CartProduct) {
      setState((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.product.id === product.id,
        );
        if (existingIndex === -1) {
          return { items: [...prev.items, { product, qty: 1 }] };
        }
        const next = prev.items.slice();
        next[existingIndex] = {
          product: next[existingIndex].product,
          qty: next[existingIndex].qty + 1,
        };
        return { items: next };
      });
    }

    function removeOne(id: string) {
      setState((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.product.id === id,
        );
        if (existingIndex === -1) return prev;
        const existing = prev.items[existingIndex];
        if (existing.qty <= 1) {
          return { items: prev.items.filter((item) => item.product.id !== id) };
        }
        const next = prev.items.slice();
        next[existingIndex] = { product: existing.product, qty: existing.qty - 1 };
        return { items: next };
      });
    }

    function removeAll(id: string) {
      setState((prev) => ({
        items: prev.items.filter((item) => item.product.id !== id),
      }));
    }

    function clear() {
      setState({ items: [] });
    }

    return {
      items: state.items,
      totalCount,
      totalPriceCents,
      add,
      removeOne,
      removeAll,
      clear,
    };
  }, [state.items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}

export type { CartItem, CartProduct };
export { CartProvider, useCart };
