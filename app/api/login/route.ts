import { NextRequest, NextResponse } from "next/server";
import { checkPassword, expectedToken, COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Recebe a senha via formulário e, se correta, grava o cookie de sessão.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const pw = String(form.get("password") || "");

  if (!checkPassword(pw)) {
    return NextResponse.redirect(new URL("/admin?erro=1", req.url), { status: 303 });
  }

  const res = NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  res.cookies.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // http em localhost, https em produção
    path: "/",
    maxAge: 60 * 60 * 12, // 12 horas
  });
  return res;
}

// Logout
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin", req.url), { status: 303 });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
