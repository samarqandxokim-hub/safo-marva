import { db } from "@/db";
import { dashboardAuthFailure, isDashboardPasswordConfigured } from "@/lib/auth";
import { campaigns, channels, deliveries } from "@/db/schema";
import { telegramApi } from "@/lib/telegram";
import { asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  try {
    const [channelRows, campaignRows, deliveryRows] = await Promise.all([
      db.select().from(channels).orderBy(asc(channels.createdAt)),
      db.select().from(campaigns).orderBy(desc(campaigns.createdAt)).limit(30),
      db.select().from(deliveries).orderBy(desc(deliveries.sentAt)).limit(30),
    ]);

    const tokenConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
    let webhookUrl = "";
    let botUsername = "";
    if (tokenConfigured) {
      try {
        const [webhook, me] = await Promise.all([
          telegramApi<{ url?: string }>("getWebhookInfo"),
          telegramApi<{ username?: string }>("getMe"),
        ]);
        webhookUrl = webhook.url ?? "";
        botUsername = me.username ?? "";
      } catch {
        // The dashboard still loads when a bot token has not been added yet.
      }
    }

    const expectedWebhook = "/api/telegram/webhook";
    return NextResponse.json({
      channels: channelRows,
      campaigns: campaignRows,
      deliveries: deliveryRows,
      telegram: {
        tokenConfigured,
        webhookUrl,
        webhookConfigured: webhookUrl.includes(expectedWebhook),
        botUsername,
      },
      appUrl: process.env.APP_URL ?? "",
      accessProtected: isDashboardPasswordConfigured(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Boshqaruv ma’lumotlarini yuklab bo‘lmadi." },
      { status: 500 },
    );
  }
}
