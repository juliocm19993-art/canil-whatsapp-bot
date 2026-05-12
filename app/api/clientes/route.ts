import { supabase } from "../../../src/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("atualizado_em", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, nome, interesse, status, ia_ativa } = body;

    if (!id) return Response.json({ error: "ID obrigatório" }, { status: 400 });

    const { data, error } = await supabase
      .from("clientes")
      .update({ nome, interesse, status, ia_ativa, atualizado_em: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  } catch (error) {
    console.log("Erro PATCH clientes:", error);
    return Response.json({ error: "Erro interno" }, { status: 500 });
  }
}
