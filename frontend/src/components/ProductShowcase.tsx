import { useTranslation } from "react-i18next";
import ImageZoom from "./ImageZoom";
import { useCart } from "../cart";

type Product = {
  title: string;
  description: string;
  image: string;
  alt: string;
};

type Props = {
  products: Product[];
};

function ProductShowcase({ products }: Props) {
  const { t } = useTranslation();
  const cart = useCart();

  return (
    <section className="panel" id="products">
      <div className="section-heading">
        <span>{t("productsSection.eyebrow")}</span>
        <h2>{t("productsSection.title")}</h2>
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <article className="product-card" key={product.title}>
            <div className="product-card__image">
              <ImageZoom
                src={product.image}
                alt={product.alt}
                caption={product.title}
              />
            </div>
            <div className="product-card__body">
              <h3>{product.title}</h3>
              <p>{product.description}</p>
              <div className="product-card__actions">
                <button
                  type="button"
                  className="button button--primary button--small"
                  onClick={() => cart.add(product)}
                >
                  {t("cart.add")}
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
export default ProductShowcase;
