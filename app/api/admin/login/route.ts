import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

import {
  ADMIN_SESSION_COOKIE,
  getExpectedAdminSessionToken,
} from "@/lib/admin-session";

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  const nextPath = String(formData.get("next") || "/admin/orders");

  const expectedToken = getExpectedAdminSessionToken();
  if (!expectedToken) {
    return NextResponse.redirect(
      new URL("/admin/login?error=config", request.url),
      { status: 303 },
    );
  }

  if (!password) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), {
      status: 303,
    });
  }

  const passwordToken = createHash("sha256").update(password).digest("hex");
  const submittedBuffer = Buffer.from(passwordToken);
  const expectedBuffer = Buffer.from(expectedToken);
  const isValid =
    submittedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(submittedBuffer, expectedBuffer);

  if (!isValid) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), {
      status: 303,
    });
  }

  const destination =
    nextPath.startsWith("/admin") && !nextPath.startsWith("/admin/login")
      ? nextPath
      : "/admin/orders";

  const response = NextResponse.redirect(new URL(destination, request.url), {
    status: 303,
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, expectedToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK_SECONDS,
  });

  return response;
}
