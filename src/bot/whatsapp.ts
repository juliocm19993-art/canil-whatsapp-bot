import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { supabase } from "../lib/supabase";
import http from "http";

const logger = pino({ level: "silent" });
const clientesApresentados = new Set<string>();
const atendimentoHumano = new Set<string>();

async function salvarCliente(telefone: string) {
  const { error } = await supabase.from("clientes").upsert(
    {
      telefone,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "telefone" }
  );

  if (error) console.log("Erro ao salvar cliente:", error.message);
  else console.log("Cliente salvo no Supabase:", telefone);
}

async function salvarMensagem(
  telefone: string,
  mensagem: string,
  direcao: string
) {
  const { error } = await supabase.from("mensagens").insert({
    telefone,
    mensagem,
    direcao,
  });

  if (error) console.log("Erro ao salvar mensagem:", error.message);
  else console.log("Mensagem salva no Supabase:", direcao);
}

async function buscarInformacoesCanil() {
  const { data, error } = await supabase
    .from("informacoes_canil")
    .select("titulo,categoria,conteudo")
    .eq("ativo", true);

  if (error || !data || data.length === 0) {
    return "";
  }

  return data.map((info) => info.conteudo).join("\n\n");
}

async function buscarFilhotesDisponiveis() {
  const { data, error } = await supabase
    .from("filhotes_catalogo")
    .select("*")
    .eq("status", "disponivel")
    .order("criado_em", { ascending: false });

  if (error) {
    console.log("Erro ao buscar filhotes:", error.message);
    return "";
  }

  if (!data || data.length === 0) {
    return "";
  }

  return data
    .map((f) => {
      const linhas = [];

      linhas.push(`🐶 Nome: ${f.nome || "Filhote disponível"}`);
      if (f.cor) linhas.push(`🎨 Cor: ${f.cor}`);
      if (f.sexo) linhas.push(`🚹 Sexo: ${f.sexo}`);
      if (f.valor) linhas.push(`💰 Valor: R$ ${f.valor}`);
      if (f.data_disponivel)
        linhas.push(`📅 Disponível em: ${f.data_disponivel}`);

      return linhas.join("\n");
    })
    .join("\n\n");
}

async function buscarFilhotesComMidia() {
  const { data, error } = await supabase
    .from("filhotes_catalogo")
    .select("*")
    .eq("status", "disponivel")
    .order("criado_em", { ascending: false });

  if (error) {
    console.log("Erro ao buscar mídias:", error.message);
    return [];
  }

  return data || [];
}

async function enviarMidiasFilhotes(sock: any, telefone: string) {
  const filhotes = await buscarFilhotesComMidia();

  const filhotesComMidia = filhotes.filter((filhote) => {
    const fotos = filhote.fotos?.length
      ? filhote.fotos
      : filhote.foto_url
      ? [filhote.foto_url]
      : [];

    const videos = filhote.videos?.length ? filhote.videos : [];

    return fotos.length > 0 || videos.length > 0;
  });

if (filhotesComMidia.length === 0) {
  const resposta =
    (await buscarInfoPorCategoria("filhotes")) ||
    (await buscarInfoPorCategoria("reservas")) ||
    "Vou verificar essa informação com o responsável 🐶";

  await sock.sendMessage(telefone, { text: resposta });
  await salvarMensagem(telefone, resposta, "enviada");
  return;
}

  for (const filhote of filhotesComMidia) {
    const fotos = filhote.fotos?.length
      ? filhote.fotos
      : filhote.foto_url
      ? [filhote.foto_url]
      : [];

    const videos = filhote.videos?.length ? filhote.videos : [];

    const legenda = `🐶 ${filhote.nome || "Filhote disponível"}
${filhote.cor ? `🎨 Cor: ${filhote.cor}` : ""}
${filhote.sexo ? `🚹 Sexo: ${filhote.sexo}` : ""}
${filhote.valor ? `💰 Valor: R$ ${filhote.valor}` : ""}
📅 Disponível em: ${filhote.data_disponivel ? new Date(filhote.data_disponivel).toLocaleDateString("pt-BR") : "Consulte"}

Quer saber mais sobre esse filhote ou fazer uma reserva? 😊`;

    let primeiraMidia = true;

    for (const video of videos) {
      await sock.sendMessage(telefone, {
        video: { url: video },
        caption: primeiraMidia ? legenda : undefined,
      });

      primeiraMidia = false;
      await salvarMensagem(telefone, `Vídeo enviado: ${video}`, "enviada");
    }

    for (const foto of fotos) {
      await sock.sendMessage(telefone, {
        image: { url: foto },
        caption: primeiraMidia ? legenda : undefined,
      });

      primeiraMidia = false;
      await salvarMensagem(telefone, `Foto enviada: ${foto}`, "enviada");
    }
  }

  console.log("Fotos/vídeos enviados!");
}

async function buscarHistoricoCliente(telefone: string) {
  const { data, error } = await supabase
    .from("mensagens")
    .select("*")
    .eq("telefone", telefone)
    .order("criado_em", { ascending: false })
    .limit(10);

  if (error || !data) return "";

  return data
    .reverse()
    .map((m) => {
      return `${m.direcao === "recebida" ? "Cliente" : "Atendente"}: ${
        m.mensagem
      }`;
    })
    .join("\n");
}

function querComprarOuReservar(texto: string) {
  const t = texto.toLowerCase().trim();

  return (
    t.includes("quero reservar") ||
    t.includes("reserva") ||
    t.includes("quero comprar") ||
    t.includes("tenho interesse") ||
    t.includes("quero fechar") ||
    t.includes("como comprar") ||
    t.includes("como reservar") ||
    t.includes("faz desconto") ||
    t.includes("tem desconto") ||
    t.includes("desconto") ||
    t.includes("valor negociável") ||
    t.includes("valor negociavel")
  );
}

function pediuMenu(texto: string) {
  const t = texto.toLowerCase().trim();

  return (
    t === "menu" ||
    t === "menu geral" ||    
    t.includes("mais info") ||
    t.includes("mais informações") ||
    t.includes("mais informacoes") ||
    t.includes("infos") ||
    t === "info" ||
    t === "informação" ||
    t === "informações" ||
    t === "informacao" ||
    t === "informacoes" ||
    t.includes("quero saber mais")
  );
}

function pediuHumano(texto: string) {
  const t = texto.toLowerCase().trim();

  return (
    t.includes("falar com uma pessoa") ||
    t.includes("falar com atendente") ||
    t.includes("falar com alguém") ||
    t.includes("falar com alguem") ||
    t.includes("responsável") ||
    t.includes("responsavel") ||
    t.includes("humano") ||
    t.includes("criador")
  );
}

function pediuMidiaOuFilhote(texto: string) {
  const t = texto.toLowerCase().trim();

  const gatilhos = [
    "filhotes",
    "filhote",
    "tem macho",
    "tem fêmea",
    "tem femea",
    "quero ver",
    "ver fotos",
    "ver foto",
    "ver vídeos",
    "ver videos",
    "me mostra",
    "mostrar filhote",
    "mostrar filhotes",
    "manda foto",
    "envia foto",
    "manda vídeo",
    "manda video",
  ];

  return gatilhos.some((g) => t.includes(g));
}

function ehElogio(texto: string) {
  const t = texto.toLowerCase().trim();

  const elogios = [
    "lindo",
    "lindos",
    "fofo",
    "fofos",
    "fofinho",
    "fofinhos",
    "amei",
    "bonito",
    "bonitos",
    "que lindo",
    "que lindos",
  ];

  return elogios.some((e) => t.includes(e));
}

function ehMensagemCurtaConfusa(texto: string) {
  const t = texto.toLowerCase().trim();
  return t === "?" || t === "??" || t === "???" || t === "sim" || t === "ok";
}

async function responderMenu(sock: any, telefone: string) {
  const resposta = `Claro 😊 Sobre o que você gostaria de saber?

1️⃣ Filhotes disponíveis
2️⃣ O que acompanha o filhote
3️⃣ Entrega
4️⃣ Valores
5️⃣ Reservas`;

  await sock.sendMessage(telefone, { text: resposta });
  await salvarMensagem(telefone, resposta, "enviada");
}

async function gerarRespostaIA(texto: string) {


  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `

Você é a assistente virtual do Canil Morvians Bull.

Responda somente conversas simples e naturais.

NÃO use informações do banco.
NÃO fale sobre valores.
NÃO fale sobre entrega.
NÃO fale sobre filhotes.
NÃO fale sobre reserva.
NÃO fale sobre pedigree.
NÃO invente informações.

Se o cliente perguntar algo específico do canil e a resposta não foi encontrada antes pelo sistema, responda exatamente:

"Vou verificar essa informação com o responsável 🐶"

Para conversa comum, responda curto e natural.

Exemplos:
"bom dia" → "Bom dia 😊 Como posso te ajudar?"
"tudo bem" → "Tudo bem sim 😊 Como posso te ajudar?"
"obrigado" → "Eu que agradeço 😊"
"legal" → "Que bom 😊"


`,
            },
            {
              role: "user",
              content: texto,
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const resposta = data?.choices?.[0]?.message?.content?.trim();

    return resposta || "Claro 🐶 Vou verificar essa informação para você.";
  } catch (error) {
    console.log("Erro IA:", error);
    return "Desculpe 🐶 Tive um probleminha aqui. Vou pedir para o responsável verificar.";
  }
}

function normalizarTexto(texto: string) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buscarRespostaExata(texto: string) {
  const textoNormalizado = normalizarTexto(texto);

  const { data, error } = await supabase
    .from("informacoes_canil")
    .select("titulo,categoria,palavras_chave,conteudo")
    .eq("ativo", true);

  if (error || !data || data.length === 0) {
    console.log("Nenhuma informação encontrada:", error?.message);
    return null;
  }

  for (const info of data) {
    const palavrasChave = String(info.palavras_chave || "")
      .split(",")
      .map((p) => normalizarTexto(p))
      .filter(Boolean);

    const categoria = normalizarTexto(info.categoria || "");
    const titulo = normalizarTexto(info.titulo || "");

    const palavras = [
      ...palavrasChave,
      categoria,
      titulo,
    ].filter(Boolean);

    const encontrou = palavras.some((palavra) => {
      return textoNormalizado.includes(palavra);
    });

    if (encontrou) {
      console.log("Resposta encontrada no banco:", info.titulo);
      return info.conteudo || null;
    }
  }

  console.log("Nenhuma palavra-chave bateu com:", textoNormalizado);
  return null;
}

async function buscarInfoPorCategoria(categoria: string) {
  const { data, error } = await supabase
    .from("informacoes_canil")
    .select("conteudo")
    .eq("ativo", true)
    .ilike("categoria", categoria)
    .limit(1);

  if (error || !data || data.length === 0) {
    return "";
  }

  return data[0].conteudo;
}

async function startBot() {
  console.log("Iniciando bot...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

const sock = makeWASocket({
  auth: state,
  logger,
  printQRInTerminal: true,
  browser: ["Chrome", "Windows", "120.0.0"],
  version: [2, 3000, 1034074495],
  syncFullHistory: false,
  markOnlineOnConnect: false,
});

  sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", async (update) => {
  const { connection, qr, lastDisconnect } = update;

  if (qr) {
    console.log("QR RECEBIDO");

    qrcode.generate(qr, {
      small: true,
    });
  }

  if (connection === "open") {
    console.log("✅ WhatsApp conectado com sucesso!");
  }

if (connection === "close") {
  const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;

  console.log("❌ Conexão fechada. Código:", statusCode);

  const deveReconectar =
    statusCode !== DisconnectReason.loggedOut;

  if (deveReconectar) {
    console.log("🔄 Reconectando WhatsApp...");
    startBot();
  } else {
    console.log("Sessão deslogada. Apague auth_info e escaneie novamente.");
  }
}
});

  sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0];

      if (!msg.message) return;

      const texto =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      const telefone = msg.key.remoteJid;
      if (!telefone) return;

      const textoLower = texto.toLowerCase().trim();

      if (msg.key.fromMe) {
        if (textoLower === "/ia on") {
          atendimentoHumano.delete(telefone);

          await sock.sendMessage(telefone, {
            delete: msg.key,
          });

          console.log("IA reativada para:", telefone);
        }

        if (textoLower === "/ia off") {
          atendimentoHumano.add(telefone);

          await sock.sendMessage(telefone, {
            delete: msg.key,
          });

          console.log("IA pausada para:", telefone);
        }

        return;
      }

      if (atendimentoHumano.has(telefone)) {
        console.log("Atendimento humano ativo. IA não respondeu:", telefone);
        return;
      }

      if (!texto) return;

      console.log("Mensagem recebida:", texto);

      await salvarCliente(telefone);
      await salvarMensagem(telefone, texto, "recebida");

      if (!clientesApresentados.has(telefone)) {
        clientesApresentados.add(telefone);

const respostaBoasVindas = `Olá, seja bem-vindo ao Canil Morvians Bull 🐶💙

Sou a assistente virtual do canil e posso te ajudar com informações sobre nossos filhotes de Bulldog Francês 😊

📋 Menu rápido:

1️⃣ Ver filhotes disponíveis
2️⃣ Formas de pagamento
3️⃣ Entrega e regiões atendidas
4️⃣ O que acompanha o filhote
5️⃣ Reservas e disponibilidade`;

        await sock.sendMessage(telefone, { text: respostaBoasVindas });
        await salvarMensagem(telefone, respostaBoasVindas, "enviada");

        console.log("Mensagem de boas-vindas enviada!");
        return;
      }
if (querComprarOuReservar(texto)) {
  atendimentoHumano.add(telefone);

  const resposta = `Que ótimo 😊🐶

Ficamos muito felizes com o seu interesse em nossos filhotes.

Agora seu atendimento será encaminhado para o responsável do canil 👨‍💼

Em instantes, ele irá entrar no char e tirar suas dividas.

🤖 Atendimento automático finalizado.
📞 Aguarde só um momento, será um prazer atender você.`;

  await sock.sendMessage(telefone, {
    text: resposta,
  });

  await salvarMensagem(telefone, resposta, "enviada");

  return;
}
const mensagensSimples = [
  "ok",
  "oi",
  "ola",
  "olá",
  "👍",
  "?",
  "kkk",
  "show",
  "top",
  "legal",
  "aguardo",
  "valeu",
  "obrigado",
  "obg",
  "sim",
  "não",
  "nao",
];

if (mensagensSimples.includes(textoLower)) {
  let resposta = "😊";

  if (textoLower === "aguardo") {
    resposta = "Perfeito 😊";
  }

  if (
    textoLower === "obrigado" ||
    textoLower === "obg"
  ) {
    resposta = "Eu que agradeço 😊";
  }

  if (
    textoLower === "oi" ||
    textoLower === "ola" ||
    textoLower === "olá"
  ) {
    resposta =
      "Olá 😊 Como posso te ajudar?";
  }

  await sock.sendMessage(telefone, {
    text: resposta,
  });

  await salvarMensagem(
    telefone,
    resposta,
    "enviada"
  );

  return;
}

if (
  textoLower.includes("falar com") ||
  textoLower.includes("atendente") ||
  textoLower.includes("humano") ||
  textoLower.includes("responsável") ||
  textoLower.includes("responsavel")
) {
  atendimentoHumano.add(telefone);

  const resposta =
    "Claro 😊 Em breve o responsável pelo canil irá te responder.";

  await sock.sendMessage(telefone, {
    text: resposta,
  });

  await salvarMensagem(
    telefone,
    resposta,
    "enviada"
  );

  return;
}

      if (pediuHumano(texto)) {
        atendimentoHumano.add(telefone);

        const resposta =
          "Claro 😊 Em breve o responsável pelo canil irá te responder.";

        await sock.sendMessage(telefone, { text: resposta });
        await salvarMensagem(telefone, resposta, "enviada");

        return;
      }

      if (pediuMenu(texto)) {
        await responderMenu(sock, telefone);
        return;
      }

      if (textoLower === "1") {
        await enviarMidiasFilhotes(sock, telefone);
        return;
      }

if (textoLower === "2") {
  const resposta =
    (await buscarRespostaExata("valores pagamento preço parcelamento")) ||
    "Vou verificar essa informação com o responsável 🐶";

  await sock.sendMessage(telefone, { text: resposta });
  await salvarMensagem(telefone, resposta, "enviada");
  return;
}

if (textoLower === "3") {
  const resposta =
    (await buscarRespostaExata("entrega frete envio cep")) ||
    "Vou verificar essa informação com o responsável 🐶";

  await sock.sendMessage(telefone, { text: resposta });
  await salvarMensagem(telefone, resposta, "enviada");
  return;
}

if (textoLower === "4") {
  const resposta =
    (await buscarRespostaExata("acompanha vacina pedigree contrato garantia")) ||
    "Vou verificar essa informação com o responsável 🐶";

  await sock.sendMessage(telefone, { text: resposta });
  await salvarMensagem(telefone, resposta, "enviada");
  return;
}

if (textoLower === "5") {
  const resposta =
    (await buscarRespostaExata("reserva reservar disponibilidade sinal")) ||
    "Vou verificar essa informação com o responsável 🐶";

  await sock.sendMessage(telefone, { text: resposta });
  await salvarMensagem(telefone, resposta, "enviada");
  return;
}

      if (ehElogio(texto)) {
        const resposta = "Ficamos felizes que gostou 😊";

        await sock.sendMessage(telefone, { text: resposta });
        await salvarMensagem(telefone, resposta, "enviada");
        return;
      }

      if (ehMensagemCurtaConfusa(texto)) {
        const resposta =
          "😊 Posso te ajudar com valores, entrega, reservas ou informações sobre os filhotes.";

        await sock.sendMessage(telefone, { text: resposta });
        await salvarMensagem(telefone, resposta, "enviada");
        return;
      }

      if (pediuMidiaOuFilhote(texto)) {
        console.log("Cliente perguntou sobre filhote/foto/vídeo!");
        await enviarMidiasFilhotes(sock, telefone);
        return;
      }

const respostaBanco = await buscarRespostaExata(texto);

if (respostaBanco) {
  await sock.sendMessage(telefone, {
    text: respostaBanco,
  });

  await salvarMensagem(
    telefone,
    respostaBanco,
    "enviada"
  );

  console.log("Resposta enviada diretamente do banco!");

  return;
}

const historico = await buscarHistoricoCliente(telefone);

const resposta = await gerarRespostaIA(
  historico + "\nCliente: " + texto
);

await sock.sendMessage(telefone, {
  text: resposta,
});

await salvarMensagem(
  telefone,
  resposta,
  "enviada"
);

console.log("Resposta IA enviada!");
    } catch (error) {
      console.log("Erro geral:", error);
    }
  });
}

const PORT = process.env.PORT || 3001;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot WhatsApp online");
  })
  .listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
  });

startBot();