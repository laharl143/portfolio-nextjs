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
  next: "bg-neon-light-500",
  planned: "bg-stone-400",
};

const statusTitle = Object.fromEntries(
  statusSections.map((s) => [s.status, s.title])
) as Record<ProductStatus, string>;

const productName = Object.fromEntries(
  products.map((p) => [p.id, p.name])
) as Record<PublicProduct["id"], string>;

const focusRing =
  "rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-light-500";

function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-400 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-700 dark:border-stone-600 dark:text-stone-300">
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
    <span className="inline-flex items-center rounded-full border border-dashed border-stone-400 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-600 dark:border-stone-600 dark:text-stone-400">
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
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
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
                className={`font-medium underline decoration-dotted underline-offset-4 hover:text-neon-light-500 ${focusRing}`}
              >
                {productName[otherId]}
              </a>
              <span className="text-stone-600 dark:text-stone-400">
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
  const standalone = sendsTo.length === 0 && receivesFrom.length === 0;

  return (
    <li>
      <article
        id={`product-${product.id}`}
        className="h-full scroll-mt-28 border-t border-dotted border-stone-400 py-8 transition-colors duration-500 target:bg-stone-300 dark:target:bg-stone-800 md:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl md:text-3xl text-gray-900 dark:text-white">
            {product.name}
          </h3>
          <StatusBadge status={product.status} />
        </div>
        <p className="mt-4 max-w-prose text-stone-700 dark:text-stone-300">
          {product.summary}
        </p>
        <div className="mt-6 space-y-5">
          {standalone ? (
            <p className="text-sm italic text-stone-600 dark:text-stone-400">
              Standalone, no connections by design
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
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          SMB product ecosystem
        </p>
        <h1 className="mt-2 text-4xl md:text-7xl lg:text-8xl">Products</h1>
        <p className="mt-6 max-w-3xl text-lg md:text-xl text-stone-700 dark:text-stone-300">
          A family of connected products for small and medium businesses. Each
          one stands on its own, and they share events so orders, invoices,
          bookings and stock flow between them. Here is what is built, what is
          in progress, and what comes next.
        </p>
        <p className="mt-6 flex flex-wrap items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
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
                className="flex items-baseline gap-3 text-3xl md:text-5xl"
              >
                {title}
                <span className="text-base md:text-lg text-stone-500 dark:text-stone-400">
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
