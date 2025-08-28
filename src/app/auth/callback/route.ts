import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/";

  console.log('Auth callback received:', {
    url: requestUrl.toString(),
    hasCode: !!code,
    codePreview: code ? code.substring(0, 8) + '...' : null,
    origin,
    redirectTo,
    allParams: Object.fromEntries(requestUrl.searchParams.entries()),
  });

  if (code) {
    const cookiesSet: Array<{name: string, value: string, options?: any}> = [];
    
    // Determine final redirect URL before creating response
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";
    let finalRedirectUrl: string;
    
    if (!isLocalEnv && forwardedHost) {
      finalRedirectUrl = `https://${forwardedHost}${redirectTo}`;
    } else {
      finalRedirectUrl = `${origin}${redirectTo}`;
    }
    
    const response = NextResponse.redirect(finalRedirectUrl);

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('Auth callback setting cookie:', { name, hasValue: !!value, options });
              response.cookies.set(name, value, options);
              cookiesSet.push({ name, value, options });
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log('Auth callback result:', {
      success: !error,
      error: error?.message,
      errorDetails: error,
      hasUser: !!data.user,
      userId: data.user?.id,
      userEmail: data.user?.email,
      sessionExists: !!data.session,
      cookiesSetCount: cookiesSet.length,
      cookieNames: cookiesSet.map(c => c.name),
    });

    if (!error && data.user) {
      return response;
    }
  }

  console.log('Auth callback failed - redirecting to error page:', {
    hasCode: !!code,
    reason: code ? 'exchangeCodeForSession failed or no user returned' : 'no code parameter',
  });

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}