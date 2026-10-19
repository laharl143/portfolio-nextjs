import { ThemeProvider } from "next-themes";

// Providers shared by the public site and the studio root layouts (spec 0003).
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" enableSystem={false} defaultTheme="light">
      {children}
    </ThemeProvider>
  );
}
