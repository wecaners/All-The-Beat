import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { regions } from "@/db/schema";

export type Region = { id: number; name: string; shortName: string };

export async function listRegions(): Promise<Region[]> {
  return getDb()
    .select({ id: regions.id, name: regions.name, shortName: regions.shortName })
    .from(regions)
    .orderBy(asc(regions.sortOrder));
}
