import { supabase } from "../../../src/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("informacoes_canil")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.log("Erro GET informacoes:", error.message);

    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json(data || []);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      titulo,
      categoria,
      palavras_chave,
      conteudo,
      ativo,
    } = body;

    if (!titulo || !conteudo) {
      return Response.json(
        { error: "Título e conteúdo são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("informacoes_canil")
      .insert({
        titulo,
        categoria: categoria || "",
        palavras_chave: palavras_chave || "",
        conteudo,
        ativo: ativo ?? true,
      })
      .select()
      .single();

    if (error) {
      console.log("Erro POST informacoes:", error.message);

      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.log("Erro geral POST informacoes:", error);

    return Response.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const {
      id,
      titulo,
      categoria,
      palavras_chave,
      conteudo,
      ativo,
    } = body;

    if (!id) {
      return Response.json(
        { error: "ID obrigatório" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("informacoes_canil")
      .update({
        titulo,
        categoria: categoria || "",
        palavras_chave: palavras_chave || "",
        conteudo,
        ativo,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.log("Erro PATCH informacoes:", error.message);

      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.log("Erro geral PATCH informacoes:", error);

    return Response.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "ID obrigatório" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("informacoes_canil")
      .delete()
      .eq("id", id);

    if (error) {
      console.log("Erro DELETE informacoes:", error.message);

      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.log("Erro geral DELETE informacoes:", error);

    return Response.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}