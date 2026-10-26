// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import InvoiceForm from "./InvoiceForm";
import BillingProfileForm from "./BillingProfileForm";
import InvoiceStepDialog from "./InvoiceStepDialog";
import type { ActionState } from "@/studio/clients/action-state";

afterEach(cleanup);
const initial = { lines: [{ description: "FAKE first", quantity: "0.33", unitPrice: "100.01" }], paymentTermsDays: "15", billToAddress: "", notes: "" };
const action = async (): Promise<ActionState> => ({ ok: true });

describe("invoice forms (AC-1, AC-2, AC-3, AC-15)", () => {
  it("updates the visible total and permits keyboard reorder and remove", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm action={action} initial={initial} hidden={{ contractId: "fake" }} currency="PHP" submitLabel="Save draft" cancelHref="/studio/invoices" />);
    expect(screen.getByText("Total PHP 33.00")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Add line" }));
    const descriptions = screen.getAllByRole("textbox", { name: "Description" });
    await user.type(descriptions[1], "FAKE second");
    screen.getByRole("button", { name: "Move line 2 up" }).focus();
    await user.keyboard("{Enter}");
    expect(screen.getAllByRole("textbox", { name: "Description" })[0]).toHaveValue("FAKE second");
    await user.click(screen.getByRole("button", { name: "Remove line 1" }));
    expect(screen.getAllByRole("textbox", { name: "Description" })).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("FAKE first");
  });
  it("disables Add line at 50 and reopens it when a line is removed", async () => {
    const user = userEvent.setup();
    render(<InvoiceForm action={action} initial={{ ...initial, lines: Array.from({length:50}, () => initial.lines[0]) }} hidden={{}} currency="PHP" submitLabel="Save" cancelHref="/studio/invoices" />);
    expect(screen.getByRole("button", { name: "Add line" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Remove line 50" }));
    expect(screen.getByRole("button", { name: "Add line" })).toBeEnabled();
  });
  it("links profile field errors and preserves typed values", async () => {
    const user = userEvent.setup();
    render(<BillingProfileForm version="" initial={{ documentTitle: "Invoice", defaultPaymentTermsDays: "15" }} action={async () => ({ ok:false,code:"INVALID_INPUT",message:"Check fields",fieldErrors:{tin:"Use digits and hyphens only."},values:{businessName:"FAKE Studio",tin:"12a"} })} />);
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    await screen.findByText("Use digits and hyphens only.");
    const tin = await screen.findByRole("textbox", { name: /TIN/ });
    expect(tin).toHaveValue("12a");
    expect(tin).toHaveAttribute("aria-invalid", "true");
    expect(tin).toHaveAccessibleDescription(/Use digits and hyphens only/);
    expect(screen.getByRole("textbox", { name: "Business name" })).toHaveValue("FAKE Studio");
  });
});

describe("invoice confirmation dialogs (AC-7, AC-9, AC-15)", () => {
  it("keeps a refused send open and links to the billing profile", async () => {
    const user = userEvent.setup();
    render(<InvoiceStepDialog kind="send" action={async()=>({ok:false,code:"BILLING_PROFILE_MISSING",message:"Complete your billing profile before sending."})} fields={{invoiceId:"fake",version:"v"}} today="2026-10-26" profileHref="/studio/invoices/profile" />);
    await user.click(screen.getByRole("button", { name: "Mark sent" }));
    const dialog=screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Mark sent" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Complete your billing profile");
    expect(within(dialog).getByRole("link", { name: "Open the billing profile" })).toHaveAttribute("href","/studio/invoices/profile");
  });
  it("links void reason errors to the field", async () => {
    const user=userEvent.setup();
    render(<InvoiceStepDialog kind="void" action={async()=>({ok:false,code:"INVALID_INPUT",message:"Check fields",fieldErrors:{note:"Say why this invoice is void."}})} fields={{invoiceId:"fake",from:"sent",to:"void"}} today="2026-10-26" profileHref="/studio/invoices/profile" />);
    await user.click(screen.getByRole("button",{name:"Void invoice"}));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button",{name:"Void invoice"}));
    await screen.findByText("Say why this invoice is void.");
    expect(await screen.findByRole("textbox",{name:"Reason"})).toHaveAccessibleDescription("Say why this invoice is void.");
  });
  it("returns focus on Cancel and submits paid details", async () => {
    const user=userEvent.setup(),submitted=vi.fn(async (_state:ActionState,data:FormData):Promise<ActionState>=>({ok:false,code:"STALE_RECORD",message:String(data.get("paymentReference"))}));
    render(<InvoiceStepDialog kind="paid" action={submitted} fields={{invoiceId:"fake",from:"sent",to:"paid"}} today="2026-10-26" profileHref="/studio/invoices/profile" />);
    const trigger=screen.getByRole("button",{name:"Mark paid"});
    await user.click(trigger);await user.click(screen.getByRole("button",{name:"Cancel"}));expect(trigger).toHaveFocus();
    await user.click(trigger);await user.selectOptions(screen.getByRole("combobox",{name:/Method/}),"gcash");await user.type(screen.getByRole("textbox",{name:/Reference/}),"FAKE receipt");await user.click(within(screen.getByRole("alertdialog")).getByRole("button",{name:"Mark paid"}));
    expect(await screen.findByRole("alert")).toHaveTextContent("FAKE receipt");
    const data=submitted.mock.calls[0][1];expect(data.get("paidOn")).toBe("2026-10-26");expect(data.get("paymentMethod")).toBe("gcash");
  });
});
