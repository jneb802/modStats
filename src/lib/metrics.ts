import { getAllMods, getDownloadsForDate } from "@/db";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface ModMetric {
  name: string;
  author: string;
  change: number;
}

export async function getDownloadMetrics(): Promise<{
  date: string;
  metrics: ModMetric[];
}> {
  const now = new Date();
  const today = toDateString(now);
  const yesterday = toDateString(
    new Date(now.getTime() - 24 * 60 * 60 * 1000)
  );

  const mods = await getAllMods();
  const metrics: ModMetric[] = [];

  for (const mod of mods) {
    const yesterdayDownloads = await getDownloadsForDate(mod.id, yesterday);
    const todayDownloads = await getDownloadsForDate(mod.id, today);

    if (yesterdayDownloads !== null && todayDownloads !== null) {
      metrics.push({
        name: mod.name,
        author: mod.author,
        change: todayDownloads - yesterdayDownloads,
      });
    }
  }

  metrics.sort((a, b) => b.change - a.change);

  return { date: yesterday, metrics };
}
