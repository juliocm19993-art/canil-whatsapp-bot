export default function ConfiguracoesPage() {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Configurações</h1>
      <p style={{ color: "#64748b" }}>Área para organizar tokens, comandos e instruções do bot.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
        <section style={card}>
          <h2>Comandos do WhatsApp</h2>
          <p><b>/ia off</b> — pausa a IA na conversa atual.</p>
          <p><b>/ia on</b> — reativa a IA na conversa atual.</p>
        </section>

        <section style={card}>
          <h2>Arquivos importantes</h2>
          <p><b>Bot:</b> src/bot/whatsapp.ts</p>
          <p><b>Supabase:</b> src/lib/supabase.ts</p>
          <p><b>Variáveis:</b> .env</p>
        </section>

        <section style={card}>
          <h2>Rodar localmente</h2>
          <p><b>Bot:</b> npm run bot</p>
          <p><b>Painel:</b> npm run dev</p>
        </section>

        <section style={card}>
          <h2>Storage</h2>
          <p>Bucket público: <b>filhotes</b></p>
          <p>Usado para fotos e vídeos do catálogo.</p>
        </section>
      </div>
    </div>
  );
}

const card = { background: "white", borderRadius: 18, padding: 22, boxShadow: "0 10px 25px rgba(15,23,42,0.06)" };
