import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AppProviders } from "@/components/layout/app-providers";
import { Navbar } from "@/components/layout/navbar";
import { ConditionalSiteFooter } from "@/components/layout/conditional-site-footer";
import { ReferralCapture } from "@/components/referrals/referral-capture";
import { JsonLd } from "@/components/seo/json-ld";
import { GoogleAnalytics, GoogleConsentMode } from "@/components/seo/google-analytics";
import { ConsentProvider } from "@/components/consent/consent-provider";
import { PostHogRouteContext } from "@/components/analytics/posthog-route-context";
import { PostHogUserIdentity } from "@/components/analytics/posthog-user-identity";
import { DEFAULT_JSON_LD } from "@/lib/seo/structured-data";
import { createSiteMetadata } from "@/lib/site-metadata";
import type { Viewport } from "next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = createSiteMetadata({
  path: "/",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <JsonLd data={[...DEFAULT_JSON_LD]} />
        <GoogleConsentMode />
        <GoogleAnalytics />
        <ConsentProvider>
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          <PostHogRouteContext />
          <PostHogUserIdentity />
          <AppProviders>
            <Navbar />
            <main className="flex-1">{children}</main>
            <ConditionalSiteFooter />
          </AppProviders>
        </ConsentProvider>
      </body>
    </html>
  );
}
