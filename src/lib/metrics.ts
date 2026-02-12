import { getAllMods, getDownloadsForDate } from "@/db";
import { sendEmbed } from "./discord";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface ModMetric {
  name: string;
  author: string;
  change: number;
}

export async function buildDailyMetrics(): Promise<ModMetric[]> {
  const now = new Date();
  const today = toDateString(now);
  const yesterday = toDateString(
    new Date(now.getTime() - 24 * 60 * 60 * 1000)
  );

  const mods = await getAllMods();
  const metricsData: ModMetric[] = [];

  for (const mod of mods) {
    const yesterdayDownloads = await getDownloadsForDate(mod.id, yesterday);
    const todayDownloads = await getDownloadsForDate(mod.id, today);

    if (yesterdayDownloads !== null && todayDownloads !== null) {
      metricsData.push({
        name: mod.name,
        author: mod.author,
        change: todayDownloads - yesterdayDownloads,
      });
    }
  }

  const fields =
    metricsData.length > 0
      ? metricsData
          .sort((a, b) => b.change - a.change)
          .map((mod) => ({
            name: mod.name,
            value: `+${mod.change.toLocaleString()} downloads`,
            inline: true,
          }))
      : [
          {
            name: "No data",
            value: "No download data available for comparison.",
            inline: false,
          },
        ];

  const totalChange = metricsData.reduce((sum, m) => sum + m.change, 0);

  await sendEmbed({
    title: `Daily Download Report - ${yesterday}`,
    color: 0x5865f2,
    fields,
    footer: { text: `Total new downloads: +${totalChange.toLocaleString()}` },
    timestamp: new Date().toISOString(),
  });

  return metricsData;
}
