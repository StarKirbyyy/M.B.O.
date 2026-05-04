import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_SC, Rajdhani } from "next/font/google";

import "./globals.css";
import { AuthProvider } from "@/app/components/auth-provider";
import MainNav from "@/app/components/main-nav";
import RouteShellGate from "@/app/components/route-shell-gate";

const fontBody = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const fontDisplay = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "M.B.O.",
  description: "M.B.O. frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`h-full antialiased ${fontBody.variable} ${fontDisplay.variable} ${fontMono.variable}`}>
      <body className="mbo-industrial min-h-full flex flex-col">
        <AuthProvider>
          <MainNav />
          <RouteShellGate>{children}</RouteShellGate>
        </AuthProvider>
      </body>
    </html>
  );
}
