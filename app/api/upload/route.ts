import { supabase } from "../../../src/lib/supabase";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const files = formData.getAll("arquivos") as File[];

    if (!files || files.length === 0) {
      return Response.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    const urls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop();

      const nomeArquivo = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${ext}`;

      const caminho = `midias/${nomeArquivo}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await supabase.storage
        .from("filhotes")
        .upload(caminho, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.log(error);

        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }

      const { data } = supabase.storage
        .from("filhotes")
        .getPublicUrl(caminho);

      urls.push(data.publicUrl);
    }

    return Response.json({ urls });
  } catch (error) {
    console.log(error);

    return Response.json(
      { error: "Erro interno upload" },
      { status: 500 }
    );
  }
}