import { findJoinedGroup, personalMode, withPersonalClient } from "@/lib/personal-telegram";
import { db } from "@/db";
import { channels } from "@/db/schema";
import { normalizeChatReference, telegramApi, type TelegramChat, type TelegramMember } from "@/lib/telegram";

export async function addChannel(input: { title?: string; chatReference: string; fallbackType?: string }) {
  const chatId = normalizeChatReference(input.chatReference);
  let title = input.title?.trim().slice(0, 180) || chatId;
  let username: string | null = chatId.startsWith("@") ? chatId.slice(1) : null;
  let type = input.fallbackType === "group" ? "group" : "channel";

  if (personalMode()) {
    if (input.fallbackType !== "group") throw new Error("Shaxsiy akkaunt rejimida faqat guruh qo‘shish mumkin.");
    const dialog = await withPersonalClient((client) => findJoinedGroup(client, chatId));
    title = dialog.title || title;
    type = "group";
  } else if (process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    const chat = await telegramApi<TelegramChat>("getChat", { chat_id: chatId });
    if (!chat.title || !["channel", "group", "supergroup"].includes(chat.type)) {
      throw new Error("Faqat Telegram kanal yoki guruhini qo‘shish mumkin.");
    }
    const me = await telegramApi<{ id: number }>("getMe");
    const member = await telegramApi<TelegramMember>("getChatMember", { chat_id: chat.id, user_id: me.id });
    if (member.status === "left" || member.status === "kicked") {
      throw new Error("Avval botni shu kanal yoki guruhga qo‘shing.");
    }
    if (chat.type === "channel" && (member.status !== "administrator" && member.status !== "creator" || member.can_post_messages === false)) {
      throw new Error("Kanalga botni administrator qilib qo‘shing va xabar yuborish huquqini bering.");
    }
    if (chat.type !== "channel" && member.status === "restricted" && member.can_send_messages === false) {
      throw new Error("Botda guruhga xabar yuborish huquqi yo‘q.");
    }
    title = chat.title;
    username = chat.username ?? null;
    type = chat.type;
  }

  const [channel] = await db
    .insert(channels)
    .values({ title, chatId, username, type })
    .onConflictDoUpdate({
      target: channels.chatId,
      set: { title, username, type, active: true },
    })
    .returning();

  return channel;
}
