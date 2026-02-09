import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { mods, modDownloads } from "./schema";

function getDb() {
  const sql = neon(process.env.POSTGRES_URL!);
  return drizzle(sql);
}

export async function getAllMods() {
  const db = getDb();
  return db.select().from(mods);
}

export async function downloadEntryExists(
  modId: number,
  date: string
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select()
    .from(modDownloads)
    .where(and(eq(modDownloads.modId, modId), eq(modDownloads.date, date)))
    .limit(1);
  return rows.length > 0;
}

export async function addDownloadEntry(
  modId: number,
  date: string,
  totalDownloads: number
) {
  const db = getDb();
  await db.insert(modDownloads).values({ modId, date, totalDownloads });
}

export async function getDownloadsForDate(
  modId: number,
  date: string
): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .select({ totalDownloads: modDownloads.totalDownloads })
    .from(modDownloads)
    .where(and(eq(modDownloads.modId, modId), eq(modDownloads.date, date)))
    .limit(1);
  return rows.length > 0 ? rows[0].totalDownloads : null;
}
