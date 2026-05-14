import { NextResponse } from "next/server";

// Usuarios autorizados del panel admin
const USERS: Record<string, string> = {
  "pira1508@gmail.com": "1007105062DIOSAMEN*",
  "jeanpaulleonnieto79@gmail.com": "tomas2014",
};

export async function POST(req: Request) {
  const { user, pass } = await req.json();
  // Compatibilidad con variables de entorno (override del admin principal)
  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;
  if (ADMIN_USER && ADMIN_PASS) USERS[ADMIN_USER] = ADMIN_PASS;

  if (!USERS[user] || USERS[user] !== pass) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", "ok", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
