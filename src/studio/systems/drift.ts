import type { ProductLink, PublicProduct } from "./bundled";
import type { PublicProjection } from "./projection";

// The drift banner's comparison (spec 0008, AC-9). Pure: both sides are reduced to one shape and compared exactly,
// with no trimming. The database side arrives already in export order; the bundled side is in file order.

type Shape = {
  systems: { id: string; name: string; status: string; summary: string; standalone: boolean }[];
  links: { from: string; to: string; label: string; state: string }[];
};

const SECTION_TITLES: Record<string, string> = {
  built: "Built",
  "in-progress": "In progress",
  next: "Up next",
  planned: "Planned",
};

function fromBundled(products: readonly PublicProduct[], links: readonly ProductLink[]): Shape {
  const ids = new Set(products.map((product) => product.id as string));
  return {
    systems: products.map((product) => ({
      id: product.id,
      name: product.name,
      status: product.status,
      summary: product.summary,
      standalone: product.standalone === true,
    })),
    links: links.filter((link) => ids.has(link.from) && ids.has(link.to)),
  };
}

const linkKey = (link: { from: string; to: string }) => `${link.from}→${link.to}`;

// One line per difference, in a stable order: systems, then links, then section order.
export function diffPublic(
  database: PublicProjection,
  bundled: { products: readonly PublicProduct[]; productLinks: readonly ProductLink[] },
): string[] {
  const db: Shape = {
    systems: database.systems.map(({ id, name, status, summary, standalone }) => ({ id, name, status, summary, standalone })),
    links: database.links,
  };
  const file = fromBundled(bundled.products, bundled.productLinks);
  const differences: string[] = [];

  const fileSystems = new Map(file.systems.map((system) => [system.id, system]));
  const dbSystems = new Map(db.systems.map((system) => [system.id, system]));

  for (const system of db.systems) {
    const published = fileSystems.get(system.id);
    if (!published) {
      differences.push(`${system.name} (${system.id}) is not on the public page yet`);
      continue;
    }
    if (system.name !== published.name) {
      differences.push(`${system.id}: name changed from "${published.name}" to "${system.name}"`);
    }
    if (system.status !== published.status) {
      differences.push(`${system.name}: status changed from ${published.status} to ${system.status}`);
    }
    if (system.summary !== published.summary) {
      differences.push(`${system.name}: public summary changed`);
    }
    if (system.standalone !== published.standalone) {
      differences.push(`${system.name}: standalone changed to ${system.standalone ? "yes" : "no"}`);
    }
  }
  for (const system of file.systems) {
    if (!dbSystems.has(system.id)) {
      differences.push(`${system.name} (${system.id}) would be removed from the public page`);
    }
  }

  const fileLinks = new Map(file.links.map((link) => [linkKey(link), link]));
  const dbLinks = new Map(db.links.map((link) => [linkKey(link), link]));
  for (const link of db.links) {
    const published = fileLinks.get(linkKey(link));
    if (!published) {
      differences.push(`Link ${link.from} → ${link.to} is not on the public page yet`);
    } else if (published.label !== link.label || published.state !== link.state) {
      differences.push(`Link ${link.from} → ${link.to}: label or state changed`);
    }
  }
  for (const link of file.links) {
    if (!dbLinks.has(linkKey(link))) {
      differences.push(`Link ${link.from} → ${link.to} would be removed from the public page`);
    }
  }

  // Order inside each status section, over the ids that sit in that section on both sides.
  for (const status of Object.keys(SECTION_TITLES)) {
    const inBoth = (id: string) => dbSystems.get(id)?.status === status && fileSystems.get(id)?.status === status;
    const dbOrder = db.systems.filter((system) => inBoth(system.id)).map((system) => system.id);
    const fileOrder = file.systems.filter((system) => inBoth(system.id)).map((system) => system.id);
    if (dbOrder.join("\n") !== fileOrder.join("\n")) {
      differences.push(`Order changed in ${SECTION_TITLES[status]}`);
    }
  }

  return differences;
}
