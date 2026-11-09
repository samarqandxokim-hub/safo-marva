import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  chatId: varchar("chat_id", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 180 }),
  type: varchar("type", { length: 32 }).notNull().default("channel"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  targetIds: jsonb("target_ids").$type<number[]>().notNull().default([]),
  startTime: varchar("start_time", { length: 5 }).notNull().default("12:00"),
  endTime: varchar("end_time", { length: 5 }).notNull().default("23:59"),
  postsPerDay: integer("posts_per_day").notNull().default(5),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Tashkent"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  channelId: integer("channel_id").references(() => channels.id, { onDelete: "set null" }),
  channelTitle: varchar("channel_title", { length: 180 }).notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  telegramMessageId: varchar("telegram_message_id", { length: 80 }),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const botSessions = pgTable("bot_sessions", {
  telegramUserId: varchar("telegram_user_id", { length: 40 }).primaryKey(),
  step: varchar("step", { length: 48 }).notNull().default("idle"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
