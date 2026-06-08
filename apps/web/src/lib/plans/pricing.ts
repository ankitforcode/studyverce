export type BillingInterval = "monthly" | "yearly";

/** Premium list price in EUR (monthly). */
export const PREMIUM_MONTHLY_PRICE_EUR = 4.99;

/** Yearly plan charges 10 months — 2 months free on an annual subscription. */
export const PREMIUM_YEARLY_MONTHS_CHARGED = 10;

export const PREMIUM_YEARLY_PRICE_EUR =
  PREMIUM_MONTHLY_PRICE_EUR * PREMIUM_YEARLY_MONTHS_CHARGED;

const eurFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPlanPriceEur(amount: number): string {
  return eurFormatter.format(amount);
}

export function getPremiumPricing(interval: BillingInterval): {
  priceLabel: string;
  priceDetail: string;
  savingsBadge?: string;
} {
  if (interval === "monthly") {
    return {
      priceLabel: formatPlanPriceEur(PREMIUM_MONTHLY_PRICE_EUR),
      priceDetail: "per month, billed monthly",
    };
  }

  const effectiveMonthly = PREMIUM_YEARLY_PRICE_EUR / 12;

  return {
    priceLabel: formatPlanPriceEur(PREMIUM_YEARLY_PRICE_EUR),
    priceDetail: `per year (${formatPlanPriceEur(effectiveMonthly)}/mo — 2 months free)`,
    savingsBadge: "2 months free",
  };
}
