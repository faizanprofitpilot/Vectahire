import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareSupabase } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createMiddlewareSupabase(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip interview API so large multipart uploads are not processed by auth middleware.
    "/((?!api/interview|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
