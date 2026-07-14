import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * getUser() re-validates the session against Supabase's auth server on every
 * call (unlike getSession(), which just trusts the local cookie) — that's
 * the right call for security, but a layout and its page both calling it
 * independently doubles that network round-trip on every single navigation.
 * React's cache() dedupes calls within one request, so this runs once per
 * page render no matter how many components ask for it.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
