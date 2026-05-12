"use client";

import { useEffect, useMemo, useState } from "react";

export default function ConversasPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [telefone, setTelefone] = useState<string>("");

  async function carregar() {
    const [clientesRes, mensagensRes] = await Promise.all([fetch("/api/clientes"), fetch("/api/mensagens")]);
    const clientesData = await clientesRes.json();
    const mensagensData = await mensagensRes.json();
    setClientes(clientesData);
    setMensagens(mensagensData);
    if (!telefone && clientesData[0]) setTelefone(clientesData[0].telefone);
  }

  useEffect(() => { carregar(); }, []);

  const conversa = useMemo(() => mensagens.filter((m) => m.telefone === telefone).reverse(), [mensagens, telefone]);

  return (
    <div style={{ height: "calc(100vh - 56px)", display: "grid", gridTemplateColumns: "320px 1fr", background: "white", borderRadius: 18, overflow: "hidden" }}>
      <aside style={{ borderRight: "1px solid #e5e7eb", overflow: "auto" }}>
        <div style={{ padding: 18, borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ margin: 0 }}>Conversas</h2>
        </div>
        {clientes.map((cliente) => (
          <button key={cliente.id} onClick={() => setTelefone(cliente.telefone)} style={{ display: "block", width: "100%", textAlign: "left", padding: 14, border: 0, borderBottom: "1px solid #f1f5f9", background: telefone === cliente.telefone ? "#ecfeff" : "white", cursor: "pointer" }}>
            <b>{cliente.nome || cliente.telefone}</b>
            <div style={{ color: "#64748b", fontSize: 13 }}>{cliente.interesse || "Cliente WhatsApp"}</div>
          </button>
        ))}
      </aside>

      <section style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ padding: 18, borderBottom: "1px solid #e5e7eb" }}>
          <b>{telefone || "Nenhum cliente"}</b>
          <div style={{ color: "#64748b", fontSize: 13 }}>Histórico salvo no Supabase</div>
        </header>

        <div style={{ flex: 1, padding: 20, background: "#f8fafc", overflow: "auto" }}>
          {conversa.map((msg) => (
            <div key={msg.id} style={{ display: "flex", justifyContent: msg.direcao === "enviada" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{ maxWidth: "70%", padding: 12, borderRadius: 14, background: msg.direcao === "enviada" ? "#dcfce7" : "white", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", whiteSpace: "pre-wrap" }}>
                {msg.mensagem}
              </div>
            </div>
          ))}
        </div>

        <footer style={{ padding: 16, borderTop: "1px solid #e5e7eb", color: "#64748b" }}>
          Para responder manualmente, use o WhatsApp Business. Comandos: <b>/ia off</b> e <b>/ia on</b>.
        </footer>
      </section>
    </div>
  );
}
