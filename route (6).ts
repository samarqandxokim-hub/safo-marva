import { personalMode } from "@/lib/personal-telegram";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { deliverCampaign } from "@/lib/campaign-delivery";
import { getNextScheduledAt } from "@/lib/schedule";
import { getTelegramToken } from "@/lib/telegram";
import { and, asc, eq, lte } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!secret || !provided) return false;
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Ruxsat yo‘q. CRON_SECRET ni tekshiring." }, { status: 401 });
  }
  if (!personalMode() && !getTelegramToken()) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN sozlanmagan." }, { status: 503 });
  }

  try {
    const now = new Date();
    const dueCampaigns = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.status, "active"), lte(campaigns.nextRunAt, now)))
      .orderBy(asc(campaigns.nextRunAt))
      .limit(20);

    const results: Array<{ campaignId: number; sent: number; failed: number; skipped?: boolean }> = [];
    for (const due of dueCampaigns) {
      const leaseUntil = new Date(Date.now() + 10 * 60_000);
      const [claimed] = await db
        .update(campaigns)
        .set({ nextRunAt: leaseUntil })
        .where(and(eq(campaigns.id, due.id), eq(campaigns.status, "active"), lte(campaigns.nextRunAt, now)))
        .returning();
      if (!claimed) continue;

      try {
        const result = await deliverCampaign(claimed);
        const nextRunAt = getNextScheduledAt(claimed, new Date());
        await db.update(campaigns).set({ nextRunAt }).where(eq(campaigns.id, claimed.id));
        results.push({ campaignId: claimed.id, ...result });
      } catch (error) {
        const nextRunAt = getNextScheduledAt(claimed, new Date());
        await db.update(campaigns).set({ nextRunAt }).where(eq(campaigns.id, claimed.id));
        results.push({ campaignId: claimed.id, sent: 0, failed: 1 });
        console.error(`Campaign ${claimed.id} delivery failed:`, error);
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results, checkedAt: now.toISOString() });
  } catch (error) {
    console.error("Scheduled publish error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rejalashtirilgan jo‘natmalarni tekshirib bo‘lmadi." },
      { status: 500 },
    );
  }
}
