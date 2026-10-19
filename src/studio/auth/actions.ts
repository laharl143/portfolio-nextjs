"use server";

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL, isoUint8Array } from "@simplewebauthn/server/helpers";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "@/studio/marker";
import { getDb, type Tx } from "@/studio/db/client";
import { owners, passkeys, sessions } from "@/studio/db/schema";
import { requireStudioAccess, requireStudioEnabled } from "@/studio/guard";
import { consumeChallenge, saveChallenge } from "./challenge";
import { STUDIO_OWNER_ID, STUDIO_RP_NAME, getRpConfig, getSetupToken } from "./config";
import { deviceLabel } from "./device-label";
import { isSetupLocked, purgeOldEvents, recordEvent } from "./events";
import { countPasskeys } from "./passkeys";
import { safeNext } from "./safe-next";
import {
  clearSessionCookie,
  deleteExpiredSessions,
  hashSessionToken,
  insertSession,
  newSessionToken,
  readSessionToken,
  setSessionCookie,
} from "./session";

// Expected errors come back as codes; the client maps them to the Messages table in spec 0005.
export type AuthErrorCode =
  | "UNKNOWN_PASSKEY"
  | "VERIFICATION_FAILED"
  | "CHALLENGE_EXPIRED"
  | "SETUP_CLOSED"
  | "INVALID_TOKEN"
  | "SETUP_LOCKED"
  | "ALREADY_REGISTERED";

type Failure = { ok: false; code: AuthErrorCode };

async function currentDeviceLabel(): Promise<string> {
  return deviceLabel((await headers()).get("user-agent"));
}

// The WebAuthn user handle: the bytes of STUDIO_OWNER_ID.
function ownerUserId() {
  return isoUint8Array.fromUTF8String(STUDIO_OWNER_ID);
}

async function loadOwner() {
  const [owner] = await getDb()
    .select({ id: owners.id, displayName: owners.displayName })
    .from(owners)
    .where(eq(owners.id, STUDIO_OWNER_ID))
    .limit(1);
  if (!owner) {
    throw new Error("the studio owner row is missing; run the migrations");
  }
  return owner;
}

function registrationOptions(
  owner: { displayName: string },
  excludeCredentials: { id: string; transports?: string[] }[],
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpName: STUDIO_RP_NAME,
    rpID: getRpConfig().rpID,
    userID: ownerUserId(),
    userName: owner.displayName,
    userDisplayName: owner.displayName,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
}

// Verifies a registration against the consumed challenge. Null on any failure, never throws.
async function verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
  const { rpID, origin } = getRpConfig();
  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    return verification.verified ? verification.registrationInfo : null;
  } catch {
    return null;
  }
}

type RegistrationInfo = NonNullable<Awaited<ReturnType<typeof verifyRegistration>>>;

function passkeyRow(info: RegistrationInfo, nickname: string) {
  return {
    id: info.credential.id,
    ownerId: STUDIO_OWNER_ID,
    publicKey: isoBase64URL.fromBuffer(info.credential.publicKey),
    counter: info.credential.counter,
    transports: info.credential.transports ?? null,
    deviceType: info.credentialDeviceType,
    backedUp: info.credentialBackedUp,
    nickname,
  };
}

async function createSignedInSession(tx: Tx, ownerId: string, token: string, label: string, previousToken: string | null) {
  // A fresh token every sign in; the browser's previous session row (if any) goes away.
  if (previousToken) {
    await tx.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(previousToken)));
  }
  await insertSession(tx, ownerId, token, label);
}

// Housekeeping after a successful sign in; a failure here never undoes the sign in.
async function tidyUp(): Promise<void> {
  try {
    await Promise.all([purgeOldEvents(), deleteExpiredSessions()]);
  } catch {
    // Ignored: the next sign in tries again.
  }
}

// ---- Sign in (AC-5, AC-6) ----

export async function startSignIn(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  await requireStudioEnabled();
  const options = await generateAuthenticationOptions({
    rpID: getRpConfig().rpID,
    userVerification: "preferred",
  });
  await saveChallenge("authenticate", null, options.challenge);
  return options;
}

export async function finishSignIn(response: AuthenticationResponseJSON, next?: string): Promise<Failure> {
  await requireStudioEnabled();
  const label = await currentDeviceLabel();

  const expectedChallenge = await consumeChallenge("authenticate");
  if (!expectedChallenge) {
    await recordEvent("sign_in_failed", { deviceLabel: label });
    return { ok: false, code: "CHALLENGE_EXPIRED" };
  }

  const credentialId = typeof response?.id === "string" ? response.id : "";
  const [passkey] = credentialId
    ? await getDb().select().from(passkeys).where(eq(passkeys.id, credentialId)).limit(1)
    : [];
  if (!passkey) {
    await recordEvent("sign_in_failed", { deviceLabel: label });
    return { ok: false, code: "UNKNOWN_PASSKEY" };
  }

  const userHandle = response.response?.userHandle;
  const handleMatches = !userHandle || safeToUtf8(userHandle) === passkey.ownerId;

  const { rpID, origin } = getRpConfig();
  let verified = false;
  let newCounter = passkey.counter;
  if (handleMatches) {
    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.id,
          publicKey: isoBase64URL.toBuffer(passkey.publicKey),
          counter: passkey.counter,
          transports: passkey.transports ?? undefined,
        },
        requireUserVerification: false,
      });
      verified = verification.verified;
      newCounter = verification.authenticationInfo.newCounter;
    } catch {
      verified = false;
    }
  }
  if (!verified) {
    await recordEvent("sign_in_failed", { ownerId: passkey.ownerId, passkeyId: passkey.id, deviceLabel: label });
    return { ok: false, code: "VERIFICATION_FAILED" };
  }

  const token = newSessionToken();
  const previousToken = await readSessionToken();
  await getDb().transaction(async (tx) => {
    await tx
      .update(passkeys)
      .set({ counter: newCounter, lastUsedAt: sql`now()` })
      .where(eq(passkeys.id, passkey.id));
    await createSignedInSession(tx, passkey.ownerId, token, label, previousToken);
  });
  await setSessionCookie(token);
  await recordEvent("sign_in", { ownerId: passkey.ownerId, passkeyId: passkey.id, deviceLabel: label });
  await tidyUp();

  // Outside any try/catch: redirect() works by throwing.
  redirect(safeNext(next));
}

function safeToUtf8(base64url: string): string | null {
  try {
    return isoBase64URL.toUTF8String(base64url);
  } catch {
    return null;
  }
}

// ---- Setup and recovery (AC-4) ----

function tokenMatches(typed: string, expected: string): boolean {
  const a = createHash("sha256").update(typed).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// Check order (spec 0005): flag, token configured, lock, compare, then record a rejection.
async function checkSetupToken(typed: unknown, label: string): Promise<Failure | null> {
  await requireStudioEnabled();
  const expected = getSetupToken();
  if (!expected) {
    return { ok: false, code: "SETUP_CLOSED" };
  }
  if (await isSetupLocked()) {
    return { ok: false, code: "SETUP_LOCKED" };
  }
  if (typeof typed !== "string" || !tokenMatches(typed, expected)) {
    await recordEvent("setup_rejected", { deviceLabel: label });
    return { ok: false, code: "INVALID_TOKEN" };
  }
  return null;
}

export async function startSetup(
  token: string,
): Promise<{ ok: true; options: PublicKeyCredentialCreationOptionsJSON } | Failure> {
  const label = await currentDeviceLabel();
  const failure = await checkSetupToken(token, label);
  if (failure) {
    return failure;
  }
  const owner = await loadOwner();
  // Empty excludeCredentials: recovery may enroll again on a device you still have.
  const options = await registrationOptions(owner, []);
  await saveChallenge("register", owner.id, options.challenge);
  return { ok: true, options };
}

export async function finishSetup(token: string, response: RegistrationResponseJSON): Promise<Failure> {
  const label = await currentDeviceLabel();
  const failure = await checkSetupToken(token, label);
  if (failure) {
    return failure;
  }
  const expectedChallenge = await consumeChallenge("register");
  if (!expectedChallenge) {
    return { ok: false, code: "CHALLENGE_EXPIRED" };
  }
  const info = await verifyRegistration(response, expectedChallenge);
  if (!info) {
    return { ok: false, code: "VERIFICATION_FAILED" };
  }

  // Only now, after verification: replace every passkey and end every session in one transaction.
  const sessionToken = newSessionToken();
  await getDb().transaction(async (tx) => {
    await tx.delete(passkeys).where(eq(passkeys.ownerId, STUDIO_OWNER_ID));
    await tx.delete(sessions).where(eq(sessions.ownerId, STUDIO_OWNER_ID));
    await tx.insert(passkeys).values(passkeyRow(info, label));
    await insertSession(tx, STUDIO_OWNER_ID, sessionToken, label);
  });
  await setSessionCookie(sessionToken);
  await recordEvent("setup_used", { ownerId: STUDIO_OWNER_ID, passkeyId: info.credential.id, deviceLabel: label });

  redirect("/studio/security");
}

// ---- Add another passkey (AC-9) ----

export async function startAddPasskey(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const session = await requireStudioAccess();
  const owner = await loadOwner();
  const existing = await getDb()
    .select({ id: passkeys.id, transports: passkeys.transports })
    .from(passkeys)
    .where(eq(passkeys.ownerId, session.ownerId));
  const options = await registrationOptions(
    owner,
    existing.map((row) => ({ id: row.id, transports: row.transports ?? undefined })),
  );
  await saveChallenge("register", owner.id, options.challenge);
  return options;
}

export async function finishAddPasskey(
  response: RegistrationResponseJSON,
): Promise<{ ok: true; count: number } | Failure> {
  const session = await requireStudioAccess();
  const label = await currentDeviceLabel();
  const expectedChallenge = await consumeChallenge("register");
  if (!expectedChallenge) {
    return { ok: false, code: "CHALLENGE_EXPIRED" };
  }
  const info = await verifyRegistration(response, expectedChallenge);
  if (!info) {
    return { ok: false, code: "VERIFICATION_FAILED" };
  }
  const inserted = await getDb()
    .insert(passkeys)
    .values({ ...passkeyRow(info, label), ownerId: session.ownerId })
    .onConflictDoNothing({ target: passkeys.id })
    .returning({ id: passkeys.id });
  if (inserted.length === 0) {
    return { ok: false, code: "ALREADY_REGISTERED" };
  }
  await recordEvent("passkey_added", { ownerId: session.ownerId, passkeyId: info.credential.id, deviceLabel: label });
  return { ok: true, count: await countPasskeys(session.ownerId) };
}

// ---- Sign out (AC-8) ----

export async function signOut(): Promise<void> {
  const session = await requireStudioAccess();
  await getDb().delete(sessions).where(eq(sessions.id, session.sessionId));
  await clearSessionCookie();
  await recordEvent("sign_out", { ownerId: session.ownerId, deviceLabel: await currentDeviceLabel() });
  redirect("/studio/login");
}

export async function signOutEverywhere(): Promise<void> {
  const session = await requireStudioAccess();
  await getDb().delete(sessions).where(eq(sessions.ownerId, session.ownerId));
  await clearSessionCookie();
  await recordEvent("sign_out_all", { ownerId: session.ownerId, deviceLabel: await currentDeviceLabel() });
  redirect("/studio/login");
}
