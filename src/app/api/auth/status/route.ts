import { isDashboardAuthorized, isDashboardPasswordConfigured } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const required = isDashboardPasswordConfigured();
  return NextResponse.json({ required, authenticated: !required || isDashboardAuthorized(request) });
}
