import {
  pgTable,
  serial,
  varchar,
  integer,
  date,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const mods = pgTable(
  "mods",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    author: varchar("author", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    host: varchar("host", { length: 255 }).notNull().default("thunderstore"),
  },
  (t) => [unique("unique_mod_author_name_host").on(t.author, t.name, t.host)]
);

export const modDownloads = pgTable(
  "mod_downloads",
  {
    id: serial("id").primaryKey(),
    modId: integer("mod_id")
      .notNull()
      .references(() => mods.id),
    date: date("date").notNull(),
    totalDownloads: integer("total_downloads").notNull(),
  },
  (t) => [unique("unique_mod_date").on(t.modId, t.date)]
);
