// Armazenamento de acessos.
//
// Prioridade:
//   1. Supabase (Postgres via REST/PostgREST) -> persistente em produção
//   2. Arquivo local JSONL (data/acessos.jsonl) -> testes locais
//   3. console.log (sempre)                     -> Runtime Logs da Vercel
//
// Requer a tabela `acessos` no Supabase (SQL no README/instruções).
// Variáveis: SUPABASE_URL e SUPABASE_SECRET_KEY.

import fs from "fs";
import path from "path";

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SECRET_KEY;
const TABLE = "acessos";

export type Hit = Record<string, unknown> & { id: string; ts: string };

// ---------------------------------------------------------------------------
// Supabase (produção)
// ---------------------------------------------------------------------------
function supabaseEnabled() {
  return Boolean(SB_URL && SB_KEY);
}

function sbHeaders() {
  return {
    apikey: SB_KEY as string,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
  };
}

async function sbInsert(hit: Hit) {
  const res = await fetch(`${SB_URL}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: { ...sbHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify([{ id: hit.id, ts: hit.ts, js: (hit as any).js ?? null, hit }]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase insert ${res.status}: ${await res.text()}`);
}

async function sbSelect(limit: number): Promise<Hit[]> {
  const url = `${SB_URL}/rest/v1/${TABLE}?select=hit&order=ts.desc&limit=${limit}`;
  const res = await fetch(url, { headers: sbHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`Supabase select ${res.status}: ${await res.text()}`);
  const rows: { hit: Hit }[] = await res.json();
  return rows.map((r) => r.hit).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Arquivo local (.jsonl)
// ---------------------------------------------------------------------------
function filePath() {
  const base =
    process.env.VERCEL === "1"
      ? path.join("/tmp", "relatorio-data")
      : path.join(process.cwd(), "data");
  return path.join(base, "acessos.jsonl");
}

function appendFile(hit: Hit) {
  try {
    const fp = filePath();
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.appendFileSync(fp, JSON.stringify(hit) + "\n", "utf8");
  } catch (err) {
    console.error("[FILE] falha ao gravar:", err);
  }
}

function readFileHits(limit: number): Hit[] {
  try {
    const fp = filePath();
    if (!fs.existsSync(fp)) return [];
    const lines = fs.readFileSync(fp, "utf8").split("\n").filter(Boolean);
    const hits = lines
      .map((l) => {
        try {
          return JSON.parse(l) as Hit;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Hit[];
    return hits.reverse().slice(0, limit);
  } catch (err) {
    console.error("[FILE] falha ao ler:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------
export async function saveHit(hit: Hit): Promise<void> {
  console.log("[ACESSO]", JSON.stringify(hit));

  if (supabaseEnabled()) {
    try {
      await sbInsert(hit);
      return;
    } catch (err) {
      console.error("[SUPABASE] falha ao salvar, caindo para arquivo:", err);
    }
  }
  appendFile(hit);
}

export async function listHits(limit = 500): Promise<Hit[]> {
  if (supabaseEnabled()) {
    try {
      return await sbSelect(limit);
    } catch (err) {
      console.error("[SUPABASE] falha ao ler:", err);
    }
  }
  return readFileHits(limit);
}

export function storageInfo() {
  return {
    supabase: supabaseEnabled(),
    kv: supabaseEnabled(), // compat: painel usa isso como "persistente"
    file: filePath(),
  };
}
