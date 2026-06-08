"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, Sparkles } from "lucide-react";
import {
  getPremiumPricing,
  PLAN_FAQ,
  PRODUCT_PLANS,
  type BillingInterval,
} from "@/lib/plans/content";
import { TERMS_OF_SERVICE_PATH } from "@/lib/legal/urls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function BillingIntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-border/60 bg-muted/40 p-1"
      role="group"
      aria-label="Billing interval"
    >
      {(
        [
          { id: "monthly" as const, label: "Monthly" },
          { id: "yearly" as const, label: "Yearly" },
        ] as const
      ).map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
            value === option.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={value === option.id}
        >
          {option.label}
          {option.id === "yearly" && (
            <span className="ml-1.5 hidden text-xs font-semibold text-primary sm:inline">
              · 2 mo free
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PlansGrid() {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const premiumPricing = getPremiumPricing(billingInterval);

  return (
    <>
      <div className="mb-8 flex flex-col items-center gap-3">
        <BillingIntervalToggle value={billingInterval} onChange={setBillingInterval} />
        <p className="text-center text-sm text-muted-foreground">
          {billingInterval === "yearly"
            ? "Pay for 10 months, get 12 — two months free on Premium yearly billing."
            : "Premium billed monthly. Switch to yearly anytime for two months free."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PRODUCT_PLANS.map((plan) => {
          const isPremium = plan.tier === "premium";
          const priceLabel = isPremium ? premiumPricing.priceLabel : plan.priceLabel;
          const priceDetail = isPremium ? premiumPricing.priceDetail : plan.priceDetail;

          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative flex h-full flex-col border-border/60 bg-card/80 backdrop-blur-sm",
                plan.highlighted && "border-primary/40 shadow-lg shadow-primary/10 lg:-translate-y-1"
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge
                    variant={plan.highlighted ? "default" : "secondary"}
                    className="px-3 py-1 shadow-sm"
                  >
                    {isPremium && billingInterval === "yearly" && premiumPricing.savingsBadge
                      ? premiumPricing.savingsBadge
                      : plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="space-y-4 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm leading-relaxed text-muted-foreground">{plan.headline}</p>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight">{priceLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{priceDetail}</p>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            feature.highlight ? "text-primary" : "text-primary/80"
                          )}
                        />
                      ) : (
                        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                      )}
                      <span
                        className={cn(
                          feature.included ? "text-foreground" : "text-muted-foreground",
                          feature.highlight && "font-medium text-primary"
                        )}
                      >
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.cta.external ? (
                    <a href={plan.cta.href} className="block">
                      <Button
                        variant={plan.highlighted ? "default" : "outline"}
                        className="w-full"
                      >
                        {plan.cta.label}
                      </Button>
                    </a>
                  ) : (
                    <Link href={plan.cta.href} className="block">
                      <Button
                        variant={plan.highlighted ? "default" : "outline"}
                        className="w-full gap-2"
                      >
                        {plan.tier === "premium" && <Sparkles className="h-4 w-4" />}
                        {plan.cta.label}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section aria-labelledby="plans-faq-heading" className="mt-16 sm:mt-20">
        <h2 id="plans-faq-heading" className="text-center text-2xl font-bold sm:text-3xl">
          Plan questions
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Premium is shown in EUR. Billing terms and taxes will appear at checkout when
          subscriptions launch. See our{" "}
          <Link href={TERMS_OF_SERVICE_PATH} className="text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>{" "}
          for current plan policy.
        </p>
        <dl className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {PLAN_FAQ.map((item) => (
            <div
              key={item.question}
              className="rounded-xl border border-border/60 bg-card/40 p-5"
            >
              <dt className="text-sm font-semibold text-foreground">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
