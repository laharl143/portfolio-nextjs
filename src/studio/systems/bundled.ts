// The public file built into this deploy (spec 0008, Value sourcing). `@/*` maps only to `src/*`, so studio code
// reaches it through this one relative import. Public data only; the studio may read it, never the reverse.
export { productLinks, products, statusSections } from "../../../utils/data/products-data";
export type { ProductLink, PublicProduct } from "../../../utils/data/products-data";
