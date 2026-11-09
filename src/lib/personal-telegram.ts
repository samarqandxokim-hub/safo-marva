import { TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions";

/** Explicit opt-in: never silently fall back to the bot or to a personal account. */
export function personalMode() { return process.env.TELEGRAM_SENDER?.trim() === "account"; }

export async function withPersonalClient<T>(fn: (client: TelegramClient) => Promise<T>): Promise<T> {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH?.trim();
  const session = process.env.TELEGRAM_USER_SESSION?.trim();
  if (!Number.isSafeInteger(apiId) || apiId <= 0 || !apiHash || !session) {
    throw new Error("Shaxsiy akkaunt sozlanmagan: API ID, API HASH va USER SESSION kerak.");
  }
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, { connectionRetries: 2 });
  try {
    await client.connect();
    if (!await client.isUserAuthorized()) throw new Error("Telegram sessiyasi bekor qilingan; qayta kiring.");
    return await fn(client);
  } finally { await client.disconnect(); }
}

/** Restrict delivery to groups already joined by the account. Never join automatically. */
export async function findJoinedGroup(client: TelegramClient, reference: string) {
  const normalized = reference.trim().replace(/^https?:\/\/(?:www\.)?t\.me\//i, "").replace(/^@/, "").toLowerCase();
  for await (const dialog of client.iterDialogs({})) {
    if (!dialog.isGroup || !dialog.entity) continue;
    const entity = dialog.entity as { username?: string };
    if ((dialog.id && dialog.id.toString() === normalized) || (entity.username && entity.username.toLowerCase() === normalized)) return dialog;
  }
  throw new Error("Guruh topilmadi. Avval shaxsiy akkauntingiz guruhga a’zo ekanini va manzilini tekshiring.");
}
