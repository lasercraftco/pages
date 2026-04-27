import type { Metadata, Viewport } from "next";

import { Toaster } from "sonner";

import { BRAND } from "@/lib/brand";

import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
  applicationName: BRAND.name,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#07050b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{ className: "glass-strong text-white" }}
        />
      </body>
    </html>
  );
}
