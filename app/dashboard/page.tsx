async function buscarDados() {
  const [clientesRes, mensagensRes, filhotesRes, informacoesRes] = await Promise.all([
    fetch("http://localhost:3000/api/clientes", { cache: "no-store" }),
    fetch("http://localhost:3000/api/mensagens", { cache: "no-store" }),
    fetch("http://localhost:3000/api/filhotes", { cache: "no-store" }),
    fetch("http://localhost:3000/api/informacoes", { cache: "no-store" }),
  ]);

  return {
    clientes: await clientesRes.json(),
    mensagens: await mensagensRes.json(),
    filhotes: await filhotesRes.json(),
    informacoes: await informacoesRes.json(),
  };
}

function Card({ titulo, valor, detalhe }: { titulo: string; valor: any; detalhe: string }) {
  return (
    <div style={{ background: "white", padding: 22, borderRadius: 18, boxShadow: "0 10px 25px rgba(15,23,42,0.06)" }}>
      <div style={{ color: "#64748b", fontSize: 14 }}>{titulo}</div>
      <div style={{ fontSize: 34, fontWeight: 800, marginTop: 8 }}>{valor}</div>
      <div style={{ color: "#64748b", marginTop: 8, fontSize: 13 }}>{detalhe}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const { clientes, mensagens, filhotes, informacoes } = await buscarDados();

  const disponiveis = filhotes.filter((f: any) => f.status === "disponivel");
  const recebidas = mensagens.filter((m: any) => m.direcao === "recebida");

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 34 }}>Dashboard</h1>
        <p style={{ color: "#64748b" }}>Visão geral do atendimento inteligente do canil.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 18 }}>
        <Card titulo="Clientes" valor={clientes.length} detalhe="Contatos salvos no CRM" />
        <Card titulo="Mensagens recebidas" valor={recebidas.length} detalhe="Mensagens de clientes" />
        <Card titulo="Filhotes disponíveis" valor={disponiveis.length} detalhe="Ativos no catálogo" />
        <Card titulo="Base da IA" valor={informacoes.length} detalhe="Informações cadastradas" />
      </div>

      <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
        <section style={{ background: "white", borderRadius: 18, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Últimos clientes</h2>
          {clientes.slice(0, 8).map((c: any) => (
            <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
              <b>{c.nome || c.telefone}</b>
              <div style={{ color: "#64748b", fontSize: 13 }}>{c.interesse || "Sem interesse registrado"}</div>
            </div>
          ))}
        </section>

        <section style={{ background: "white", borderRadius: 18, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Atalhos</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <a href="/filhotes" style={{ color: "#0f766e", fontWeight: 700 }}>Cadastrar filhote</a>
            <a href="/informacoes" style={{ color: "#0f766e", fontWeight: 700 }}>Adicionar informação para IA</a>
            <a href="/conversas" style={{ color: "#0f766e", fontWeight: 700 }}>Ver conversas</a>
          </div>
        </section>
      </div>
    </div>
  );
}
