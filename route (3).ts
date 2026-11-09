import { db } from "@/db";
import { dashboardAuthFailure } from "@/lib/auth";
import { campaigns } from "@/db/schema";
import { deliverCampaign } from "@/lib/campaign-delivery";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  const { id } = await context.params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId < 1) {
    return NextResponse.json({ error: "E’lon ID noto‘g‘ri." }, { status: 400 });
  }
  try {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    if (!campaign) return NextResponse.json({ error: "E’lon topilmadi." }, { status: 404 });
    const result = await deliverCampaign(campaign);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "E’lonni yuborib bo‘lmadi." },
      { status: 400 },
    );
  }
}
