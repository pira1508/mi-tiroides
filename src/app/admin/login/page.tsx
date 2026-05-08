"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });
    setLoading(false);
    if (r.ok) router.push("/admin");
    else setErr("Credenciales incorrectas");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1922", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={onSubmit} style={{ background: "#fff", padding: 40, borderRadius: 12, width: 380, boxShadow: "0 12px 40px rgba(0,0,0,.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>🌿</div>
          <h1 style={{ margin: "8px 0 4px", fontSize: 22, color: "#1f3d2b" }}>MI TIROIDES Admin</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Panel de pedidos</p>
        </div>
        <label style={{ display: "block", fontSize: 13, color: "#444", marginBottom: 6 }}>Usuario</label>
        <input value={user} onChange={(e) => setUser(e.target.value)} type="text" required style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 14, fontSize: 14, boxSizing: "border-box" }} />
        <label style={{ display: "block", fontSize: 13, color: "#444", marginBottom: 6 }}>Contraseña</label>
        <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" required style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, marginBottom: 18, fontSize: 14, boxSizing: "border-box" }} />
        {err && <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", background: "#1f3d2b", color: "#fff", border: 0, borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
