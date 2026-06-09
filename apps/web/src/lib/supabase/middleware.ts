import { safeRedirectPath } from "@/lib/auth/paths";
import { isProtectedAppPath } from "@/lib/auth/middleware-routes";
import { userMustSetPassword } from "@/lib/auth/room-invite";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedAppPath(pathname);

  if (
    user &&
    userMustSetPassword(user.user_metadata, user.app_metadata, user.invited_at) &&
    pathname !== "/auth/accept-invite" &&
    pathname !== "/auth/callback"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/accept-invite";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.searchParams.set("redirect", returnPath);
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith("/auth/")) {
    // Allow recovery / reauthentication flows while signed in.
    if (
      request.nextUrl.pathname === "/auth/reset-password" ||
      request.nextUrl.pathname === "/auth/accept-invite" ||
      request.nextUrl.pathname === "/auth/reauthenticate"
    ) {
      return supabaseResponse;
    }

    const redirectParam = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));
    if (redirectParam) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
