import { cookies } from "next/headers";
import crypto from "crypto";

// Senha do painel. Defina ADMIN_PASSWORD no ambiente (.env.local) para trocar.
// Fallback apenas para facilitar o teste local.
const PASSWORD = process.env.ADMIN_PASSWORD || "relatorio2026";
const COOKIE = "admin_auth";

// Token derivado da senha — é isso que fica no cookie (não a senha em si).
export function expectedToken() {
  return crypto.createHash("sha256").update(PASSWORD).digest("hex");
}

export function checkPassword(pw: string) {
  return pw === PASSWORD;
}

export function isAuthed() {
  return cookies().get(COOKIE)?.value === expectedToken();
}

export const COOKIE_NAME = COOKIE;
