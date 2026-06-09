import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";
import { getSessionUser } from "@/lib/auth/server-session";

export const metadata = createSiteMetadata({
  path: "/settings",
  title: "Settings",
  description: "Manage your StudyVerce profile, account, and referral rewards.",
  robots: NOINDEX_ROBOTS,
});

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) redirect("/auth/login?redirect=/settings/profile");

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and account security.
        </p>
      </div>

      <SettingsNav />

      {children}
    </div>
  );
}
