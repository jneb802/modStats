import { getAllMods, getDownloadsForDate } from "@/db";
import { sendWebhookMessage } from "./discord";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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

  const formattedDate = formatDate(
    new Date(now.getTime() - 24 * 60 * 60 * 1000)
  );
  let message = `Summary of mod downloads for ${formattedDate}\n`;

  if (metricsData.length === 0) {
    message += "No download data available for comparison.";
  } else {
    for (const mod of metricsData) {
      message += `${mod.name}: ${mod.change}\n`;
    }
  }

  await sendWebhookMessage(message);
  return metricsData;
}
