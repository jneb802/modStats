export interface UsageVersion {
  version: string;
  users: number;
}

export interface BepInExVersion {
  version: string;
  users: number;
}

export interface UsageMod {
  modId: string;
  displayName: string;
  dau: number;
  versions: UsageVersion[];
}

export interface UsageSummary {
  date: string;
  totalUniqueUsers: number;
  bepInExVersions?: BepInExVersion[];
  mods: UsageMod[];
}

export async function fetchUsageSummary(): Promise<UsageSummary | null> {
  const url = process.env.MOD_ANALYTICS_URL;
  const apiKey = process.env.MOD_ANALYTICS_API_KEY;
  if (!url || !apiKey) {
    console.log("MOD_ANALYTICS_URL or MOD_ANALYTICS_API_KEY not set");
    return null;
  }

  try {
    const response = await fetch(`${url}/api/daily-summary`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.log(`Analytics API error: ${response.status}`);
      return null;
    }
    return (await response.json()) as UsageSummary;
  } catch (e) {
    console.log("Failed to fetch usage summary:", e);
    return null;
  }
}
