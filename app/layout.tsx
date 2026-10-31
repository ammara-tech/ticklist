import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import AppShell from "@/components/AppShell";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });

export const metadata: Metadata = {
  title: "TickList — one shopping and chores list for the whole house",
  description:
    "A shared shopping and chores list for families and flatmates. Changes appear live on everyone's phone, invite people with a link, and it works offline in the shop.",
  appleWebApp: { capable: true, title: "TickList", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#121814" },
  ],
};

// Applies the saved (or the phone's) light/dark theme before the page is drawn, so there's no flash
const themeScript = `try{var t=localStorage.getItem("ticklist:theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;if(localStorage.getItem("ticklist:signedIn"))document.documentElement.dataset.signedIn="1"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={bricolage.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
