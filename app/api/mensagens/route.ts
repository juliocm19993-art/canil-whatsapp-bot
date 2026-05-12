import { supabase } from "../../../src/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("mensagens")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    return Response.json({
      error: error.message,
    });
  }

  return Response.json(data);
}