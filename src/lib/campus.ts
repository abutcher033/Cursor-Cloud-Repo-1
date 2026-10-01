export type CampusInfo = {
  id: string;
  label: string;
  address?: string;
};

export const CAMPUSES: Record<string, CampusInfo> = {
  "westminster-ag-center": {
    id: "westminster-ag-center",
    label: "Westminster Ag Center",
    address: "706 Agriculture Dr, Westminster, MD 21157",
  },
};

export function campusLabel(campusId: string | null | undefined): string | null {
  if (!campusId) return null;
  return CAMPUSES[campusId]?.label ?? campusId;
}

export type CampusCluster<T extends { id: string; campusId?: string | null }> = {
  campusId: string;
  label: string;
  items: T[];
};

/** Group ranked items that share a campus; singles stay ungrouped. */
export function clusterByCampus<T extends { id: string; campusId?: string | null; score?: number }>(
  items: T[],
): { clusters: CampusCluster<T>[]; singles: T[] } {
  const buckets = new Map<string, T[]>();
  const singles: T[] = [];
  for (const item of items) {
    if (item.campusId) {
      const arr = buckets.get(item.campusId) ?? [];
      arr.push(item);
      buckets.set(item.campusId, arr);
    } else {
      singles.push(item);
    }
  }
  const clusters: CampusCluster<T>[] = [];
  for (const [campusId, group] of buckets) {
    if (group.length >= 2) {
      group.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      clusters.push({
        campusId,
        label: campusLabel(campusId) || campusId,
        items: group,
      });
    } else {
      singles.push(...group);
    }
  }
  // Keep cluster order by best score inside
  clusters.sort((a, b) => (b.items[0]?.score ?? 0) - (a.items[0]?.score ?? 0));
  return { clusters, singles };
}
