import Link from "next/link";

const menu = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/conversas", label: "Conversas", icon: "💬" },
  { href: "/filhotes", label: "Filhotes", icon: "🐶" },
  { href: "/informacoes", label: "Base da IA", icon: "🧠" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

export const metadata = {
  title: "Morvians Bull CRM",
  description: "Painel inteligente para atendimento do canil",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f3f4f6", color: "#111827" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <aside style={{ width: 260, background: "#0f172a", color: "white", padding: 22, position: "sticky", top: 0, height: "100vh", boxSizing: "border-box" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>Morvians Bull</div>
              <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 6 }}>CRM + IA WhatsApp</div>
            </div>

            <nav style={{ display: "grid", gap: 10 }}>
              {menu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    color: "white",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div style={{ marginTop: 30, padding: 14, borderRadius: 14, background: "rgba(20,184,166,0.18)", fontSize: 13, lineHeight: 1.5 }}>
              🟢 Bot local: mantenha <b>npm run bot</b> aberto para responder no WhatsApp.
            </div>
          </aside>

          <main style={{ flex: 1, padding: 28, boxSizing: "border-box" }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
