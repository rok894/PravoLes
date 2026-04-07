type Product = {
  title: string;
  description: string;
  image: string;
  alt: string;
};

type Props = {
  products: Product[];
};

import ImageZoom from "./ImageZoom";

function ProductShowcase({ products }: Props) {
  return (
    <section className="panel" id="products">
      <div className="section-heading">
        <span>Izbor izdelkov</span>
        <h2>Leseni kosi iz delavnice PravoLes</h2>
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
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export type { Product };
export default ProductShowcase;
