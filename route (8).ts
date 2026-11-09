import { getWebhookSecret, getTelegramToken, telegramApi } from "@/lib/telegram";
import { dashboardAuthFailure } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  if (!getTelegramToken()) {
    return NextResponse.json({ error: "Avval TELEGRAM_BOT_TOKEN ni server muhitiga qo‘shing." }, { status: 400 });
  }

  try {
    const appUrl = (process.env.APP_URL?.trim() || new URL(request.url).origin).replace(/\/$/, "");
    const webhookUrl = `${appUrl}/api/telegram/webhook`;
    if (!webhookUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Telegram webhook uchun APP_URL HTTPS bo‘lishi kerak." }, { status: 400 });
    }
    const secret = getWebhookSecret();
    if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
      return NextResponse.json({ error: "TELEGRAM_WEBHOOK_SECRET faqat harf, raqam, _ va - belgilaridan iborat bo‘lsin." }, { status: 400 });
    }
    await telegramApi<boolean>("setWebhook", {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
    return NextResponse.json({ ok: true, webhookUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook’ni ulab bo‘lmadi." },
      { status: 502 },
    );
  }
}
