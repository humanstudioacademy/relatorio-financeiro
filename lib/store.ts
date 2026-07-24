// Armazenamento de acessos.
//
// Estratégia (nesta ordem):
//   1. Vercel KV / Upstash Redis via REST  -> persistente em produção
//   2. Arquivo local JSONL (data/acessos.jsonl OU /tmp em serverless)
//   3. console.log (sempre)                -> aparece nos Runtime Logs da Vercel
//
// Para persistência real EM PRODUÇÃO, adicione um "KV" (Upstash) no dashboard
// da Vercel e conecte ao projeto — as variáveis KV_REST_API_URL e
// KV_REST_API_TOKEN são injetadas automaticamente. Localmente, o arquivo
// data/acessos.jsonl já registra tudo e pode ser baixado.

import fs from "fs";
import path from "path";

// Aceita tanto as variáveis do "Vercel KV" quanto as do "Upstash Redis"
// (o marketplace da Vercel injeta uma ou outra dependendo da integração).
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LIST_KEY = "acessos";

export type Hit = Record<string, unknown> & { id: string; ts: string };

// ---------------------------------------------------------------------------
// KV (produção)
// ---------------------------------------------------------------------------
function kvEnabled() {
  return Boolean(KV_URL && KV_TOKEN);
}

async function kv(command: (string | number)[]): Promise<any> {
  const res = await fetch(KV_URL as string, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Arquivo local (.jsonl — um JSON por linha)
// ---------------------------------------------------------------------------
function filePath() {
  // Em ambiente serverless o único diretório gravável é /tmp.
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
    // Mais recentes primeiro.
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

  // Sempre grava no arquivo local (relatório baixável / testes locais).
  appendFile(hit);

  if (!kvEnabled()) return;
  try {
    await kv(["LPUSH", LIST_KEY, JSON.stringify(hit)]);
    await kv(["LTRIM", LIST_KEY, 0, 4999]);
  } catch (err) {
    console.error("[KV] falha ao salvar:", err);
  }
}

export async function listHits(limit = 500): Promise<Hit[]> {
  if (kvEnabled()) {
    try {
      const out = await kv(["LRANGE", LIST_KEY, 0, limit - 1]);
      const arr: string[] = out?.result ?? [];
      return arr
        .map((s) => {
          try {
            return JSON.parse(s) as Hit;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Hit[];
    } catch (err) {
      console.error("[KV] falha ao ler:", err);
    }
  }
  return readFileHits(limit);
}

export function storageInfo() {
  return {
    kv: kvEnabled(),
    file: filePath(),
  };
}
