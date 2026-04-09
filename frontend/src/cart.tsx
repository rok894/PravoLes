import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartProduct = {
  title: string;
  description: string;
  image: string;
  alt: string;
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
  add: (product: CartProduct) => void;
  removeOne: (title: string) => void;
  removeAll: (title: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "pravoles_cart_v1";

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
      const title = (product as { title?: unknown }).title;
      const description = (product as { description?: unknown }).description;
      const image = (product as { image?: unknown }).image;
      const alt = (product as { alt?: unknown }).alt;
      if (
        typeof title !== "string" ||
        typeof description !== "string" ||
        typeof image !== "string" ||
        typeof alt !== "string"
      ) {
        continue;
      }
      const qtyNum = typeof qty === "number" ? qty : 1;
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) continue;
      parsedItems.push({
        product: { title, description, image, alt },
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

    function add(product: CartProduct) {
      setState((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.product.title === product.title,
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

    function removeOne(title: string) {
      setState((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.product.title === title,
        );
        if (existingIndex === -1) return prev;
        const existing = prev.items[existingIndex];
        if (existing.qty <= 1) {
          return { items: prev.items.filter((item) => item.product.title !== title) };
        }
        const next = prev.items.slice();
        next[existingIndex] = { product: existing.product, qty: existing.qty - 1 };
        return { items: next };
      });
    }

    function removeAll(title: string) {
      setState((prev) => ({
        items: prev.items.filter((item) => item.product.title !== title),
      }));
    }

    function clear() {
      setState({ items: [] });
    }

    return {
      items: state.items,
      totalCount,
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
