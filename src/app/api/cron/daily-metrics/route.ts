import { NextResponse } from "next/server";
import { getAllMods, downloadEntryExists, addDownloadEntry } from "@/db";
import { getPackageMetrics } from "@/lib/thunderstore";
import { getDownloadMetrics, type ModMetric } from "@/lib/metrics";
import { fetchUsageSummary, type UsageSummary } from "@/lib/analytics";
import { sendEmbed, type DiscordEmbed, type EmbedField } from "@/lib/discord";

export const maxDuration = 60;

function buildCombinedEmbed(
  date: string,
  downloads: ModMetric[],
  usage: UsageSummary | null
): DiscordEmbed {
  // Key by modId (e.g. "warpalicious.More_World_Locations_AIO") to match across datasets
  const usageById = new Map<string, UsageSummary["mods"][number]>();
  if (usage) {
    for (const mod of usage.mods) {
      usageById.set(mod.modId, mod);
    }
  }

  const fields: EmbedField[] = [];
  let totalDownloads = 0;

  for (const mod of downloads) {
    totalDownloads += mod.change;
    const modId = `${mod.author}.${mod.name}`;
    const usageMod = usageById.get(modId);
    const displayName = usageMod?.displayName ?? mod.name;

    let value = `+${mod.change.toLocaleString()} downloads`;
    if (usageMod) {
      const versionLines = usageMod.versions
        .map((v) => `v${v.version}: ${v.users}`)
        .join(" · ");
      value += ` · ${usageMod.dau} unique users\n${versionLines}`;
      usageById.delete(modId);
    }

    fields.push({ name: displayName, value, inline: true });
  }

  // Add any usage-only mods not matched by downloads
  for (const [, mod] of usageById) {
    const versionLines = mod.versions
      .map((v) => `v${v.version}: ${v.users}`)
      .join(" · ");
    fields.push({
      name: mod.displayName,
      value: `${mod.dau} unique users\n${versionLines}`,
      inline: true,
    });
  }

  if (fields.length === 0) {
    fields.push({
      name: "No data",
      value: "No analytics data available.",
      inline: false,
    });
  }

  const footerParts: string[] = [];
  footerParts.push(`+${totalDownloads.toLocaleString()} downloads`);
  if (usage) {
    footerParts.push(`${usage.totalUniqueUsers} unique users`);
  }

  return {
    title: `Daily Analytics Report — ${date}`,
    color: 0x5865f2,
    fields,
    footer: { text: footerParts.join(" · ") },
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const startTime = new Date().toISOString();
    console.log(`[start] ${startTime} — daily metrics run`);

    const mods = await getAllMods();
    if (mods.length === 0) {
      console.log("No mods found in the database.");
      return NextResponse.json({ message: "No mods found" });
    }

    const today = new Date().toISOString().slice(0, 10);
    console.log(`Found ${mods.length} mods for ${today}`);

    // Fetch Thunderstore metrics in parallel
    const results = await Promise.allSettled(
      mods.map(async (mod) => {
        console.log(`--- ${mod.author}/${mod.name} ---`);

        if (await downloadEntryExists(mod.id, today)) {
          console.log(`  Download data for ${today} already exists, skipping`);
          return { mod: mod.name, status: "skipped" };
        }

        const response = await getPackageMetrics(mod.author, mod.name);
        if (!response) {
          console.log(`  Failed to get metrics for ${mod.author}/${mod.name}`);
          return { mod: mod.name, status: "failed" };
        }

        await addDownloadEntry(mod.id, today, response.downloads);
        console.log(
          `  Added download entry: ${response.downloads.toLocaleString()} downloads`
        );
        return { mod: mod.name, status: "added", downloads: response.downloads };
      })
    );

    // Build combined analytics embed
    console.log("--- Building combined analytics report ---");
    const [downloadData, usageSummary] = await Promise.all([
      getDownloadMetrics(),
      fetchUsageSummary(),
    ]);

    if (!usageSummary) {
      console.log("Usage data unavailable, sending download data only");
    }

    const embed = buildCombinedEmbed(
      downloadData.date,
      downloadData.metrics,
      usageSummary
    );

    await sendEmbed(embed);
    console.log(`Sent combined analytics for ${downloadData.metrics.length} mods to Discord`);

    const endTime = new Date().toISOString();
    console.log(`[done] ${endTime} — success`);

    return NextResponse.json({
      message: "Daily metrics completed",
      modsProcessed: mods.length,
      results: results.map((r) =>
        r.status === "fulfilled" ? r.value : { status: "error", reason: String(r.reason) }
      ),
    });
  } catch (e) {
    console.error("[error]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
