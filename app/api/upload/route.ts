import { supabase } from "../../../src/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

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
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isVideo && !isImage) {
        return Response.json(
          { error: "Envie apenas fotos ou vídeos." },
          { status: 400 }
        );
      }

      const tamanhoMB = file.size / 1024 / 1024;

      if (isVideo && tamanhoMB > 20) {
        return Response.json(
          {
            error:
              "Vídeo muito grande. Envie um vídeo com até 20MB ou compacte antes.",
          },
          { status: 400 }
        );
      }

      if (isImage && tamanhoMB > 5) {
        return Response.json(
          {
            error:
              "Foto muito grande. Envie uma foto com até 5MB.",
          },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";

      const nomeArquivo = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${ext}`;

      const pasta = isVideo ? "videos" : "fotos";
      const caminho = `${pasta}/${nomeArquivo}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await supabase.storage
        .from("filhotes")
        .upload(caminho, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.log("Erro Supabase Storage:", error);

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
    console.log("Erro interno upload:", error);

    return Response.json(
      { error: "Erro interno upload" },
      { status: 500 }
    );
  }
}