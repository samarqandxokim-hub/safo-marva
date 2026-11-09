import { addChannel } from "@/lib/channels";
import { dashboardAuthFailure } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = dashboardAuthFailure(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { title?: string; chatReference?: string; type?: string };
    if (!body.chatReference?.trim()) {
      return NextResponse.json({ error: "Kanalning @username yoki chat ID manzilini kiriting." }, { status: 400 });
    }
    const channel = await addChannel({
      title: body.title,
      chatReference: body.chatReference,
      fallbackType: body.type,
    });
    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kanalni qo‘shib bo‘lmadi." },
      { status: 400 },
    );
  }
}
