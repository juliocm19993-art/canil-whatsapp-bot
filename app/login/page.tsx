"use client";

import { useState } from "react";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  async function entrar() {
    const usuario = process.env.NEXT_PUBLIC_PAINEL_USER;
    const senha = process.env.NEXT_PUBLIC_PAINEL_PASSWORD;

    if (user === usuario && pass === senha) {
      document.cookie = "painel-auth=logado; path=/";

      window.location.href = "/dashboard";
    } else {
      alert("Usuário ou senha inválidos");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
      }}
    >
      <div
        style={{
          width: 360,
          background: "white",
          padding: 30,
          borderRadius: 20,
        }}
      >
        <h1 style={{ marginTop: 0 }}>Login Painel</h1>

        <input
          placeholder="Usuário"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 14,
            borderRadius: 10,
            border: "1px solid #d1d5db",
          }}
        />

        <input
          type="password"
          placeholder="Senha"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 14,
            borderRadius: 10,
            border: "1px solid #d1d5db",
          }}
        />

        <button
          onClick={entrar}
          style={{
            width: "100%",
            padding: 14,
            border: 0,
            borderRadius: 12,
            background: "#14b8a6",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </div>
    </div>
  );
}