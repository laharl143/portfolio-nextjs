"use client";

import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

// True on the server render (the button starts enabled), then the real answer in the browser.
export function usePasskeySupport(): boolean {
  return useSyncExternalStore(subscribe, browserSupportsWebAuthn, () => true);
}
