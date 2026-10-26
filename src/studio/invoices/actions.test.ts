import { beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_ACTION_STATE } from "@/studio/clients/action-state";
import * as actions from "./actions";
import { GET } from "@/app/(studio)/studio/(signed-in)/invoices/[invoiceId]/pdf/route";

const boundary=vi.hoisted(()=>({deny:new Error("AUTH_REQUIRED"),database:vi.fn()}));
vi.mock("@/studio/guard",()=>({requireStudioAccess:async()=>{throw boundary.deny;}}));
vi.mock("@/studio/db/client",()=>({getDb:boundary.database}));
beforeEach(()=>{boundary.database.mockReset();});

describe("invoice authorization before any data access (AC-13)",()=>{
  it.each([
    ["save profile",actions.saveBillingProfileAction],
    ["create",actions.createInvoiceAction],
    ["edit",actions.updateInvoiceAction],
    ["send",actions.sendInvoiceAction],
    ["change status",actions.changeInvoiceStatusAction],
    ["discard",actions.discardInvoiceAction],
  ] as const)("denies %s before reading posted billing details",async(_name,action)=>{
    const data=new FormData();data.set("notes","FAKE private billing text");
    await expect(action(INITIAL_ACTION_STATE,data)).rejects.toBe(boundary.deny);
    expect(boundary.database).not.toHaveBeenCalled();
  });
  it("denies PDF downloads before lookup or rendering",async()=>{
    await expect(GET(new Request("http://localhost/studio/invoices/fake/pdf"),{params:Promise.resolve({invoiceId:"fake"})})).rejects.toBe(boundary.deny);
    expect(boundary.database).not.toHaveBeenCalled();
  });
});
