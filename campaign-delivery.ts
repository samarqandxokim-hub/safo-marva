import { findJoinedGroup, personalMode, withPersonalClient } from "@/lib/personal-telegram";
import { db } from "@/db";
import { campaigns, channels, deliveries } from "@/db/schema";
import { sendTelegramMessage } from "@/lib/telegram";
import { inArray, sql } from "drizzle-orm";

type Campaign = typeof campaigns.$inferSelect;

export async function deliverCampaign(campaign: Campaign) {
  if (!personalMode() && !process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    throw new Error("Telegram bot token sozlanmagan. Haqiqiy e’lon yuborilmadi.");
  }

  const targetIds = [...new Set(campaign.targetIds)];
  const foundChannels = targetIds.length
    ? await db.select().from(channels).where(inArray(channels.id, targetIds))
    : [];
  const channelById = new Map(foundChannels.map((channel) => [channel.id, channel]));
  let sent = 0;
  let failed = 0;

  for (const channelId of targetIds) {
    const channel = channelById.get(channelId);
    if (!channel || !channel.active) {
      const message = "Kanal topilmadi yoki vaqtincha o‘chirilgan.";
      await db.insert(deliveries).values({
        campaignId: campaign.id,
        channelId: null,
        channelTitle: channel?.title ?? `Kanal #${channelId}`,
        status: "failed",
        error: message,
      });
      failed += 1;
      continue;
    }

    try {
      const message = personalMode()
        ? await withPersonalClient(async (client) => {
            const group = await findJoinedGroup(client, channel.chatId);
            const sent = await group.send({ message: campaign.body, parseMode: undefined });
            return { message_id: sent.id };
          })
        : await sendTelegramMessage(channel.chatId, campaign.body);
      await db.insert(deliveries).values({
        campaignId: campaign.id,
        channelId: channel.id,
        channelTitle: channel.title,
        status: "sent",
        telegramMessageId: String(message.message_id),
      });
      sent += 1;
    } catch (error) {
      await db.insert(deliveries).values({
        campaignId: campaign.id,
        channelId: channel.id,
        channelTitle: channel.title,
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 2_000) : "Telegram yuborishda xatolik.",
      });
      failed += 1;
    }
  }

  if (sent > 0) {
    await db
      .update(campaigns)
      .set({ sentCount: sql`${campaigns.sentCount} + ${sent}` })
      .where(sql`${campaigns.id} = ${campaign.id}`);
  }

  return { sent, failed, total: targetIds.length };
}
