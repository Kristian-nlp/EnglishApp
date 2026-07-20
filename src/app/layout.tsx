import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Tutor — speak English with an AI tutor",
  description:
    "AI-powered English conversation practice for German speakers. Gentle correction, pronunciation feedback, and spaced-repetition vocabulary.",
  applicationName: "English Tutor",
  manifest: "/manifest.webmanifest",
  // iOS standalone PWA support (FR-1202, FR-1204).
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "English Tutor",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Dark theme-color to match FR-1220 default.
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  // viewportFit cover is required for env(safe-area-inset-*) to resolve (FR-1211).
  // Note: pinch-zoom is intentionally left enabled for accessibility (NFR-501);
  // accidental double-tap zoom is suppressed per-surface via touch-action.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // lang defaults to en; the UI-chrome locale (de/en) is applied by next-intl
  // later (NFR-601). Learning content is always English.
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
