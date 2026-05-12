"use client";

import { useEffect, useState } from "react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [editando, setEditando] = useState<any | null>(null);

  async function carregar() {
    const res = await fetch("/api/clientes");
    setClientes(await res.json());
  }

  async function salvarCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;

    await fetch("/api/clientes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editando),
    });

    setEditando(null);
    carregar();
  }

  useEffect(() => { carregar(); }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Clientes</h1>
      <p style={{ color: "#64748b" }}>Organize contatos, interesses e status dos clientes.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        <section style={{ background: "white", borderRadius: 18, padding: 20 }}>
          {clientes.map((cliente) => (
            <div key={cliente.id} style={{ display: "flex", justifyContent: "space-between", padding: 14, borderBottom: "1px solid #e5e7eb" }}>
              <div>
                <b>{cliente.nome || cliente.telefone}</b>
                <div style={{ color: "#64748b", fontSize: 13 }}>{cliente.telefone}</div>
                <div style={{ marginTop: 6 }}>{cliente.interesse || "Sem interesse"}</div>
              </div>
              <button onClick={() => setEditando(cliente)} style={{ height: 36, border: 0, borderRadius: 10, background: "#0f766e", color: "white", padding: "0 14px" }}>Editar</button>
            </div>
          ))}
        </section>

        <aside style={{ background: "white", borderRadius: 18, padding: 20, height: "fit-content" }}>
          <h2 style={{ marginTop: 0 }}>{editando ? "Editar cliente" : "Selecione um cliente"}</h2>
          {editando && (
            <form onSubmit={salvarCliente} style={{ display: "grid", gap: 12 }}>
              <input placeholder="Nome" value={editando.nome || ""} onChange={(e) => setEditando({ ...editando, nome: e.target.value })} style={input} />
              <textarea placeholder="Interesse" value={editando.interesse || ""} onChange={(e) => setEditando({ ...editando, interesse: e.target.value })} style={input} />
              <select value={editando.status || "novo"} onChange={(e) => setEditando({ ...editando, status: e.target.value })} style={input}>
                <option value="novo">Novo</option>
                <option value="interessado">Interessado</option>
                <option value="negociando">Negociando</option>
                <option value="reservou">Reservou</option>
                <option value="comprou">Comprou</option>
              </select>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={editando.ia_ativa !== false} onChange={(e) => setEditando({ ...editando, ia_ativa: e.target.checked })} /> IA ativa
              </label>
              <button style={button}>Salvar</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}

const input = { padding: 12, border: "1px solid #d1d5db", borderRadius: 10 };
const button = { padding: 13, borderRadius: 10, border: 0, background: "#0f766e", color: "white", fontWeight: 700 };
