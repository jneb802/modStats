import type { UsageSummary } from "@/lib/analytics";
import type { DiscordEmbed, EmbedField } from "@/lib/discord";
import type { ModMetric } from "@/lib/metrics";

// Maps Thunderstore "{author}.{name}" to BepInEx modId when they differ
const THUNDERSTORE_TO_MODID: Record<string, string> = {
  "warpalicious.Procedural_Roads": "warpalicious.ProceduralRoads",
};

function formatVersionCounts(versions: { version: string; users: number }[]): string {
  if (versions.length === 0) {
    return "No version data";
  }

  return versions
    .map((v) => `${v.version}: ${v.users.toLocaleString()} ${v.users === 1 ? "user" : "users"}`)
    .join(" · ");
}

export function buildCombinedEmbed(
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

  if (usage?.bepInExVersions?.length) {
    fields.push({
      name: "BepInEx Versions",
      value: formatVersionCounts(usage.bepInExVersions),
      inline: false,
    });
  }

  for (const mod of downloads) {
    totalDownloads += mod.change;
    const thunderstoreId = `${mod.author}.${mod.name}`;
    const modId = THUNDERSTORE_TO_MODID[thunderstoreId] ?? thunderstoreId;
    const usageMod = usageById.get(modId);
    const displayName = usageMod?.displayName ?? mod.name;

    const valueLines = [`Downloads: +${mod.change.toLocaleString()}`];
    if (usageMod) {
      valueLines.push(`Unique users: ${usageMod.dau.toLocaleString()}`);
      valueLines.push(`Mod versions: ${formatVersionCounts(usageMod.versions)}`);
      usageById.delete(modId);
    }

    fields.push({ name: displayName, value: valueLines.join("\n"), inline: true });
  }

  // Add any usage-only mods not matched by downloads
  for (const [, mod] of usageById) {
    fields.push({
      name: mod.displayName,
      value: [
        `Unique users: ${mod.dau.toLocaleString()}`,
        `Mod versions: ${formatVersionCounts(mod.versions)}`,
      ].join("\n"),
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
