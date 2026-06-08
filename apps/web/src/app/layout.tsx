import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { GoogleAnalytics, GoogleConsentMode } from "@/components/seo/google-analytics";
import { ConsentProvider } from "@/components/consent/consent-provider";
import { DEFAULT_JSON_LD } from "@/lib/seo/structured-data";
import { createSiteMetadata } from "@/lib/site-metadata";
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
          <AppProviders>
            <Navbar />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </AppProviders>
        </ConsentProvider>
      </body>
    </html>
  );
}
