import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSetupToken } from "@/studio/auth/config";
import { requireStudioEnabled } from "@/studio/guard";
import AuthCard from "../../_components/AuthCard";
import SetupForm from "../../_components/SetupForm";

export const metadata: Metadata = {
  title: "Set up a passkey · Studio",
  robots: { index: false, follow: false },
};

// Exists only while STUDIO_SETUP_TOKEN is set (spec 0005, AC-4). Also the recovery path.
export default async function SetupPage() {
  await requireStudioEnabled();
  if (!getSetupToken()) {
    notFound();
  }

  return (
    <AuthCard
      title="Set up a passkey"
      description="Paste the setup token from Vercel. This replaces every existing passkey and signs out every device."
    >
      <SetupForm />
    </AuthCard>
  );
}
