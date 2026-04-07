import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ImageZoomProps = {
  src: string;
  alt: string;
  caption?: string;
};

function ImageZoom({ src, alt, caption }: ImageZoomProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="zoom-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Povečaj sliko: ${alt}`}
      >
        <img src={src} alt={alt} loading="lazy" />
      </button>

      {open &&
        createPortal(
          <div className="lightbox" role="dialog" aria-modal="true">
            <button
              type="button"
              className="lightbox__backdrop"
              aria-label="Zapri"
              onClick={() => setOpen(false)}
            />
            <div className="lightbox__content">
              <img src={src} alt={alt} />
              {caption ? <p className="lightbox__caption">{caption}</p> : null}
              <button
                type="button"
                className="lightbox__close"
                onClick={() => setOpen(false)}
                aria-label="Zapri prikaz slike"
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
