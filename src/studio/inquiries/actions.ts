"use server";
import "server-only";
import "@/studio/marker";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStudioAccess } from "@/studio/guard";
import type { ActionState } from "@/studio/clients/action-state";
import {
  changeInquiryStatus,
  convertInquiry,
  validId,
  validVersion,
} from "@/studio/data/inquiries";
import { attemptAlert } from "@/inquiries/alerts";
import { IntakeError } from "@/inquiries/rules";
const str = (data: FormData, key: string) => String(data.get(key) ?? "");
function failure(error: unknown): ActionState {
  return {
    ok: false,
    code: error instanceof IntakeError ? error.code : "UNAVAILABLE",
    message:
      error instanceof IntakeError
        ? ((
            {
              STALE_RECORD: "This record changed. Reload before trying again.",
              ALREADY_CONVERTED: "This inquiry has already been converted.",
              DUPLICATE_CLIENT_NAME: "A live client already has this name.",
              CLIENT_ARCHIVED: "This client is archived.",
              RETRY_COOLDOWN: "Wait one minute before retrying.",
              CONFIRM_DUPLICATE_RISK:
                "Confirm the risk of another alert before retrying.",
            } as Record<string, string>
          )[error.code] ??
          "This change could not be saved. Reload and check the current state.")
        : "This change could not be saved. Try again later.",
  };
}
export async function changeInquiryStatusAction(
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  const session = await requireStudioAccess();
  const id = str(data, "id");
  try {
    await changeInquiryStatus(
      id,
      str(data, "version"),
      str(data, "target"),
      session.ownerId,
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/studio/inquiries");
  redirect(`/studio/inquiries/${id}`);
}
export async function convertInquiryAction(
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  const session = await requireStudioAccess();
  let clientId: string;
  try {
    if (data.get("confirmed") !== "on")
      throw new IntakeError("CONFIRM_REQUIRED");
    clientId = await convertInquiry(
      {
        id: str(data, "id"),
        version: str(data, "version"),
        conversionKey: str(data, "conversionKey"),
        mode: str(data, "mode"),
        clientId: str(data, "clientId"),
        clientName: str(data, "clientName"),
        contactName: str(data, "contactName"),
        contactEmail: str(data, "contactEmail"),
      },
      session.ownerId,
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/studio/inquiries");
  revalidatePath("/studio/clients");
  redirect(`/studio/clients/${clientId}`);
}
export async function retryInquiryAlertAction(
  _prev: ActionState,
  data: FormData,
): Promise<ActionState> {
  const session = await requireStudioAccess();
  const id = str(data, "id");
  try {
    validId(id);
    validVersion(str(data, "alertVersion"));
    await attemptAlert(id, session.workspaceId, undefined, {
      version: str(data, "alertVersion"),
      generation: Number(data.get("generation")),
      confirmDuplicate: data.get("confirmDuplicate") === "on",
      actor: session.ownerId,
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/studio/inquiries/${id}`);
  return { ok: true };
}
