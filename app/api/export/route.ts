import { NextRequest, NextResponse } from "next/server";
import { listHits } from "@/lib/store";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Baixa o relatório completo de acessos.
//   /api/export            -> JSON
//   /api/export?format=csv -> CSV
export async function GET(req: NextRequest) {
  if (!isAuthed()) {
    return new NextResponse("Não autorizado", { status: 401 });
  }
  const format = req.nextUrl.searchParams.get("format") || "json";
  const hits = await listHits(5000);

  if (format === "csv") {
    const csv = toCsv(hits);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="acessos.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(hits, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="acessos.json"`,
    },
  });
}

function toCsv(hits: any[]): string {
  const cols = [
    "ts",
    "js",
    "ip",
    "country",
    "region",
    "city",
    "latitude",
    "longitude",
    "timezone",
    "os",
    "osVersion",
    "browser",
    "userAgent",
    "language",
    "screen",
    "referrer",
  ];
  const rows = hits.map((h) => {
    const s = h.server || {};
    const g = s.geo || {};
    const c = h.client || {};
    const ua = c.uaHints || {};
    return [
      h.ts,
      h.js,
      s.ip,
      g.country,
      g.countryRegion,
      g.city,
      g.latitude,
      g.longitude,
      c.timezone || g.timezone,
      ua.platform,
      ua.platformVersion,
      c.vendor,
      c.userAgent || s.userAgent,
      c.language,
      c.screen ? `${c.screen.width}x${c.screen.height}` : "",
      c.referrer || s.referer,
    ]
      .map(csvCell)
      .join(",");
  });
  return [cols.join(","), ...rows].join("\n");
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
