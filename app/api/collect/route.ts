import { NextRequest, NextResponse } from "next/server";
import { collectServerData } from "@/lib/server-data";
import { saveHit } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recebe o fingerprint coletado no navegador e junta com os dados do servidor.
export async function POST(req: NextRequest) {
  let client: any = {};
  try {
    client = await req.json();
  } catch {
    client = { _parseError: true };
  }

  const server = collectServerData(req);
  const analysis = analyze(server, client);

  const hit = {
    id: cryptoId(),
    ts: new Date().toISOString(),
    js: true,
    analysis,
    server,
    client,
  };

  await saveHit(hit);

  // 204 sem conteúdo — nada muda para quem acessa (segue "carregando").
  return new NextResponse(null, { status: 204 });
}

// Heurística de VPN/proxy e coerência dos dados.
function analyze(server: any, client: any) {
  const signals: string[] = [];
  const geo = server?.geo || {};
  const serverIp = server?.ip;

  // IP público via WebRTC diferente do IP do servidor -> possível VPN/proxy.
  const rtcPublic: string[] = client?.webrtc?.publicIPs || [];
  const rtcMismatch =
    serverIp && rtcPublic.length > 0 && !rtcPublic.includes(serverIp);
  if (rtcMismatch) signals.push("webrtc_ip_difere_do_servidor");

  // Timezone do navegador diferente do timezone geográfico do IP.
  const clientTz = client?.time?.timezone;
  const geoTz = geo?.timezone;
  const tzMismatch = clientTz && geoTz && clientTz !== geoTz;
  if (tzMismatch) signals.push("timezone_difere_da_geo_do_ip");

  // Idioma incompatível com o país do IP (sinal fraco).
  const langs: string[] = client?.navigator?.languages || [];
  if (geo.country && langs.length) {
    const hasPt = langs.some((l) => /^pt/i.test(l));
    if (geo.country !== "BR" && geo.country !== "PT" && hasPt) {
      signals.push("idioma_pt_mas_ip_estrangeiro");
    }
  }

  return {
    vpnSuspeita: rtcMismatch || tzMismatch,
    signals,
    ipServidor: serverIp,
    ipsPublicosWebRTC: rtcPublic,
    ipsLocaisWebRTC: client?.webrtc?.localIPs || [],
    timezoneCliente: clientTz,
    timezoneGeoIP: geoTz,
  };
}

function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  }
}
