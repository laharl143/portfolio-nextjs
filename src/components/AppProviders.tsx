import { ThemeProvider } from "next-themes";

// A saved "system" is left over from before enableSystem was off; treat it as no choice so the group default applies (spec 0015, AC-3).
const clearStaleSystemTheme = `try{if(localStorage.getItem("theme")==="system")localStorage.removeItem("theme")}catch(e){}`;

// Providers shared by the public site and the studio (spec 0003). Each route group passes its own default theme (spec 0015).
export default function AppProviders({
  children,
  defaultTheme,
}: {
  children: React.ReactNode;
  defaultTheme: "light" | "dark";
}) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: clearStaleSystemTheme }} />
      <ThemeProvider attribute="class" enableSystem={false} defaultTheme={defaultTheme}>
        {children}
      </ThemeProvider>
    </>
  );
}
