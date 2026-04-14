import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCart } from "../cart";
import CartPanel from "./CartPanel";

export default function MobileCartFab() {
  const { t } = useTranslation();
  const cart = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="cart-fab"
        aria-label={t("cart.title")}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5.17 5H21l-1.5 9H7.1L5.17 5zm-.72-2H2v2h1.98l3.53 7.34L6.25 14c-.16.28-.25.61-.25.96C6 16.1 6.9 17 8 17h12v-2H8.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3-5.47A1 1 0 0 0 23 5H5.17l-.72-2z"/>
        </svg>
        {cart.totalCount > 0 && (
          <span className="cart-fab__count">{cart.totalCount}</span>
        )}
      </button>

      {open && (
        <div
          className="mobile-cart-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="mobile-cart-drawer">
            <div className="mobile-cart-drawer__header">
              <span className="mobile-cart-drawer__title">{t("cart.title")}</span>
              <button
                type="button"
                className="mobile-cart-drawer__close"
                aria-label={t("common.close")}
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <CartPanel />
          </div>
        </div>
      )}
    </>
  );
}
