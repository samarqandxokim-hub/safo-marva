import { createHash } from "node:crypto";

export type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
};

export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
};

export type TelegramMember = {
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  can_post_messages?: boolean;
  can_send_messages?: boolean;
};

export type InlineKeyboard = Array<Array<{ text: string; callback_data: string }>>;

type TelegramEnvelope<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export function getTelegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function getWebhookSecret() {
  const configured = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (configured) return configured;
  const token = getTelegramToken();
  return token ? createHash("sha256").update(`safaflow:${token}`).digest("hex") : "";
}

export async function telegramApi<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const token = getTelegramToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan. BotFather’dan bot tokenini kiriting.");

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await response.json()) as TelegramEnvelope<T>;
  if (!response.ok || !result.ok || result.result === undefined) {
    throw new Error(result.description ?? `Telegram ${method} so‘rovini bajarmadi.`);
  }
  return result.result;
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: { inline_keyboard: InlineKeyboard },
) {
  return telegramApi<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export function normalizeChatReference(value: string) {
  let reference = value.trim().replace(/[),.;]+$/, "");
  reference = reference.replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i, "");
  reference = reference.replace(/^@/, "");
  if (reference.startsWith("s/")) reference = reference.slice(2);
  if (/^-?\d+$/.test(reference)) return reference;
  if (/^[A-Za-z0-9_]{5,}$/.test(reference)) return `@${reference}`;
  throw new Error(`Kanal manzili noto‘g‘ri: ${value}`);
}
