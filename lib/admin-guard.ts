import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/lib/admin-session";

export async function requireAdminPage(nextPath: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isValidAdminSessionToken(sessionToken)) {
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
}

export async function requireAdminAction(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!isValidAdminSessionToken(sessionToken)) {
    redirect("/admin/login?error=invalid");
  }
}
