import type { NextRequest } from "next/server";

// Extrai tudo que dá pra capturar no lado do servidor a partir da requisição:
// IP, geolocalização (headers automáticos da Vercel) e todos os cabeçalhos.
export function collectServerData(req: NextRequest) {
  const h = req.headers;

  const headers: Record<string, string> = {};
  h.forEach((value, key) => {
    headers[key] = value;
  });

  const ip =
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    (req as any).ip ||
    null;

  const geo = {
    country: h.get("x-vercel-ip-country"),
    countryRegion: h.get("x-vercel-ip-country-region"),
    city: safeDecode(h.get("x-vercel-ip-city")),
    latitude: h.get("x-vercel-ip-latitude"),
    longitude: h.get("x-vercel-ip-longitude"),
    timezone: h.get("x-vercel-ip-timezone"),
    postalCode: h.get("x-vercel-ip-postal-code"),
    asn: h.get("x-vercel-ip-as-number"),
  };

  return {
    ip,
    geo,
    userAgent: h.get("user-agent"),
    acceptLanguage: h.get("accept-language"),
    referer: h.get("referer"),
    headers,
    serverTime: new Date().toISOString(),
  };
}

function safeDecode(v: string | null) {
  if (!v) return v;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}
