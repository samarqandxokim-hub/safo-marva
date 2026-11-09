import { db } from "@/db";
import { dashboardAuthFailure } from "@/lib/auth";
import { campaigns, channels } from "@/db/schema";
import { getNextScheduledAt, validateSchedule } from "@/lib/schedule";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      title?: string;
      body?: string;
      targetIds?: number[];
      startTime?: string;
      endTime?: string;
      postsPerDay?: number;
      timezone?: string;
    };
    const text = body.body?.trim() ?? "";
    if (!text) return NextResponse.json({ error: "E’lon matnini kiriting." }, { status: 400 });
    if (text.length > 4_096) {
      return NextResponse.json({ error: "Telegram e’loni 4 096 belgidan oshmasligi kerak." }, { status: 400 });
    }

    const targetIds = [...new Set((body.targetIds ?? []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!targetIds.length) {
      return NextResponse.json({ error: "Kamida bitta kanal yoki guruhni tanlang." }, { status: 400 });
    }
    const activeChannels = await db.select().from(channels);
    const activeIds = new Set(activeChannels.filter((channel) => channel.active).map((channel) => channel.id));
    if (targetIds.some((id) => !activeIds.has(id))) {
      return NextResponse.json({ error: "Tanlangan kanallardan biri topilmadi yoki faol emas." }, { status: 400 });
    }

    const schedule = {
      startTime: body.startTime ?? "12:00",
      endTime: body.endTime ?? "24:00",
      postsPerDay: Number(body.postsPerDay ?? 5),
      timezone: body.timezone ?? "Asia/Tashkent",
    };
    const scheduleError = validateSchedule(schedule);
    if (scheduleError) return NextResponse.json({ error: scheduleError }, { status: 400 });

    const title = body.title?.trim().slice(0, 180) || text.split("\n").find((line) => line.trim())?.trim().slice(0, 180) || "Yangi e’lon";
    const nextRunAt = getNextScheduledAt(schedule);
    const [campaign] = await db
      .insert(campaigns)
      .values({ ...schedule, title, body: text, targetIds, status: "active", nextRunAt })
      .returning();

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "E’lonni saqlab bo‘lmadi." },
      { status: 400 },
    );
  }
}
