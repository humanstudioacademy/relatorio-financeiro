import { listHits, storageInfo } from "@/lib/store";
import { isAuthed } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Painel interno com todos os acessos registrados. Protegido por senha
// (ADMIN_PASSWORD no ambiente; padrão de teste: "relatorio2026").
export default async function AdminPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | undefined };
}) {
  if (!isAuthed()) {
    return <LoginForm erro={searchParams.erro === "1"} />;
  }

  const hits = await listHits(5000);
  const info = storageInfo();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", color: "#111", maxWidth: 1100, margin: "0 auto" }}>
      <a href="/api/login" style={{ float: "right", fontSize: 13, color: "#c00", textDecoration: "none" }}>
        Sair
      </a>
      <h1 style={{ marginBottom: 4 }}>Relatório de acessos</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        {hits.length} registro(s) · Armazenamento:{" "}
        {info.kv ? "Vercel KV / Upstash (persistente) ✅" : "arquivo local ⚠️"}
      </p>

      {!info.kv && (
        <div
          style={{
            background: "#fff8e1",
            border: "1px solid #f0d000",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 13,
            color: "#6a5300",
            marginBottom: 8,
          }}
        >
          <strong>Atenção:</strong> não há banco persistente conectado. Em
          produção (Vercel) os acessos <strong>não são salvos</strong> de forma
          confiável, pois o armazenamento em arquivo é temporário e não é
          compartilhado entre as funções serverless. Conecte um{" "}
          <strong>Upstash Redis / Vercel KV</strong> ao projeto para persistir e
          ver os dados aqui.
        </div>
      )}

      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        <a href="/api/export?format=json" style={btn}>⬇ Baixar JSON</a>
        <a href="/api/export?format=csv" style={btn}>⬇ Baixar CSV</a>
      </div>

      {hits.length === 0 && (
        <p style={{ color: "#888", marginTop: 24 }}>
          Nenhum acesso ainda. Abra <code>/relatorio_jul26.pdf</code> para gerar um registro.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {hits.map((h: any) => (
          <HitCard key={h.id} h={h} />
        ))}
      </div>
    </main>
  );
}

function HitCard({ h }: { h: any }) {
  const s = h.server || {};
  const g = s.geo || {};
  const c = h.client || {};
  const ua = c.uaHints || {};
  const a = h.analysis || {};
  const nv = c.navigator || {};
  const sc = c.screen || {};

  const local = [g.city, g.countryRegion, g.country].filter(Boolean).join(", ") || "local n/d";
  const so = [ua.platform, ua.platformVersion].filter(Boolean).join(" ") || nv.platform || "SO n/d";
  const browser = brand(ua) || browserFromUA(nv.userAgent || s.userAgent);

  return (
    <details style={card}>
      <summary style={summary}>
        <span style={{ fontWeight: 600 }}>{fmt(h.ts)}</span>
        <span style={pill}>{h.js ? "JS on" : "JS off"}</span>
        <span>IP: {s.ip || "n/d"}</span>
        <span>{local}</span>
        <span>{so}</span>
        <span>{browser}</span>
        {a.vpnSuspeita && <span style={vpn}>⚠ VPN suspeita</span>}
      </summary>

      <div style={{ padding: "4px 16px 16px" }}>
        <Section title="📍 Localização">
          <Row k="País" v={g.country} />
          <Row k="Estado/Região" v={g.countryRegion} />
          <Row k="Cidade" v={g.city} />
          <Row k="CEP" v={g.postalCode} />
          <Row k="Coordenadas" v={g.latitude ? `${g.latitude}, ${g.longitude}` : null} />
          <Row k="Fuso (IP)" v={g.timezone} />
          <Row k="Fuso (navegador)" v={c.time?.timezone} />
          {g.latitude && (
            <Row k="Mapa" v={<a href={`https://www.google.com/maps?q=${g.latitude},${g.longitude}`} target="_blank">abrir no Google Maps</a>} />
          )}
        </Section>

        <Section title="🌐 Rede & VPN">
          <Row k="IP (servidor)" v={s.ip} />
          <Row k="ASN / provedor" v={g.asn} />
          <Row k="IPs públicos (WebRTC)" v={arr(a.ipsPublicosWebRTC)} />
          <Row k="IPs locais (WebRTC)" v={arr(a.ipsLocaisWebRTC)} />
          <Row k="VPN/proxy suspeito" v={a.vpnSuspeita ? "SIM ⚠" : "não detectado"} />
          <Row k="Sinais" v={arr(a.signals)} />
          <Row k="Conexão" v={c.connection ? `${c.connection.effectiveType || ""} ${c.connection.downlink ? c.connection.downlink + "Mbps" : ""} rtt ${c.connection.rtt ?? "?"}ms` : null} />
          <Row k="Online" v={yn(nv.onLine)} />
        </Section>

        <Section title="💻 Sistema & Dispositivo">
          <Row k="Sistema operacional" v={so} />
          <Row k="Arquitetura" v={[ua.architecture, ua.bitness && ua.bitness + "-bit"].filter(Boolean).join(" ")} />
          <Row k="Modelo" v={ua.model} />
          <Row k="Plataforma" v={nv.platform} />
          <Row k="Memória (RAM)" v={nv.deviceMemoryGB ? nv.deviceMemoryGB + " GB" : null} />
          <Row k="Núcleos de CPU" v={nv.hardwareConcurrency} />
          <Row k="Toque (max points)" v={nv.maxTouchPoints} />
          <Row k="Bateria" v={c.battery ? `${Math.round(c.battery.level * 100)}% ${c.battery.charging ? "(carregando)" : ""}` : null} />
          <Row k="GPU (WebGL)" v={c.webgl?.unmaskedRenderer} />
        </Section>

        <Section title="🧭 Navegador">
          <Row k="Navegador" v={browser} />
          <Row k="User-Agent" v={nv.userAgent || s.userAgent} />
          <Row k="Idioma" v={nv.language} />
          <Row k="Idiomas" v={arr(nv.languages)} />
          <Row k="Cookies habilitados" v={yn(nv.cookieEnabled)} />
          <Row k="Do Not Track" v={nv.doNotTrack} />
          <Row k="WebDriver (automação)" v={yn(nv.webdriver)} />
          <Row k="Referrer" v={c.page?.referrer} />
          <Row k="Plugins" v={c.plugins?.length ? c.plugins.map((p: any) => p.name).join(", ") : null} />
        </Section>

        <Section title="🖥️ Tela & Monitores">
          <Row k="Resolução" v={sc.width ? `${sc.width} × ${sc.height}` : null} />
          <Row k="Área útil" v={sc.availWidth ? `${sc.availWidth} × ${sc.availHeight}` : null} />
          <Row k="Profundidade de cor" v={sc.colorDepth ? sc.colorDepth + " bits" : null} />
          <Row k="Pixel ratio" v={sc.devicePixelRatio} />
          <Row k="Multi-monitor" v={sc.isExtended === null ? null : yn(sc.isExtended)} />
          <Row k="Orientação" v={sc.orientationType} />
          <Row k="Janela" v={c.window ? `${c.window.innerWidth} × ${c.window.innerHeight}` : null} />
          <Row k="Tema" v={c.mediaFeatures?.colorScheme} />
        </Section>

        <Section title="🍪 Cookies & Armazenamento">
          <Row k="Cookies" v={arr(c.cookies?.list)} />
          <Row k="localStorage" v={c.storage?.localStorage ? Object.keys(c.storage.localStorage).join(", ") || "(vazio)" : null} />
          <Row k="sessionStorage" v={c.storage?.sessionStorage ? Object.keys(c.storage.sessionStorage).join(", ") || "(vazio)" : null} />
          <Row k="Uso de storage" v={c.storageEstimate ? `${fmtBytes(c.storageEstimate.usage)} / ${fmtBytes(c.storageEstimate.quota)}` : null} />
        </Section>

        <Section title="🔐 Permissões & Fingerprints">
          <Row k="Permissões" v={c.permissions ? Object.entries(c.permissions).map(([k, v]) => `${k}: ${v}`).join(" · ") : null} />
          <Row k="Canvas fingerprint" v={c.canvasFingerprint?.hash} />
          <Row k="Áudio fingerprint" v={c.audio?.hash} />
          <Row k="Fontes detectadas" v={arr(c.fonts)} />
          <Row k="Vozes TTS" v={c.voices?.length ? c.voices.length + " voz(es)" : null} />
        </Section>

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: 13, color: "#555" }}>
            Ver todos os dados brutos (completo)
          </summary>
          <div style={rawBox}>
            <Tree data={h} />
          </div>
        </details>
      </div>
    </details>
  );
}

// Renderiza qualquer objeto/array de forma legível e recursiva.
function Tree({ data, level = 0 }: { data: any; level?: number }) {
  if (data === null || data === undefined) return <span style={muted}>—</span>;
  if (typeof data !== "object") return <span>{String(data)}</span>;

  const entries = Array.isArray(data)
    ? data.map((v, i) => [String(i), v] as [string, any])
    : Object.entries(data);

  if (entries.length === 0) return <span style={muted}>(vazio)</span>;

  return (
    <div style={{ marginLeft: level ? 14 : 0 }}>
      {entries.map(([k, v]) => {
        const isObj = v && typeof v === "object";
        return (
          <div key={k} style={{ padding: "1px 0" }}>
            <span style={{ color: "#0a5", fontWeight: 600 }}>{k}</span>
            {isObj ? (
              <Tree data={v} level={level + 1} />
            ) : (
              <span>: {v === null || v === undefined ? "—" : String(v)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "#333" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "2px 12px", fontSize: 13 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  const empty = v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  return (
    <>
      <div style={{ color: "#777" }}>{k}</div>
      <div style={{ wordBreak: "break-word" }}>{empty ? <span style={muted}>—</span> : v}</div>
    </>
  );
}

function LoginForm({ erro }: { erro: boolean }) {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", background: "#f4f4f5" }}>
      <form method="POST" action="/api/login" style={{ background: "#fff", padding: 32, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", width: 300 }}>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Área restrita</h2>
        <input type="password" name="password" placeholder="Senha" autoFocus
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 15, border: "1px solid #ccc", borderRadius: 6, marginBottom: 12 }} />
        {erro && <p style={{ color: "#c00", fontSize: 13, margin: "0 0 12px" }}>Senha incorreta.</p>}
        <button type="submit" style={{ width: "100%", padding: "10px 12px", fontSize: 15, background: "#111", color: "#fff", border: 0, borderRadius: 6, cursor: "pointer" }}>
          Entrar
        </button>
      </form>
    </main>
  );
}

// ------- estilos -------
const btn: React.CSSProperties = { background: "#111", color: "#fff", padding: "8px 14px", borderRadius: 6, textDecoration: "none", fontSize: 14 };
const card: React.CSSProperties = { border: "1px solid #e4e4e7", borderRadius: 8, background: "#fff" };
const summary: React.CSSProperties = { cursor: "pointer", padding: "10px 14px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 13 };
const pill: React.CSSProperties = { background: "#eef", color: "#334", borderRadius: 10, padding: "1px 8px", fontSize: 12 };
const vpn: React.CSSProperties = { background: "#fee", color: "#b00", borderRadius: 10, padding: "1px 8px", fontSize: 12, fontWeight: 600 };
const muted: React.CSSProperties = { color: "#bbb" };
const rawBox: React.CSSProperties = { marginTop: 8, padding: 12, background: "#f6f8fa", border: "1px solid #e4e4e7", borderRadius: 6, fontSize: 12, fontFamily: "ui-monospace, Menlo, monospace", overflowX: "auto" };

// ------- helpers -------
function fmt(ts: string) {
  try { return new Date(ts).toLocaleString("pt-BR"); } catch { return ts; }
}
function yn(v: any) {
  if (v === true) return "sim";
  if (v === false) return "não";
  return v;
}
function arr(v: any) {
  if (!Array.isArray(v) || v.length === 0) return null;
  return v.join(", ");
}
function fmtBytes(n?: number) {
  if (!n) return "?";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}
function brand(ua: any) {
  const list = ua?.fullVersionList || ua?.brands;
  if (!Array.isArray(list)) return null;
  const real = list.find((b: any) => !/Not.?A.?Brand/i.test(b.brand));
  return real ? `${real.brand} ${real.version || ""}`.trim() : null;
}
function browserFromUA(ua?: string) {
  if (!ua) return "navegador n/d";
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "navegador n/d";
}
