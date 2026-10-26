import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { loadEnvConfig } from "@next/env";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getDb, closeDb } from "@/studio/db/client";
import { runInWorkspace } from "@/studio/data/workspace";
import { saveBillingProfile, getBillingProfile } from "@/studio/data/billing-profiles";
import { takeNumber, peekNextNumber } from "@/studio/data/invoice-numbers";
import { archiveContract } from "@/studio/data/contracts";
import { archiveClient } from "@/studio/data/clients";
import * as invoices from "@/studio/data/invoices";
import * as dates from "@/studio/format";
import type { InvoicePdfInput } from "./pdf/render";
import { PdfRenderFailed } from "@/studio/data/errors";
import { GET } from "@/app/(studio)/studio/(signed-in)/invoices/[invoiceId]/pdf/route";

// Real database transactions; only Blob and the PDF engine are replaced. Invoice rows and their append only
// history deliberately stay in isolated FAKE workspaces. Never disable triggers or delete immutable fixtures.
const external = vi.hoisted(() => ({ files: new Map<string,Buffer>(), deleted: [] as string[], failStore:false, failRender:false, afterPut:null as null|(()=>Promise<void>), rendered:[] as InvoicePdfInput[] }));
vi.mock("@/studio/storage/blob",()=>({
  putPrivatePdf:async(path:string,bytes:Buffer)=>{if(external.failStore)throw Error("FAKE store unavailable");external.files.set(path,bytes);await external.afterPut?.();},
  deletePrivateFile:async(path:string)=>{external.deleted.push(path);external.files.delete(path);},
  getPrivateFile:async(path:string)=>{const bytes=external.files.get(path);return bytes?new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}}):null;},
}));
vi.mock("./pdf/render",()=>({renderInvoicePdf:async(input:InvoicePdfInput,opts:{draft:boolean})=>{if(external.failRender)throw new PdfRenderFailed();external.rendered.push(input);return Buffer.from(JSON.stringify({input,draft:opts.draft}));}}));
vi.mock("@/studio/guard",()=>({requireStudioAccess:async()=>({})}));

let workspace:string,client:string,contract:string;
const scoped=<T,>(fn:()=>Promise<T>)=>runInWorkspace(workspace,fn);
const exec=(query:ReturnType<typeof sql>)=>getDb().execute(query);
const profile={businessName:"FAKE Billing",address:"FAKE Manila",paymentInstructions:"FAKE transfer",documentTitle:"Invoice",defaultPaymentTermsDays:"15"};
const form={lineDescription:["FAKE ₱ ñ service"],lineQuantity:["0.33"],lineUnitPrice:["100.01"],paymentTermsDays:"15",billToAddress:"FAKE address",notes:"FAKE note"};
const step={note:null,paidOn:null,paymentMethod:null,paymentReference:null};
const create=async()=>{const row=await invoices.createInvoice(contract,form);return invoices.getInvoiceView(row.id);};
const sent=async()=>{const view=await create();await invoices.sendInvoice(view.invoice.id,view.version);return invoices.getInvoiceView(view.invoice.id);};

beforeAll(()=>{
  if(process.env.VERCEL||process.env.VERCEL_ENV)throw Error("Local development database only");
  loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  if(!process.env.DATABASE_URL||!process.env.DATABASE_URL_UNPOOLED)throw Error("Development database configuration required");
});
beforeEach(async()=>{
  external.files.clear();external.deleted=[];external.failStore=false;external.failRender=false;external.afterPut=null;external.rendered=[];
  vi.spyOn(dates,"studioToday").mockReturnValue("2030-12-31");
  workspace=randomUUID();client=randomUUID();contract=randomUUID();
  await exec(sql`insert into studio.workspaces(id,name,slug) values(${workspace}::uuid,'FAKE invoice tests',${'fake-invoice-test-'+workspace})`);
  await exec(sql`insert into studio.clients(id,workspace_id,name,status) values(${client}::uuid,${workspace}::uuid,'FAKE Invoice Client','active')`);
  await exec(sql`insert into studio.contracts(id,workspace_id,client_id,title,status,amount_minor) values(${contract}::uuid,${workspace}::uuid,${client}::uuid,'FAKE Invoice Contract','active',15000000)`);
  await scoped(()=>saveBillingProfile("",profile));
});
afterAll(closeDb);

describe("invoice data contract on the development database",()=>{
  it("AC-1: creates one profile, refuses stale versions, and supplies only new invoice defaults",()=>scoped(async()=>{
    const first=await getBillingProfile();expect(first).not.toBeNull();
    await expect(saveBillingProfile("",profile)).rejects.toMatchObject({code:"STALE_RECORD"});
    const draft=await create();await saveBillingProfile(first!.version,{...profile,defaultPaymentTermsDays:"30"});
    await expect(saveBillingProfile(first!.version,profile)).rejects.toMatchObject({code:"STALE_RECORD"});
    expect((await invoices.getNewInvoiceDefaults(contract)).initial.paymentTermsDays).toBe("30");
    expect((await invoices.getInvoiceView(draft.invoice.id)).invoice.paymentTermsDays).toBe(15);
  }));
  it("AC-2 AC-3 AC-4: creates ordered lines, rounded totals and exactly one opening event",()=>scoped(async()=>{
    const draft=await create();expect(draft.totalMinor).toBe(BigInt(3300));expect(draft.invoice.status).toBe("draft");expect(draft.invoice.issuedOn).toBeNull();expect(draft.events).toHaveLength(1);expect(draft.events[0]).toMatchObject({fromStatus:null,toStatus:"draft"});expect(draft.lines[0].description).toContain("₱ ñ");
    expect((await invoices.getNewInvoiceDefaults(contract)).initial).toMatchObject({billToAddress:"FAKE address",lines:[{description:"FAKE Invoice Contract",quantity:"1",unitPrice:"150000.00"}]});
    await expect(exec(sql`update studio.invoice_lines set amount_minor=1 where invoice_id=${draft.invoice.id}::uuid`)).rejects.toMatchObject({cause:{code:"23514"}});
  }));
  it("AC-2 AC-12: refuses creation on noninvoiceable or archived parents",()=>scoped(async()=>{
    for(const status of ["draft","sent","signed","cancelled"]){await exec(sql`update studio.contracts set status=${status} where id=${contract}::uuid`);await expect(create()).rejects.toMatchObject({code:"CONTRACT_NOT_INVOICEABLE"});}
    await exec(sql`update studio.contracts set status='ended',archived_at=now() where id=${contract}::uuid`);await expect(create()).rejects.toMatchObject({code:"CONTRACT_NOT_INVOICEABLE"});
    await exec(sql`update studio.contracts set archived_at=null where id=${contract}::uuid`);await exec(sql`update studio.clients set archived_at=now() where id=${client}::uuid`);await expect(create()).rejects.toMatchObject({code:"CLIENT_ARCHIVED"});
  }));
  it("AC-5 AC-7: edits a draft and refuses a send from its old version without taking a number",()=>scoped(async()=>{
    const draft=await create();await invoices.updateInvoice(draft.invoice.id,draft.version,{...form,lineUnitPrice:["200"]});
    await expect(invoices.sendInvoice(draft.invoice.id,draft.version)).rejects.toMatchObject({code:"STALE_RECORD"});
    expect(await peekNextNumber(getDb(),workspace,2030)).toBe(1);expect((await invoices.getInvoiceView(draft.invoice.id)).totalMinor).toBe(BigInt(6600));expect(external.files.size).toBe(0);
  }));
  it("AC-6 AC-7: renders draft values without storing and freezes the numbered send",()=>scoped(async()=>{
    const draft=await create();await invoices.renderDraftInvoicePdf(draft);expect(external.files.size).toBe(0);expect(external.rendered[0]).toMatchObject({number:null,total:"PHP 33.00"});
    await invoices.sendInvoice(draft.invoice.id,draft.version);const view=await invoices.getInvoiceView(draft.invoice.id);expect(view.invoice).toMatchObject({number:"INV-2030-0001",issuedOn:"2030-12-31",dueOn:"2031-01-15"});expect(view.file?.sha256).toMatch(/^[a-f0-9]{64}$/);expect(view.events).toHaveLength(2);expect(external.files.size).toBe(1);
    await expect(invoices.updateInvoice(view.invoice.id,view.version,form)).rejects.toMatchObject({code:"INVOICE_NOT_EDITABLE"});
    await expect(exec(sql`update studio.invoices set notes='FAKE forbidden' where id=${view.invoice.id}::uuid`)).rejects.toMatchObject({cause:{code:"23001"}});
    await expect(exec(sql`update studio.invoice_lines set description='FAKE forbidden' where invoice_id=${view.invoice.id}::uuid`)).rejects.toMatchObject({cause:{code:"23001"}});
  }));
  it("AC-7: refuses missing profile, empty lines and zero totals without side effects",()=>scoped(async()=>{
    const zero=await invoices.createInvoice(contract,{...form,lineUnitPrice:["0"]});const zeroView=await invoices.getInvoiceView(zero.id);await expect(invoices.sendInvoice(zero.id,zeroView.version)).rejects.toMatchObject({code:"INVOICE_TOTAL_ZERO"});
    const empty=await create();await exec(sql`delete from studio.invoice_lines where invoice_id=${empty.invoice.id}::uuid`);await expect(invoices.sendInvoice(empty.invoice.id,empty.version)).rejects.toMatchObject({code:"INVOICE_EMPTY"});
    const draft=await create();await exec(sql`delete from studio.billing_profiles where workspace_id=${workspace}::uuid`);await expect(invoices.sendInvoice(draft.invoice.id,draft.version)).rejects.toMatchObject({code:"BILLING_PROFILE_MISSING"});expect(external.files.size).toBe(0);expect(await peekNextNumber(getDb(),workspace,2030)).toBe(1);
  }));
  it("AC-7: store and render failures keep the draft, counter and history unchanged",()=>scoped(async()=>{
    const draft=await create();external.failStore=true;await expect(invoices.sendInvoice(draft.invoice.id,draft.version)).rejects.toMatchObject({code:"FILE_STORE_FAILED"});external.failStore=false;external.failRender=true;await expect(invoices.sendInvoice(draft.invoice.id,draft.version)).rejects.toMatchObject({code:"PDF_RENDER_FAILED"});
    const after=await invoices.getInvoiceView(draft.invoice.id);expect(after.invoice.status).toBe("draft");expect(after.file).toBeNull();expect(after.events).toHaveLength(1);expect(await peekNextNumber(getDb(),workspace,2030)).toBe(1);
  }));
  it("AC-7: changed printed data after upload refuses commit and removes the orphan",()=>scoped(async()=>{
    const draft=await create();external.afterPut=async()=>{await exec(sql`update studio.clients set name='FAKE changed',updated_at=clock_timestamp() where id=${client}::uuid`);};
    await expect(invoices.sendInvoice(draft.invoice.id,draft.version)).rejects.toMatchObject({code:"STALE_RECORD"});expect(external.deleted).toHaveLength(1);expect(external.files.size).toBe(0);expect((await invoices.getInvoiceView(draft.invoice.id)).file).toBeNull();expect(await peekNextNumber(getDb(),workspace,2030)).toBe(1);
  }));
  it("AC-8: simultaneous reservations retry once and remain consecutive after void and discard",()=>scoped(async()=>{
    const a=await create(),b=await create();let arrivals=0,release=()=>{};const barrier=new Promise<void>(resolve=>{release=resolve;});external.afterPut=async()=>{arrivals++;if(arrivals===2)release();if(arrivals<=2)await barrier;};
    const results=await Promise.all([invoices.sendInvoice(a.invoice.id,a.version),invoices.sendInvoice(b.invoice.id,b.version)]);external.afterPut=null;
    expect(results.map(x=>x.number).sort()).toEqual(["INV-2030-0001","INV-2030-0002"]);expect(arrivals).toBe(3);expect(external.deleted).toHaveLength(1);
    const second=results.find(x=>x.number==="INV-2030-0002")!;await invoices.changeInvoiceStatus({invoiceId:second.id,from:"sent",to:"void",values:{...step,note:"FAKE void"}});const discard=await create();await invoices.discardInvoice(discard.invoice.id);expect((await sent()).invoice.number).toBe("INV-2030-0003");
  }));
  it("AC-8: rolled back counter allocation leaves no gap and a new year starts at one",()=>scoped(async()=>{
    await expect(getDb().transaction(async tx=>{await takeNumber(tx,workspace,2030);throw Error("FAKE rollback");})).rejects.toThrow("FAKE rollback");expect(await peekNextNumber(getDb(),workspace,2030)).toBe(1);
    await getDb().transaction(async tx=>{expect(await takeNumber(tx,workspace,2030)).toBe(1);expect(await takeNumber(tx,workspace,2031)).toBe(1);});
  }));
  it("AC-9: validates dates, records each step once, rejects stale dialogs and clears undo details",()=>scoped(async()=>{
    const view=await sent(),id=view.invoice.id;
    for(const paidOn of ["2030-12-30","2031-01-01"]){await expect(invoices.changeInvoiceStatus({invoiceId:id,from:"sent",to:"paid",values:{...step,paidOn}})).rejects.toMatchObject({code:"INVALID_INPUT"});}
    await invoices.changeInvoiceStatus({invoiceId:id,from:"sent",to:"paid",values:{...step,paidOn:"2030-12-31",paymentMethod:"gcash",paymentReference:"FAKE receipt"}});
    await expect(invoices.changeInvoiceStatus({invoiceId:id,from:"sent",to:"void",values:{...step,note:"FAKE stale"}})).rejects.toMatchObject({code:"INVOICE_STATUS_CONFLICT"});expect((await invoices.getInvoiceView(id)).events).toHaveLength(3);
    await invoices.changeInvoiceStatus({invoiceId:id,from:"paid",to:"sent",values:step});expect((await invoices.getInvoiceView(id)).invoice).toMatchObject({paidOn:null,paymentMethod:null,paymentReference:null});
    await invoices.changeInvoiceStatus({invoiceId:id,from:"sent",to:"void",values:{...step,note:"FAKE void"}});const done=await invoices.getInvoiceView(id);expect(done.invoice.number).toBe(view.invoice.number);expect(done.file).toEqual(view.file);expect(done.events).toHaveLength(5);
  }));
  it("AC-10: discarded drafts appear only in the archived list and reject writes",()=>scoped(async()=>{
    const draft=await create();await invoices.discardInvoice(draft.invoice.id);expect((await invoices.listInvoices({status:null,archived:false,page:1})).rows).toHaveLength(0);expect((await invoices.listInvoices({status:null,archived:true,page:1})).rows[0].id).toBe(draft.invoice.id);await expect(invoices.updateInvoice(draft.invoice.id,draft.version,form)).rejects.toMatchObject({code:"INVOICE_ARCHIVED"});const current=await sent();await expect(invoices.discardInvoice(current.invoice.id)).rejects.toMatchObject({code:"INVOICE_NOT_DISCARDABLE"});
  }));
  it("AC-4 AC-11: today is not overdue, sent includes overdue, totals exclude void and pages have 25 rows",()=>scoped(async()=>{
    const first=await sent();vi.spyOn(dates,"studioToday").mockReturnValue("2031-01-15");expect((await invoices.getInvoiceView(first.invoice.id)).overdue).toBe(false);vi.spyOn(dates,"studioToday").mockReturnValue("2031-01-16");expect((await invoices.listInvoices({status:"overdue",archived:false,page:1})).rows[0].id).toBe(first.invoice.id);expect((await invoices.listInvoices({status:"sent",archived:false,page:1})).rows).toHaveLength(1);
    const second=await sent();await invoices.changeInvoiceStatus({invoiceId:second.invoice.id,from:"sent",to:"void",values:{...step,note:"FAKE excluded"}});expect((await invoices.listContractInvoices(contract)).billedMinor).toBe(BigInt(3300));
    for(let i=0;i<26;i++)await exec(sql`insert into studio.invoices(workspace_id,client_id,contract_id,payment_terms_days,currency,updated_at) values(${workspace}::uuid,${client}::uuid,${contract}::uuid,15,'PHP',now()+${i}*interval '1 second')`);
    const all=await invoices.listInvoices({status:null,archived:false,page:1}),page2=await invoices.listInvoices({status:null,archived:false,page:2});expect(all.rows).toHaveLength(25);expect(page2.rows).toHaveLength(3);expect(new Set([...all.rows,...page2.rows].map(x=>x.id)).size).toBe(28);
  }));
  it("AC-12: sent invoices prevent parent archive, while archived parents refuse writes",()=>scoped(async()=>{
    const view=await sent();await exec(sql`update studio.contracts set status='ended' where id=${contract}::uuid`);await expect(archiveContract(contract)).rejects.toMatchObject({code:"CONTRACT_HAS_OPEN_INVOICES"});await expect(archiveClient(client)).rejects.toMatchObject({code:"CLIENT_HAS_OPEN_INVOICES"});
    await exec(sql`update studio.clients set archived_at=now() where id=${client}::uuid`);await expect(invoices.changeInvoiceStatus({invoiceId:view.invoice.id,from:"sent",to:"void",values:{...step,note:"FAKE"}})).rejects.toMatchObject({code:"CLIENT_ARCHIVED"});
    await exec(sql`update studio.clients set archived_at=null where id=${client}::uuid`);await exec(sql`update studio.contracts set archived_at=now() where id=${contract}::uuid`);await expect(invoices.changeInvoiceStatus({invoiceId:view.invoice.id,from:"sent",to:"void",values:{...step,note:"FAKE"}})).rejects.toMatchObject({code:"CONTRACT_ARCHIVED"});
  }));
  it("AC-13: foreign workspaces cannot read or mutate an invoice",()=>scoped(async()=>{
    const draft=await create();await runInWorkspace(randomUUID(),async()=>{await expect(invoices.getInvoiceView(draft.invoice.id)).rejects.toMatchObject({code:"INVOICE_NOT_FOUND"});await expect(invoices.updateInvoice(draft.invoice.id,draft.version,form)).rejects.toMatchObject({code:"INVOICE_NOT_FOUND"});});expect((await invoices.getInvoiceView(draft.invoice.id)).version).toBe(draft.version);
  }));
  it("AC-6 AC-13: PDF responses are private and frozen bytes never fall back to rendering",()=>scoped(async()=>{
    const view=await sent(),id=view.invoice.id,request=new Request(`http://localhost/studio/invoices/${id}/pdf`),params={params:Promise.resolve({invoiceId:id})};
    const a=await GET(request,params),b=await GET(request,params);
    expect(a.status).toBe(200);expect(a.headers.get("cache-control")).toBe("private, no-store");expect(a.headers.get("x-content-type-options")).toBe("nosniff");expect(a.headers.get("content-disposition")).toContain('inline; filename="INV-2030-0001.pdf"');expect(await a.text()).toBe(await b.text());
    const renders=external.rendered.length;external.files.clear();const log=vi.spyOn(console,"error").mockImplementation(()=>{});
    await expect(GET(request,params)).rejects.toMatchObject({digest:"NEXT_HTTP_ERROR_FALLBACK;404"});expect(external.rendered).toHaveLength(renders);expect(log).toHaveBeenCalledWith("[studio] invoice pdf route","FILE_MISSING");
  }));
  it("AC-14: seed reruns create no extra profiles or invoices",async()=>{
    const run=()=>promisify(execFile)(process.execPath,["node_modules/tsx/dist/cli.mjs","--conditions=react-server","scripts/seed-studio.ts"],{cwd:process.cwd(),timeout:120000});await run();const {stdout}=await run();expect(stdout).toContain("billing profiles: 0 created");expect(stdout).toContain("invoices: 0 created");
  },300000);
});
