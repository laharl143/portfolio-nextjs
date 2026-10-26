// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import InvoicesError from "./error";
import ListLoading from "./_components/ListLoading";
import { reloadPage } from "../../_components/reload-page";

vi.mock("../../_components/reload-page",()=>({reloadPage:vi.fn()}));
afterEach(cleanup);

describe("invoice recovery states (AC-13, AC-15)",()=>{
  it("announces loading while the invoice list is busy",()=>{
    render(<ListLoading/>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading invoices");
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy","true");
  });
  it("offers a keyboard reachable document reload and a safe list link",async()=>{
    const user=userEvent.setup();render(<InvoicesError/>);
    expect(screen.getByRole("alert")).toHaveTextContent("This page could not be loaded. Try again in a moment.");
    expect(screen.getByRole("link",{name:"Back to invoices"})).toHaveAttribute("href","/studio/invoices");
    await user.tab();expect(screen.getByRole("button",{name:"Try again"})).toHaveFocus();await user.keyboard("{Enter}");expect(reloadPage).toHaveBeenCalledOnce();
  });
});
