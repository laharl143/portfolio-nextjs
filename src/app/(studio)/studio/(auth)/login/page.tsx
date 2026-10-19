import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStudioSession } from "@/studio/auth/session";
import { requireStudioEnabled } from "@/studio/guard";
import AuthCard from "../../_components/AuthCard";
import LoginForm from "../../_components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in · Studio",
  robots: { index: false, follow: false },
};

// Flag only, never requireStudioAccess(): this page must render for a signed out visitor (spec 0005).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  await requireStudioEnabled();
  if (await getStudioSession()) {
    redirect("/studio");
  }
  const { next } = await searchParams;

  return (
    <AuthCard title="Sign in" description="Use the passkey on this device to open your studio.">
      {/* Passed through as is; finishSignIn() runs it through safeNext() on the server. */}
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthCard>
  );
}
