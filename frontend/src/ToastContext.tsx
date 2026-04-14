import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type ToastType = "success" | "error" | "info";
type Toast = { id: string; message: string; type: ToastType };

type ToastApi = {
  addToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastApi>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t: tCommon } = useTranslation();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timerRef.current.delete(id);
    }, 2800);
    timerRef.current.set(id, timer);
  }, []);

  function dismiss(id: string) {
    const timer = timerRef.current.get(id);
    if (timer) clearTimeout(timer);
    timerRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            <span className="toast__msg">{t.message}</span>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismiss(t.id)}
              aria-label={tCommon("common.close")}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
