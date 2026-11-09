import { DASHBOARD_COOKIE, isDashboardPasswordConfigured } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configured = process.env.DASHBOARD_PASSWORD?.trim();
  if (!isDashboardPasswordConfigured() || !configured) {
    return NextResponse.json({ error: "Serverda DASHBOARD_PASSWORD sozlanmagan." }, { status: 503 });
  }
  try {
    const body = (await request.json()) as { password?: string };
    if (body.password !== configured) {
      return NextResponse.json({ error: "Parol noto‘g‘ri. Qaytadan tekshirib ko‘ring." }, { status: 401 });
    }
    const { createHmac } = await import("node:crypto");
    const session = createHmac("sha256", configured).update("safaflow-dashboard-session-v1").digest("hex");
    const response = NextResponse.json({ ok: true });
    response.cookies.set(DASHBOARD_COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Kirish ma’lumotini o‘qib bo‘lmadi." }, { status: 400 });
  }
}
