"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
const vazio = {
  id: "",
  nome: "",
  sexo: "",
  cor: "",
  data_nascimento: "",
  data_disponivel: "",
  valor: "",
  descricao: "",
  foto_url: "",
  fotos: [] as string[],
  videos: [] as string[],
  status: "disponivel",
};

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL ou ANON KEY não configurada.");
  }

  return createClient(url, key);
}

export default function FilhotesPage() {
  const [filhotes, setFilhotes] = useState<any[]>([]);
  const [form, setForm] = useState<any>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    const res = await fetch("/api/filhotes");
    setFilhotes(await res.json());
  }

async function uploadArquivos(
  files: FileList | null,
  tipo: "fotos" | "videos"
) {
  if (!files || files.length === 0) return;

  setEnviando(true);

  try {
    const urls: string[] = [];    

    const supabase = getSupabaseBrowser();

    for (const file of Array.from(files)) {
      const isVideo = tipo === "videos";

      const tamanhoMB = file.size / 1024 / 1024;

      if (isVideo && tamanhoMB > 50) {
        alert("Vídeo muito grande. Máximo 50MB.");
        continue;
      }

      const ext = file.name.split(".").pop();

      const nomeArquivo = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${ext}`;

      const pasta = isVideo ? "videos" : "fotos";

      const caminho = `${pasta}/${nomeArquivo}`;

      const { error } = await supabase.storage
        .from("filhotes")
        .upload(caminho, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.log(error);
        alert(error.message);
        continue;
      }

      const { data } = supabase.storage
        .from("filhotes")
        .getPublicUrl(caminho);

      urls.push(data.publicUrl);
    }

    setForm((prev: any) => ({
      ...prev,
      [tipo]: [...(prev[tipo] || []), ...urls],
      foto_url:
        tipo === "fotos" && !prev.foto_url
          ? urls[0] || ""
          : prev.foto_url,
    }));
  } catch (error) {
    console.log(error);
    alert("Erro ao enviar arquivos");
  }

  setEnviando(false);
}

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    await fetch("/api/filhotes", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm(vazio);
    setSalvando(false);
    carregar();
  }

  async function alterarStatus(id: string, status: string) {
    await fetch("/api/filhotes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir filhote?")) return;
    await fetch(`/api/filhotes?id=${id}`, { method: "DELETE" });
    carregar();
  }

  function removerMidia(tipo: "fotos" | "videos", url: string) {
    setForm((prev: any) => ({
      ...prev,
      [tipo]: prev[tipo].filter((item: string) => item !== url),
    }));
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Catálogo de filhotes</h1>
      <p style={{ color: "#64748b" }}>
        Cadastre filhotes, fotos, vídeos, valores e status para a IA consultar.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "430px 1fr", gap: 20 }}>
        <form
          onSubmit={salvar}
          style={{
            background: "white",
            padding: 20,
            borderRadius: 18,
            display: "grid",
            gap: 12,
            height: "fit-content",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {form.id ? "Editar filhote" : "Novo filhote"}
          </h2>

          <input placeholder="Nome ou identificação" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={input} />
          <input placeholder="Sexo: macho ou fêmea" value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} style={input} />
          <input placeholder="Cor" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} style={input} />
          <input type="date" value={form.data_nascimento || ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} style={input} />
          <input type="date" value={form.data_disponivel || ""} onChange={(e) => setForm({ ...form, data_disponivel: e.target.value })} style={input} />
          <input placeholder="Valor" value={form.valor || ""} onChange={(e) => setForm({ ...form, valor: e.target.value })} style={input} />
          <textarea placeholder="Descrição" value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={4} style={input} />

          <div style={uploadBox}>
            <b>Fotos</b>
            <input type="file" multiple accept="image/*" onChange={(e) => uploadArquivos(e.target.files, "fotos")} />
            <div style={previewGrid}>
              {form.fotos?.map((foto: string) => (
                <img key={foto} src={foto} onClick={() => removerMidia("fotos", foto)} title="Clique para remover" style={thumb} />
              ))}
            </div>
          </div>

          <div style={uploadBox}>
            <b>Vídeos</b>
            <input type="file" multiple accept="video/*" onChange={(e) => uploadArquivos(e.target.files, "videos")} />
            <div style={previewGrid}>
              {form.videos?.map((video: string) => (
                <video key={video} src={video} controls style={{ width: 120, borderRadius: 10 }} />
              ))}
            </div>
          </div>

          {enviando && <p>Enviando arquivos...</p>}

          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={input}>
            <option value="disponivel">Disponível</option>
            <option value="reservado">Reservado</option>
            <option value="vendido">Vendido</option>
            <option value="indisponivel">Indisponível</option>
          </select>

          <button type="submit" disabled={salvando || enviando} style={button}>
            {salvando ? "Salvando..." : form.id ? "Salvar alterações" : "Salvar filhote"}
          </button>

          {form.id && (
            <button type="button" onClick={() => setForm(vazio)} style={{ ...button, background: "#64748b" }}>
              Cancelar edição
            </button>
          )}
        </form>

        <section style={{ display: "grid", gap: 14 }}>
          {filhotes.map((f) => (
            <div key={f.id} style={{ background: "white", padding: 20, borderRadius: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{f.nome || "Filhote"}</h3>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    {f.status} • {f.sexo || "sexo não informado"} • {f.cor || "cor não informada"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() =>
                      setForm({
                        ...vazio,
                        ...f,
                        valor: f.valor || "",
                        fotos: f.fotos || [],
                        videos: f.videos || [],
                      })
                    }
                    style={smallButton}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      alterarStatus(
                        f.id,
                        f.status === "disponivel" ? "indisponivel" : "disponivel"
                      )
                    }
                    style={{
                      ...smallButton,
                      background: f.status === "disponivel" ? "#f59e0b" : "#2563eb",
                    }}
                  >
                    {f.status === "disponivel" ? "Desativar" : "Ativar"}
                  </button>

                  <button
                    onClick={() => excluir(f.id)}
                    style={{ ...smallButton, background: "#dc2626" }}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <p>
                <b>Valor:</b> {f.valor ? `R$ ${f.valor}` : "Não informado"} •{" "}
                <b>Disponível em:</b> {f.data_disponivel || "Não informado"}
              </p>

              <p style={{ whiteSpace: "pre-wrap" }}>{f.descricao}</p>

              <div style={previewGrid}>
                {f.fotos?.map((foto: string) => (
                  <img key={foto} src={foto} style={thumb} />
                ))}
                {f.videos?.map((video: string) => (
                  <video key={video} src={video} controls style={{ width: 150, borderRadius: 10 }} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

const input = {
  padding: 12,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  fontFamily: "Arial",
};

const button = {
  padding: 13,
  borderRadius: 10,
  border: 0,
  background: "#0f766e",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButton = {
  padding: "8px 10px",
  borderRadius: 8,
  border: 0,
  background: "#0f766e",
  color: "white",
  cursor: "pointer",
};

const uploadBox = {
  border: "1px dashed #94a3b8",
  padding: 12,
  borderRadius: 12,
  display: "grid",
  gap: 10,
};

const previewGrid = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap" as const,
  marginTop: 10,
};

const thumb = {
  width: 120,
  height: 120,
  objectFit: "cover" as const,
  borderRadius: 10,
  cursor: "pointer",
};