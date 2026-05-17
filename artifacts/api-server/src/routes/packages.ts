import { Router, type IRouter } from "express";
import { db, packagesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { ListPackagesQueryParams, ListPackagesResponse, ListCountriesResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function getMarkupPercent(): Promise<number> {
  const { siteConfigTable } = await import("@workspace/db");
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "markup_percent"));
  return row ? parseInt(row.value, 10) : 30;
}

// Country flag emoji helper
function countryFlag(locationCode: string): string {
  const code = locationCode.toUpperCase().replace(/[^A-Z]/g, "");
  if (code.length !== 2) return "";
  const offset = 0x1F1E6;
  return String.fromCodePoint(offset + code.charCodeAt(0) - 65) +
         String.fromCodePoint(offset + code.charCodeAt(1) - 65);
}

router.get("/packages", async (req, res): Promise<void> => {
  const query = ListPackagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const markupPercent = await getMarkupPercent();
  const { locationCode, duration, sort } = query.data;

  let dbQuery = db.select().from(packagesTable).where(eq(packagesTable.isActive, "true"));

  const rows = await dbQuery;

  let filtered = rows.filter(p => {
    if (locationCode && p.locationCode !== locationCode) return false;
    if (duration) {
      const durationMap: Record<string, number> = { "7": 7, "15": 15, "30": 30 };
      if (durationMap[duration] && p.durationDays !== durationMap[duration]) return false;
    }
    return true;
  });

  let result = filtered.map(p => {
    const basePrice = parseFloat(p.basePriceUsd);
    const retailPrice = basePrice * (1 + markupPercent / 100);
    const dataGb = parseFloat(p.dataGb);
    const valueScore = dataGb > 0 ? dataGb / retailPrice : 0;
    return {
      packageCode: p.packageCode,
      name: p.name,
      locationCode: p.locationCode,
      locationName: p.locationName,
      dataGb,
      durationDays: p.durationDays,
      priceUsd: Math.round(retailPrice * 100) / 100,
      retailPriceUsd: parseFloat(p.retailPriceUsd),
      flagEmoji: p.flagEmoji || countryFlag(p.locationCode),
      valueScore: Math.round(valueScore * 100) / 100,
    };
  });

  if (sort === "price_asc") {
    result.sort((a, b) => a.priceUsd - b.priceUsd);
  } else if (sort === "gb_asc") {
    result.sort((a, b) => a.dataGb - b.dataGb);
  } else if (sort === "value_desc") {
    result.sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0));
  } else {
    result.sort((a, b) => a.priceUsd - b.priceUsd);
  }

  res.json(ListPackagesResponse.parse(result));
});

router.get("/packages/countries", async (req, res): Promise<void> => {
  const markupPercent = await getMarkupPercent();
  const rows = await db.select().from(packagesTable).where(eq(packagesTable.isActive, "true"));

  const countryMap = new Map<string, { locationCode: string; locationName: string; flagEmoji: string; count: number; minPrice: number }>();

  for (const p of rows) {
    const basePrice = parseFloat(p.basePriceUsd);
    const retailPrice = basePrice * (1 + markupPercent / 100);
    const existing = countryMap.get(p.locationCode);
    if (existing) {
      existing.count++;
      if (retailPrice < existing.minPrice) existing.minPrice = retailPrice;
    } else {
      countryMap.set(p.locationCode, {
        locationCode: p.locationCode,
        locationName: p.locationName,
        flagEmoji: p.flagEmoji || countryFlag(p.locationCode),
        count: 1,
        minPrice: retailPrice,
      });
    }
  }

  const countries = Array.from(countryMap.values()).map(c => ({
    locationCode: c.locationCode,
    locationName: c.locationName,
    flagEmoji: c.flagEmoji,
    packageCount: c.count,
    minPriceUsd: Math.round(c.minPrice * 100) / 100,
  })).sort((a, b) => a.locationName.localeCompare(b.locationName));

  res.json(ListCountriesResponse.parse(countries));
});

export default router;
