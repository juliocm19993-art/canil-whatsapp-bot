import { supabase } from "../../../src/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("filhotes_catalogo")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    console.log("Erro GET filhotes:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}

export async function PUT(req: Request) {
  const body = await req.json();

  const { error } = await supabase
    .from("filhotes_catalogo")
    .update({
      status: body.status,
    })
    .eq("id", body.id);

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
  });
}

function montarPayload(body: any) {
  return {
    nome: body.nome || null,
    sexo: body.sexo || null,
    cor: body.cor || null,
    data_nascimento: body.data_nascimento || null,
    data_disponivel: body.data_disponivel || null,
    valor: body.valor ? Number(body.valor) : null,
    descricao: body.descricao || null,
    foto_url: body.foto_url || null,
    fotos: body.fotos || [],
    videos: body.videos || [],
    status: body.status || "disponivel",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from("filhotes_catalogo")
      .insert(montarPayload(body))
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    console.log("Erro geral POST filhotes:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) return Response.json({ error: "ID obrigatório" }, { status: 400 });

    const { data, error } = await supabase
      .from("filhotes_catalogo")
      .update(montarPayload(body))
      .eq("id", body.id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    console.log("Erro geral PATCH filhotes:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "ID obrigatório" }, { status: 400 });

    const { error } = await supabase.from("filhotes_catalogo").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ ok: true });
  } catch (error) {
    console.log("Erro geral DELETE filhotes:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
