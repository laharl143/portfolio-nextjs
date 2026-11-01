import { FC } from "react";
import {
  products,
  productLinks,
  statusSections,
  type ProductLink,
  type ProductStatus,
  type PublicProduct,
} from "../../utils/data/products-data";

const statusDot: Record<ProductStatus, string> = {
  built: "bg-green-500",
  "in-progress": "bg-yellow-500",
  next: "bg-signal",
  planned: "bg-muted-foreground",
};

const statusTitle = Object.fromEntries(
  statusSections.map((s) => [s.status, s.title])
) as Record<ProductStatus, string>;

const productName = Object.fromEntries(
  products.map((p) => [p.id, p.name])
) as Record<PublicProduct["id"], string>;

const focusRing =
  "rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className="brand-label inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-muted-foreground md:text-xs">
      <span
        className={`size-2 rounded-full ${statusDot[status]}`}
        aria-hidden="true"
      />
      {statusTitle[status]}
    </span>
  );
}

function LinkStateMarker({ state }: { state: ProductLink["state"] }) {
  return state === "live" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-800 dark:text-green-300">
      Live
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      Planned
    </span>
  );
}

function ConnectionList({
  title,
  links,
  direction,
}: {
  title: string;
  links: ProductLink[];
  direction: "to" | "from";
}) {
  if (links.length === 0) return null;

  return (
    <div>
      <h4 className="brand-label text-muted-foreground md:text-xs">
        {title}
      </h4>
      <ul className="mt-2 space-y-2">
        {links.map((link) => {
          const otherId = link[direction];
          return (
            <li
              key={`${link.from}-${link.to}`}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
            >
              <a
                href={`#product-${otherId}`}
                className={`font-medium underline decoration-dotted underline-offset-4 hover:text-signal ${focusRing}`}
              >
                {productName[otherId]}
              </a>
              <span className="text-muted-foreground">
                {link.label}
              </span>
              <LinkStateMarker state={link.state} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProductCard({ product }: { product: PublicProduct }) {
  const sendsTo = productLinks.filter((l) => l.from === product.id);
  const receivesFrom = productLinks.filter((l) => l.to === product.id);
  const noLinks = sendsTo.length === 0 && receivesFrom.length === 0;

  return (
    <li>
      <article
        id={`product-${product.id}`}
        className="h-full scroll-mt-28 border-t border-dotted border-border py-8 transition-colors duration-500 target:bg-muted md:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="brand-heading text-2xl md:text-3xl text-foreground">
            {product.name}
          </h3>
          <StatusBadge status={product.status} />
        </div>
        <p className="mt-4 max-w-prose text-muted-foreground">
          {product.summary}
        </p>
        <div className="mt-6 space-y-5">
          {noLinks ? (
            <p className="text-sm italic text-muted-foreground">
              {product.standalone
                ? "Standalone, no connections by design"
                : "Connections not mapped yet"}
            </p>
          ) : (
            <>
              <ConnectionList title="Sends to" links={sendsTo} direction="to" />
              <ConnectionList
                title="Receives from"
                links={receivesFrom}
                direction="from"
              />
            </>
          )}
        </div>
      </article>
    </li>
  );
}

const Products: FC = () => {
  return (
    <section className="section" id="products-ecosystem">
      <div className="container">
        <p className="brand-label text-muted-foreground">
          SMB product ecosystem
        </p>
        <h1 className="brand-heading mt-2 text-4xl md:text-7xl lg:text-8xl">Products</h1>
        <p className="mt-6 max-w-3xl text-lg md:text-xl text-muted-foreground">
          A family of connected products for small and medium businesses. Each
          one stands on its own, and they share events so orders, invoices,
          bookings and stock flow between them. Here is what is built, what is
          in progress, and what comes next.
        </p>
        <p className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Connections:</span>
          <LinkStateMarker state="live" />
          <span>running today</span>
          <LinkStateMarker state="planned" />
          <span>designed, not built yet</span>
        </p>

        {statusSections.map(({ status, title }) => {
          const items = products.filter((p) => p.status === status);
          if (items.length === 0) return null;
          const headingId = `status-${status}`;

          return (
            <section
              key={status}
              aria-labelledby={headingId}
              className="mt-16 md:mt-24"
            >
              <h2
                id={headingId}
                className="brand-heading flex items-baseline gap-3 text-3xl md:text-5xl"
              >
                {title}
                <span className="text-base md:text-lg text-muted-foreground">
                  {items.length} {items.length === 1 ? "product" : "products"}
                </span>
              </h2>
              <ul className="mt-6 grid md:grid-cols-2 md:gap-x-8">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
};

export default Products;
