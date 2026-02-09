interface PackageMetrics {
  downloads: number;
}

export async function getPackageMetrics(
  namespace: string,
  name: string
): Promise<PackageMetrics | null> {
  const url = `https://thunderstore.io/api/v1/package-metrics/${namespace}/${name}/`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.log(`Thunderstore API error ${response.status} for ${namespace}/${name}`);
      return null;
    }
    return (await response.json()) as PackageMetrics;
  } catch (e) {
    console.log(`Error fetching package metrics for ${namespace}/${name}:`, e);
    return null;
  }
}
