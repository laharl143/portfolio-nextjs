// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ProductsTeaser, { teaserProducts } from "./ProductsTeaser";
import type { PublicProduct } from "../../utils/data/products-data";

afterEach(cleanup);

const product = (id: PublicProduct["id"], status: PublicProduct["status"]): PublicProduct => ({
  id,
  name: `Name ${id}`,
  status,
  summary: `Summary ${id}`,
});

describe("ProductsTeaser (spec 0016, AC-5)", () => {
  it("keeps the first three built products in data order", () => {
    const list = [
      product("crm", "planned"),
      product("oms", "built"),
      product("jlpt", "built"),
      product("ledger", "in-progress"),
      product("vital-stats", "built"),
      product("booking", "built"),
    ];
    expect(teaserProducts(list).map((p) => p.id)).toEqual(["oms", "jlpt", "vital-stats"]);
  });

  it("shows each built product with its name, a Built label, and its summary", () => {
    render(<ProductsTeaser products={[product("oms", "built"), product("crm", "planned")]} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByRole("heading", { level: 3, name: "Name oms" })).toBeInTheDocument();
    expect(within(items[0]).getByText("Built")).toBeInTheDocument();
    expect(within(items[0]).getByText("Summary oms")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See every product" })).toHaveAttribute("href", "/products");
  });

  it("drops the list but keeps the heading, intro, and link when nothing is built", () => {
    const { container } = render(<ProductsTeaser products={[product("crm", "planned")]} />);
    expect(container.querySelector("ul")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Systems already running" })).toBeInTheDocument();
    expect(screen.getByText(/already live for small businesses/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See every product" })).toBeInTheDocument();
  });
});
