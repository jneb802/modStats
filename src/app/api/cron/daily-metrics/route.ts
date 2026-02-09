import { NextResponse } from "next/server";
import { getAllMods, downloadEntryExists, addDownloadEntry } from "@/db";
import { getPackageMetrics } from "@/lib/thunderstore";
import { buildDailyMetrics } from "@/lib/metrics";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret
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

    // Send daily metrics to Discord
    console.log("--- Sending daily metrics to Discord ---");
    const metricsData = await buildDailyMetrics();
    console.log(`Sent metrics for ${metricsData.length} mods to Discord`);

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
