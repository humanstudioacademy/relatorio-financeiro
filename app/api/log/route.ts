import { NextRequest, NextResponse } from "next/server";
import { collectServerData } from "@/lib/server-data";
import { saveHit } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Beacon acionado pelo <noscript> — captura acessos SEM JavaScript.
// Responde com um GIF transparente de 1x1.
export async function GET(req: NextRequest) {
  const server = collectServerData(req);

  const hit = {
    id: cryptoId(),
    ts: new Date().toISOString(),
    js: false,
    via: "noscript-beacon",
    server,
    client: null,
  };

  await saveHit(hit);

  const gif = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  return new NextResponse(gif, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  }
}
