import Script from "next/script";
import { buildConsentBootstrapScript } from "@/lib/consent/gtag";

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-SSW5YJCT5M";

export function GoogleConsentMode() {
  return (
    <Script id="google-consent-mode" strategy="beforeInteractive">
      {buildConsentBootstrapScript()}
    </Script>
  );
}

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
