import { NextResponse, type NextRequest } from "next/server";
import { DEV_COOKIE } from "@/lib/auth";
import { isSupabaseEnabled } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  if (isSupabaseEnabled) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } else {
    res.cookies.delete(DEV_COOKIE);
  }
  return res;
}
