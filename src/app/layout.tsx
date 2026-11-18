import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Sora } from "next/font/google";
import { brandColors } from "@/components/brand/colors";
import { Providers } from "@/components/shared/providers";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const description =
  "Turn gameplay screenshots into intelligence. Identify what you see, uncover discoveries and explore the world through a community-powered visual network.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: "Sixth Sense",
  title: {
    default: "Sixth Sense — See beyond the scene.",
    template: "%s · Sixth Sense",
  },
  description,
  openGraph: { siteName: "Sixth Sense", type: "website", description },
  twitter: { card: "summary_large_image", description },
};

export const viewport: Viewport = {
  themeColor: brandColors.midnight,
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only z-50 rounded-md bg-accent px-4 py-2 font-medium text-midnight focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        {/* Shared screen-reader announcements (src/lib/announce.ts). */}
        <div id="ss-announcer" aria-live="polite" className="sr-only" />
      </body>
    </html>
  );
}
