import { FC } from "react";
import Link from "next/link";
import ContactLink from "@/components/brand/ContactLink";
import { focusRing } from "@/lib/utils";
import { products as allProducts, statusSections, type PublicProduct } from "../../utils/data/products-data";
import { landingData } from "../../utils/data/landing-data";

const builtTitle = statusSections.find((s) => s.status === "built")!.title;

// The first three built products, in data order (spec 0016, AC-5).
export const teaserProducts = (products: readonly PublicProduct[]) =>
  products.filter((p) => p.status === "built").slice(0, 3);

const ProductsTeaser: FC<{ products?: readonly PublicProduct[] }> = ({ products = allProducts }) => {
  const { label, heading, intro, linkLabel } = landingData.ecosystem;
  const items = teaserProducts(products);

  return (
    <section id="ecosystem" aria-labelledby="ecosystem-heading" className="section scroll-mt-20">
      <div className="container">
        <p className="brand-label text-muted-foreground">{label}</p>
        <h2 id="ecosystem-heading" className="brand-heading mt-2 text-4xl md:text-6xl">
          {heading}
        </h2>
        <p className="mt-6 max-w-3xl text-lg text-muted-foreground">{intro}</p>
        {items.length > 0 && (
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {items.map((product) => (
              <li key={product.id} className="rounded-2xl bg-card p-8 text-card-foreground">
                <p className="brand-label text-signal">{builtTitle}</p>
                <h3 className="brand-heading mt-3 text-2xl">{product.name}</h3>
                <p className="mt-4 text-muted-foreground">{product.summary}</p>
              </li>
            ))}
          </ul>
        )}
        {/* Contact first, the page's main job; then the path to more proof (spec 0018, AC-2). */}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <ContactLink location="ecosystem" variant="text" />
          <Link href="/products" className={`rounded-sm underline underline-offset-4 hover:text-signal ${focusRing}`}>
            {linkLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProductsTeaser;
