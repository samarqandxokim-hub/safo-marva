import { db } from "@/db";
import { dashboardAuthFailure } from "@/lib/auth";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  const { id } = await context.params;
  const channelId = Number(id);
  if (!Number.isInteger(channelId) || channelId < 1) {
    return NextResponse.json({ error: "Kanal ID noto‘g‘ri." }, { status: 400 });
  }
  try {
    const body = (await request.json()) as { active?: boolean };
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "active qiymati kerak." }, { status: 400 });
    }
    const [channel] = await db
      .update(channels)
      .set({ active: body.active })
      .where(eq(channels.id, channelId))
      .returning();
    if (!channel) return NextResponse.json({ error: "Kanal topilmadi." }, { status: 404 });
    return NextResponse.json({ channel });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kanalni yangilab bo‘lmadi." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  const { id } = await context.params;
  const channelId = Number(id);
  if (!Number.isInteger(channelId) || channelId < 1) {
    return NextResponse.json({ error: "Kanal ID noto‘g‘ri." }, { status: 400 });
  }
  try {
    await db.delete(channels).where(eq(channels.id, channelId));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kanalni o‘chirib bo‘lmadi." },
      { status: 500 },
    );
  }
}
