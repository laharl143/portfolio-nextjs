import AppProviders from "@/components/AppProviders";

// The portfolio keeps its light default (spec 0015, AC-3 and AC-7).
export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders defaultTheme="light">{children}</AppProviders>;
}
