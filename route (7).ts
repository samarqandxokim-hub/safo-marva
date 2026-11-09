import { db } from "@/db";
import { botSessions, campaigns, channels } from "@/db/schema";
import { addChannel } from "@/lib/channels";
import { getNextScheduledAt, validateSchedule, type PostingSchedule } from "@/lib/schedule";
import {
  getTelegramToken,
  getWebhookSecret,
  sendTelegramMessage,
  telegramApi,
  type InlineKeyboard,
  type TelegramChat,
} from "@/lib/telegram";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Draft = PostingSchedule & { body: string; targetIds: number[] };
type SessionData = {
  selectedChannelIds?: number[];
  schedule?: PostingSchedule;
  draft?: Draft;
};
type BotSession = { step: string; data: SessionData };
type IncomingMessage = {
  chat: TelegramChat;
  from?: { id: number };
  text?: string;
  caption?: string;
};
type CallbackQuery = {
  id: string;
  from: { id: number };
  data?: string;
  message?: { message_id: number; chat: TelegramChat };
};
type TelegramUpdate = { message?: IncomingMessage; callback_query?: CallbackQuery };

async function getSession(userId: number): Promise<BotSession> {
  const [session] = await db
    .select({ step: botSessions.step, data: botSessions.data })
    .from(botSessions)
    .where(eq(botSessions.telegramUserId, String(userId)))
    .limit(1);
  return { step: session?.step ?? "idle", data: (session?.data ?? {}) as SessionData };
}

async function saveSession(userId: number, step: string, data: SessionData) {
  await db
    .insert(botSessions)
    .values({ telegramUserId: String(userId), step, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: botSessions.telegramUserId,
      set: { step, data, updatedAt: new Date() },
    });
}

function channelKeyboard(channelRows: Array<{ id: number; title: string }>, selectedIds: number[]): InlineKeyboard {
  const buttons = channelRows.map((channel) => ({
    text: `${selectedIds.includes(channel.id) ? "☑️" : "▫️"} ${channel.title.slice(0, 35)}`,
    callback_data: `target:${channel.id}`,
  }));
  const rows = buttons.map((button) => [button]);
  rows.push([{ text: "✅ Tanlovni saqlash", callback_data: "target:done" }]);
  return rows;
}

function parseClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

function parseSchedule(text: string): PostingSchedule | null {
  const match = /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})\s+(\d{1,2})/.exec(text.trim());
  if (!match) return null;
  const startTime = parseClock(match[1]);
  const endTime = parseClock(match[2]);
  if (!startTime || !endTime) return null;
  const schedule: PostingSchedule = {
    startTime,
    endTime,
    postsPerDay: Number(match[3]),
    timezone: "Asia/Tashkent",
  };
  return validateSchedule(schedule) ? null : schedule;
}

function scheduleLabel(schedule: PostingSchedule) {
  return `${schedule.startTime}–${schedule.endTime} oralig‘ida kuniga ${schedule.postsPerDay} marta (Toshkent vaqti)`;
}

async function showChannelPicker(chatId: number, userId: number, session: BotSession) {
  const available = await db.select({ id: channels.id, title: channels.title }).from(channels).where(eq(channels.active, true));
  if (!available.length) {
    await sendTelegramMessage(
      chatId,
      "Hali kanal qo‘shilmagan. Botni kanalga administrator qilib qo‘shing, so‘ng /kanal @kanal_username buyrug‘ini yuboring. Bir nechta kanalni vergul bilan ajratib berishingiz mumkin.",
    );
    return;
  }
  const selected = (session.data.selectedChannelIds ?? []).filter((id) => available.some((channel) => channel.id === id));
  await saveSession(userId, session.step, { ...session.data, selectedChannelIds: selected });
  await sendTelegramMessage(chatId, "E’lon boradigan kanallarni tanlang. Belgilangan kanallar qayta bosilsa tanlovdan olinadi.", {
    inline_keyboard: channelKeyboard(available, selected),
  });
}

async function askForSchedule(chatId: number, userId: number, session: BotSession) {
  await saveSession(userId, "waiting_schedule", session.data);
  await sendTelegramMessage(
    chatId,
    "🕒 E’lon oralig‘i va kunlik sonini yuboring.\n\nFormat: 12:00 24:00 10\nBu 12:00 dan 24:00 gacha kuniga 10 marta, Toshkent vaqti bilan degani. Bekor qilish uchun /stop.",
  );
}

async function startAd(chatId: number, userId: number, session: BotSession) {
  const selected = session.data.selectedChannelIds ?? [];
  const schedule = session.data.schedule;
  if (!selected.length) {
    await sendTelegramMessage(chatId, "Avval /kanal buyrug‘i bilan e’lon boradigan kanallarni tanlang.");
    await showChannelPicker(chatId, userId, session);
    return;
  }
  if (!schedule) {
    await sendTelegramMessage(chatId, "E’lon vaqtini avval /qaysi buyrug‘i bilan belgilang.");
    await askForSchedule(chatId, userId, session);
    return;
  }
  await saveSession(userId, "waiting_ad", session.data);
  await sendTelegramMessage(chatId, "✍️ Endi e’lon matnini shu chatga yuboring. Matn 4 096 belgigacha bo‘lishi mumkin. Tasdiqlamaguningizcha e’lon faollashmaydi.");
}

async function showWelcome(chatId: number) {
  const appUrl = process.env.APP_URL?.trim();
  const link = appUrl ? `\n\nBoshqaruv paneli: ${appUrl}` : "";
  await sendTelegramMessage(
    chatId,
    `Assalomu alaykum! 🤍\n\nSafaFlow e’lonlaringizni tanlangan Telegram kanal va guruhlarga jadval bo‘yicha yuboradi.\n\n📣 Kanallar: /kanal\n🕒 Vaqt va son: /qaysi\n✍️ E’lon yuborish: /tashamoqchi\n❔ Yordam: /help\n\nAvval botni kanalga administrator qilib qo‘shing. Guruhda xabar yuborish huquqi bo‘lishi kerak.${link}`,
    {
      inline_keyboard: [
        [{ text: "📣 Kanallar", callback_data: "menu:channels" }],
        [{ text: "🕒 Jadval", callback_data: "menu:schedule" }],
        [{ text: "✍️ E’lon yuborish", callback_data: "menu:ad" }],
      ],
    },
  );
}

async function handleTextMessage(message: IncomingMessage) {
  const userId = message.from?.id;
  const text = (message.text ?? message.caption ?? "").trim();
  if (!userId || message.chat.type !== "private" || !text) return;

  const configuredOwner = process.env.BOT_OWNER_ID?.trim();
  if (!configuredOwner) {
    if (/^\/start(?:\s|$)/i.test(text)) {
      await sendTelegramMessage(
        message.chat.id,
        `Bot egasining Telegram ID raqami: ${userId}\n\nXavfsizlik uchun server yoki GitHub deploy sozlamalariga BOT_OWNER_ID=${userId} qiymatini qo‘shing, keyin /start ni qayta bosing. Shunda botni faqat siz boshqarasiz.`,
      );
    }
    return;
  }
  if (String(userId) !== configuredOwner) return;

  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand?.split("@")[0].toLowerCase();
  let session = await getSession(userId);

  if (command === "/start") {
    await showWelcome(message.chat.id);
    return;
  }
  if (command === "/help") {
    await sendTelegramMessage(
      message.chat.id,
      "📖 Buyruqlar\n/start — botni boshlash\n/kanal — kanallarni tanlash yoki /kanal @kanal_username bilan qo‘shish\n/qaysi — vaqt oralig‘i va kunlik e’lon soni\n/vaqt 12:00 24:00 10 — jadvalni tez sozlash\n/tashamoqchi — yangi e’lon matnini yuborish\n/stop — joriy amalni bekor qilish\n\nE’lon faqat tasdiqlaganingizdan keyin jadvalga qo‘shiladi.",
    );
    return;
  }
  if (command === "/stop") {
    await saveSession(userId, "idle", { ...session.data, draft: undefined });
    await sendTelegramMessage(message.chat.id, "Joriy amal bekor qilindi. Saqlangan kanal tanlovi va jadval o‘zgarishsiz qoldi.");
    return;
  }
  if (command === "/kanal") {
    const references = args.join(" ").split(/[\s,;]+/).filter(Boolean);
    if (references.length) {
      const added: string[] = [];
      const errors: string[] = [];
      const selected = new Set(session.data.selectedChannelIds ?? []);
      for (const reference of references.slice(0, 10)) {
        try {
          const channel = await addChannel({ chatReference: reference });
          added.push(channel.title);
          selected.add(channel.id);
        } catch (error) {
          errors.push(`${reference}: ${error instanceof Error ? error.message : "qo‘shilmadi"}`);
        }
      }
      session = { ...session, data: { ...session.data, selectedChannelIds: [...selected] } };
      await saveSession(userId, session.step, session.data);
      const summary = [
        added.length ? `✅ Qo‘shildi va tanlandi: ${added.join(", ")}` : "",
        errors.length ? `⚠️ ${errors.join("\n")}` : "",
      ].filter(Boolean).join("\n\n");
      await sendTelegramMessage(message.chat.id, summary || "Kanal qo‘shilmadi.");
    }
    await showChannelPicker(message.chat.id, userId, session);
    return;
  }
  if (command === "/qaysi" || command === "/reja" || command === "/vaqt") {
    const suppliedSchedule = parseSchedule(args.join(" "));
    if (suppliedSchedule) {
      await saveSession(userId, "idle", { ...session.data, schedule: suppliedSchedule });
      await sendTelegramMessage(message.chat.id, `✅ Jadval saqlandi: ${scheduleLabel(suppliedSchedule)}.\n\nYangi e’lon uchun /tashamoqchi ni bosing.`);
      return;
    }
    if (args.length) {
      await sendTelegramMessage(message.chat.id, "Format: /vaqt 12:00 24:00 10 (kuniga 10 marta). Vaqt 24:00 bo‘lishi mumkin.");
      return;
    }
    await askForSchedule(message.chat.id, userId, session);
    return;
  }
  if (command === "/tashamoqchi") {
    await startAd(message.chat.id, userId, session);
    return;
  }

  if (text.startsWith("/")) return;
  if (session.step === "waiting_schedule") {
    const schedule = parseSchedule(text);
    if (!schedule) {
      await sendTelegramMessage(message.chat.id, "Format noto‘g‘ri. Misol: 12:00 24:00 10\nSoat 00:00–24:00, kunlik son 1–30 bo‘lishi kerak.");
      return;
    }
    await saveSession(userId, "idle", { ...session.data, schedule });
    await sendTelegramMessage(message.chat.id, `✅ Jadval saqlandi: ${scheduleLabel(schedule)}.\n\nEndi /tashamoqchi ni bosing.`);
    return;
  }
  if (session.step === "waiting_ad") {
    if (text.length > 4_096) {
      await sendTelegramMessage(message.chat.id, "E’lon 4 096 belgidan uzun. Qisqartirib qayta yuboring.");
      return;
    }
    const targetIds = session.data.selectedChannelIds ?? [];
    const schedule = session.data.schedule;
    if (!targetIds.length || !schedule) {
      await saveSession(userId, "idle", session.data);
      await sendTelegramMessage(message.chat.id, "Kanallar yoki jadval topilmadi. /kanal va /qaysi bilan sozlamalarni tekshiring.");
      return;
    }
    const draft: Draft = { body: text, targetIds, ...schedule };
    await saveSession(userId, "confirm_ad", { ...session.data, draft });
    const preview = text.length > 3_300 ? `${text.slice(0, 3_300)}\n… (ko‘rinish qisqartirildi)` : text;
    await sendTelegramMessage(
      message.chat.id,
      `👀 E’lon ko‘rinishi\n\n${preview}\n\n📣 ${targetIds.length} ta tanlangan kanal\n🕒 ${scheduleLabel(schedule)}\n\nFaollashtirishdan oldin matn va jadvalni tekshiring.`,
      {
        inline_keyboard: [[
          { text: "✅ Tasdiqlash va jadvalga qo‘shish", callback_data: "ad:confirm" },
          { text: "Bekor qilish", callback_data: "ad:cancel" },
        ]],
      },
    );
    return;
  }
  await sendTelegramMessage(message.chat.id, "Buyruqlarni ko‘rish uchun /help ni bosing.");
}

async function handleCallback(callback: CallbackQuery) {
  if (!callback.message || callback.message.chat.type !== "private") return;
  const userId = callback.from.id;
  if (!process.env.BOT_OWNER_ID?.trim() || String(userId) !== process.env.BOT_OWNER_ID.trim()) return;
  const chatId = callback.message.chat.id;
  const data = callback.data ?? "";
  let session = await getSession(userId);

  try {
    await telegramApi<boolean>("answerCallbackQuery", { callback_query_id: callback.id });
  } catch {
    // Continue with the action even if Telegram has already closed the spinner.
  }

  if (data === "menu:channels") {
    await showChannelPicker(chatId, userId, session);
    return;
  }
  if (data === "menu:schedule") {
    await askForSchedule(chatId, userId, session);
    return;
  }
  if (data === "menu:ad") {
    await startAd(chatId, userId, session);
    return;
  }
  if (data === "target:done") {
    const selected = session.data.selectedChannelIds ?? [];
    const names = selected.length
      ? await db.select({ title: channels.title }).from(channels).where(inArray(channels.id, selected))
      : [];
    await sendTelegramMessage(chatId, `Tanlov saqlandi: ${selected.length} ta kanal.${names.length ? `\n${names.map((channel) => `• ${channel.title}`).join("\n")}` : ""}\n\nYangi e’lon uchun /tashamoqchi ni bosing.`);
    return;
  }
  if (data.startsWith("target:")) {
    const channelId = Number(data.slice("target:".length));
    if (Number.isInteger(channelId) && channelId > 0) {
      const current = new Set(session.data.selectedChannelIds ?? []);
      if (current.has(channelId)) current.delete(channelId);
      else current.add(channelId);
      session = { ...session, data: { ...session.data, selectedChannelIds: [...current] } };
      await saveSession(userId, session.step, session.data);
      const available = await db.select({ id: channels.id, title: channels.title }).from(channels).where(eq(channels.active, true));
      await telegramApi("editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: callback.message.message_id,
        reply_markup: { inline_keyboard: channelKeyboard(available, [...current]) },
      });
    }
    return;
  }
  if (data === "ad:cancel") {
    const { draft: _draft, ...rest } = session.data;
    await saveSession(userId, "idle", rest);
    await sendTelegramMessage(chatId, "E’lon bekor qilindi. Matn jadvalga qo‘shilmadi.");
    return;
  }
  if (data === "ad:confirm") {
    const draft = session.data.draft;
    if (!draft) {
      await sendTelegramMessage(chatId, "Tasdiqlanadigan e’lon topilmadi. /tashamoqchi bilan qayta boshlang.");
      return;
    }
    const activeChannels = await db.select({ id: channels.id }).from(channels).where(eq(channels.active, true));
    const activeIds = new Set(activeChannels.map((channel) => channel.id));
    const targetIds = draft.targetIds.filter((id) => activeIds.has(id));
    if (!targetIds.length) {
      await sendTelegramMessage(chatId, "Tanlangan faol kanallar qolmagan. /kanal bilan yangidan tanlang.");
      return;
    }
    const title = draft.body.split("\n").find((line) => line.trim())?.trim().slice(0, 180) || "Yangi e’lon";
    const nextRunAt = getNextScheduledAt(draft);
    await db.insert(campaigns).values({
      title,
      body: draft.body,
      targetIds,
      startTime: draft.startTime,
      endTime: draft.endTime,
      postsPerDay: draft.postsPerDay,
      timezone: draft.timezone ?? "Asia/Tashkent",
      status: "active",
      nextRunAt,
    });
    const { draft: _draft, ...rest } = session.data;
    await saveSession(userId, "idle", rest);
    await sendTelegramMessage(chatId, `🎉 E’lon jadvalga qo‘shildi!\n\n📣 ${targetIds.length} ta kanal\n🕒 ${scheduleLabel(draft)}\n⏭ Keyingi yuborish: ${new Intl.DateTimeFormat("uz-UZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tashkent" }).format(nextRunAt)}\n\nTo‘xtatish yoki o‘zgartirish uchun boshqaruv panelidan foydalaning.`);
  }
}

async function processUpdate(update: TelegramUpdate) {
  if (update.message) await handleTextMessage(update.message);
  if (update.callback_query) await handleCallback(update.callback_query);
}

export async function POST(request: Request) {
  const secret = getWebhookSecret();
  const provided = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Webhook secret noto‘g‘ri." }, { status: 401 });
  }
  if (!getTelegramToken()) {
    return NextResponse.json({ error: "Telegram bot token sozlanmagan." }, { status: 503 });
  }

  try {
    const update = (await request.json()) as TelegramUpdate;
    await processUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Telegram yangilanishini qayta ishlashda xatolik." },
      { status: 500 },
    );
  }
}
