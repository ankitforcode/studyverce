"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { notificationMessages } from "@/lib/notifications/messages";
import { useNotifications } from "@/components/notifications/notification-provider";

type NoticeConfig = {
  param: string;
  value: string;
  toast: () => ReturnType<typeof notificationMessages.passwordResetSuccess>;
};

const NOTICE_CONFIGS: NoticeConfig[] = [
  {
    param: "password_reset",
    value: "success",
    toast: () => notificationMessages.passwordResetSuccess(),
  },
  {
    param: "reauth",
    value: "success",
    toast: () => notificationMessages.reauthenticationSuccess(),
  },
  {
    param: "email_change",
    value: "pending",
    toast: () => notificationMessages.emailChangePending(),
  },
];

function QueryToastHandlerInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useNotifications();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const match = NOTICE_CONFIGS.find(
      (config) => searchParams.get(config.param) === config.value
    );
    if (!match) return;

    handled.current = true;
    toast(match.toast());

    const params = new URLSearchParams(searchParams.toString());
    params.delete(match.param);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, toast]);

  return null;
}

/** Shows toasts triggered by post-navigation query params (e.g. after password reset). */
export function QueryToastHandler() {
  return (
    <Suspense fallback={null}>
      <QueryToastHandlerInner />
    </Suspense>
  );
}
