import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchJson } from "../api";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function CustomOrderSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.email ? "" : "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [website, setWebsite] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  function onFilesChange(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const combined = [...files];
    for (const f of incoming) {
      if (combined.length >= MAX_IMAGES) break;
      if (f.size > MAX_IMAGE_BYTES) {
        setError(t("customOrders.form.errorSize"));
        continue;
      }
      if (!/^image\//.test(f.type)) {
        setError(t("customOrders.form.errorType"));
        continue;
      }
      combined.push(f);
    }
    setFiles(combined.slice(0, MAX_IMAGES));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (website.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("email", email);
      fd.set("description", description);
      if (phone.trim()) fd.set("phone", phone.trim());
      if (dimensions.trim()) fd.set("dimensions", dimensions.trim());
      if (website.trim()) fd.set("website", website);
      for (const f of files) fd.append("images", f);

      await fetchJson("/api/custom-orders", {
        method: "POST",
        body: fd,
      });
      setDone(true);
      setName("");
      setPhone("");
      setDescription("");
      setDimensions("");
      setFiles([]);
      addToast(t("customOrders.form.success"), "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("customOrders.form.error");
      setError(msg);
      addToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel panel--accent" id="custom-orders">
      <div className="section-heading">
        <span>{t("customOrders.eyebrow")}</span>
        <h2>{t("customOrders.title")}</h2>
      </div>
      <p style={{ maxWidth: 720, lineHeight: 1.6 }}>{t("customOrders.lead")}</p>

      {!open && !done && (
        <button
          type="button"
          className="button button--primary"
          onClick={() => setOpen(true)}
          style={{ marginTop: 12 }}
        >
          {t("customOrders.openForm")}
        </button>
      )}

      {done && (
        <div className="contact-form contact-form--done" style={{ marginTop: 16 }}>
          <p>{t("customOrders.form.success")}</p>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              setDone(false);
              setOpen(true);
            }}
            style={{ marginTop: 8 }}
          >
            {t("customOrders.openAnother")}
          </button>
        </div>
      )}

      {open && !done && (
        <form className="contact-form" onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <label className="contact-form__field contact-form__hp" aria-hidden="true">
            <span>Website</span>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
          <div className="contact-form__row">
            <label className="contact-form__field">
              <span>{t("customOrders.form.name")}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                disabled={busy}
              />
            </label>
            <label className="contact-form__field">
              <span>{t("customOrders.form.email")}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
              />
            </label>
          </div>
          <label className="contact-form__field">
            <span>{t("customOrders.form.phone")}</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={60}
              disabled={busy}
            />
          </label>
          <label className="contact-form__field">
            <span>{t("customOrders.form.description")}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("customOrders.form.descriptionPlaceholder")}
              required
              minLength={5}
              maxLength={4000}
              rows={5}
              disabled={busy}
            />
          </label>
          <label className="contact-form__field">
            <span>{t("customOrders.form.dimensions")}</span>
            <input
              type="text"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder={t("customOrders.form.dimensionsPlaceholder")}
              maxLength={500}
              disabled={busy}
            />
          </label>
          <div className="contact-form__field">
            <span>
              {t("customOrders.form.images")}{" "}
              <small style={{ color: "#7c5e45", fontWeight: 400 }}>
                {t("customOrders.form.imagesHint", { max: MAX_IMAGES })}
              </small>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              disabled={busy || files.length >= MAX_IMAGES}
              onChange={(e) => onFilesChange(e.target.files)}
            />
            {files.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "0.85rem", color: "#544237" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name} ({(f.size / 1024).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      disabled={busy}
                      style={{ background: "none", border: "none", color: "#8b2020", cursor: "pointer", fontSize: "0.8rem" }}
                    >
                      {t("customOrders.form.removeImage")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <p className="contact-form__error">{error}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" className="button button--primary" disabled={busy}>
              {busy ? "…" : t("customOrders.form.submit")}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              {t("common.close")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default CustomOrderSection;
