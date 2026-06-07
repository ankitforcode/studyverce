import { safeRedirectPath } from "@/lib/auth/paths";
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

  const protectedPaths = ["/dashboard", "/settings", "/rooms/new", "/admin"];
  const isProtectedRoom = /^\/rooms\/[^/]+$/.test(request.nextUrl.pathname);
  const isProtected =
    protectedPaths.some((p) => request.nextUrl.pathname.startsWith(p)) || isProtectedRoom;

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.searchParams.set("redirect", returnPath);
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname.startsWith("/auth/")) {
    // Allow recovery flow to finish on the reset-password form.
    if (request.nextUrl.pathname === "/auth/reset-password") {
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
