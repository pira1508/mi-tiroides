import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { user, pass } = await req.json();
  const ADMIN_USER = process.env.ADMIN_USER || "pira1508@gmail.com";
  const ADMIN_PASS = process.env.ADMIN_PASS || "1007105062DIOSAMEN*";
  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
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
