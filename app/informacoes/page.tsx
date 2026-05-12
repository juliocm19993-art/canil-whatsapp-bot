"use client";

import { useEffect, useMemo, useState } from "react";

const vazio = { id: "", titulo: "", categoria: "", conteudo: "", ativo: true };

export default function InformacoesPage() {
  const [informacoes, setInformacoes] = useState<any[]>([]);
  const [form, setForm] = useState<any>(vazio);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const res = await fetch("/api/informacoes");
    setInformacoes(await res.json());
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    await fetch("/api/informacoes", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm(vazio);
    setSalvando(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta informação?")) return;
    await fetch(`/api/informacoes?id=${id}`, { method: "DELETE" });
    carregar();
  }

  async function alternar(info: any) {
    await fetch("/api/informacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...info, ativo: !info.ativo }),
    });
    carregar();
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    const t = busca.toLowerCase();
    return informacoes.filter((i) => `${i.titulo} ${i.categoria} ${i.conteudo}`.toLowerCase().includes(t));
  }, [informacoes, busca]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Base de conhecimento da IA</h1>
      <p style={{ color: "#64748b" }}>Cadastre e edite as informações que a IA deve usar no WhatsApp.</p>

      <div style={{ display: "grid", gridTemplateColumns: "430px 1fr", gap: 20 }}>
        <form onSubmit={salvar} style={{ background: "white", padding: 20, borderRadius: 18, display: "grid", gap: 12, height: "fit-content" }}>
          <h2 style={{ marginTop: 0 }}>{form.id ? "Editar informação" : "Nova informação"}</h2>
          <input placeholder="Título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} style={input} />
          <input placeholder="Categoria: filhotes, valores, entrega..." value={form.categoria || ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={input} />
          <textarea placeholder="Conteúdo completo para IA responder" value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} rows={10} style={input} />
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Informação ativa
          </label>
          <button disabled={salvando} style={button}>{salvando ? "Salvando..." : form.id ? "Salvar alterações" : "Cadastrar informação"}</button>
          {form.id && <button type="button" onClick={() => setForm(vazio)} style={{ ...button, background: "#64748b" }}>Cancelar edição</button>}
        </form>

        <section style={{ background: "white", padding: 20, borderRadius: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Informações cadastradas</h2>
            <input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ ...input, width: 220 }} />
          </div>

          {filtradas.map((info) => (
            <div key={info.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{info.titulo}</h3>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{info.categoria || "geral"} • {info.ativo ? "Ativa" : "Inativa"}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setForm(info)} style={smallButton}>Editar</button>
                  <button onClick={() => alternar(info)} style={smallButton}>{info.ativo ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => excluir(info.id)} style={{ ...smallButton, background: "#dc2626" }}>Excluir</button>
                </div>
              </div>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{info.conteudo}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const input = { padding: 12, border: "1px solid #d1d5db", borderRadius: 10, fontFamily: "Arial" };
const button = { padding: 13, borderRadius: 10, border: 0, background: "#0f766e", color: "white", fontWeight: 700, cursor: "pointer" };
const smallButton = { padding: "8px 10px", borderRadius: 8, border: 0, background: "#0f766e", color: "white", cursor: "pointer" };
