import { db } from "@/db";
import { dashboardAuthFailure } from "@/lib/auth";
import { campaigns } from "@/db/schema";
import { getNextScheduledAt } from "@/lib/schedule";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function findCampaign(id: number) {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return campaign;
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  const { id } = await context.params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId < 1) {
    return NextResponse.json({ error: "E’lon ID noto‘g‘ri." }, { status: 400 });
  }
  try {
    const body = (await request.json()) as { action?: "pause" | "resume" };
    const existing = await findCampaign(campaignId);
    if (!existing) return NextResponse.json({ error: "E’lon topilmadi." }, { status: 404 });
    if (body.action !== "pause" && body.action !== "resume") {
      return NextResponse.json({ error: "Amal pause yoki resume bo‘lishi kerak." }, { status: 400 });
    }
    const status = body.action === "pause" ? "paused" : "active";
    const nextRunAt = status === "active"
      ? getNextScheduledAt(existing, new Date())
      : null;
    const [campaign] = await db
      .update(campaigns)
      .set({ status, nextRunAt })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.status, existing.status)))
      .returning();
    return NextResponse.json({ campaign: campaign ?? existing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "E’lon holatini yangilab bo‘lmadi." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  const { id } = await context.params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId < 1) {
    return NextResponse.json({ error: "E’lon ID noto‘g‘ri." }, { status: 400 });
  }
  try {
    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "E’lonni o‘chirib bo‘lmadi." },
      { status: 500 },
    );
  }
}
