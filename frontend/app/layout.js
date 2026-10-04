import "./globals.css";
import "./pages.css";

import { AppProvider } from "./context/AppContext";
import AppShell from "./components/layout/AppShell";

export const metadata = {
  title: "AI Job Copilot",
  description: "AI Job Intelligence & Resume Copilot - local GenAI project",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
