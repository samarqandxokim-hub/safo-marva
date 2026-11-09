import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const DASHBOARD_COOKIE = "safaflow_admin";

export function isDashboardPasswordConfigured() {
  return Boolean(process.env.DASHBOARD_PASSWORD?.trim());
}

function expectedSessionToken() {
  const password = process.env.DASHBOARD_PASSWORD?.trim();
  return password ? createHmac("sha256", password).update("safaflow-dashboard-session-v1").digest("hex") : "";
}

export function isDashboardAuthorized(request: Request) {
  if (!isDashboardPasswordConfigured()) return true;
  const expected = expectedSessionToken();
  const cookies = request.headers.get("cookie") ?? "";
  const actual = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DASHBOARD_COOKIE}=`))
    ?.slice(DASHBOARD_COOKIE.length + 1) ?? "";
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length > 0 && expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function dashboardAuthFailure(request: Request) {
  return isDashboardAuthorized(request)
    ? null
    : NextResponse.json({ error: "Panelga kirish uchun parol bilan tizimga kiring." }, { status: 401 });
}
