import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type ImageZoomProps = {
  src: string;
  alt: string;
  caption?: string;
};

function ImageZoom({ src, alt, caption }: ImageZoomProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="zoom-trigger"
        onClick={() => setOpen(true)}
        aria-label={t("image.zoom", { alt })}
      >
        <img src={src} alt={alt} loading="lazy" />
      </button>

      {open &&
        createPortal(
          <div className="lightbox" role="dialog" aria-modal="true">
            <button
              type="button"
              className="lightbox__backdrop"
              aria-label={t("common.close")}
              onClick={() => setOpen(false)}
            />
            <div className="lightbox__content">
              <img src={src} alt={alt} />
              {caption ? <p className="lightbox__caption">{caption}</p> : null}
              <button
                type="button"
                className="lightbox__close"
                onClick={() => setOpen(false)}
                aria-label={t("image.closeZoom")}
              >
                ✕
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default ImageZoom;
