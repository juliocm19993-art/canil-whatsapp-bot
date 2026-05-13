import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { supabase } from "../lib/supabase";
import http from "http";

const logger = pino({ level: "silent" });

const cooldownUsuarios = new Map<string, number>();
const processandoMensagem = new Set<string>();

const COOLDOWN_MS = 2500;
const PORT = process.env.PORT || 3001;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function formatarValor(valor: any) {
  if (valor === null || valor === undefined || valor === "") return "";

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return String(valor);
  }

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(data: string) {
  if (!data) return "Consulte";

  try {
    return new Date(data).toLocaleDateString("pt-BR");
  } catch {
    return data;
  }
}

function primeiraLetraMaiuscula(texto: string) {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obterTextoMensagem(msg: any) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  ).trim();
}

async function marcarDigitando(sock: any, telefone: string, tempo = 900) {
  try {
    await sock.sendPresenceUpdate("composing", telefone);
    await delay(tempo);
    await sock.sendPresenceUpdate("paused", telefone);
  } catch {
    // Não trava o bot caso o WhatsApp não aceite presence update.
  }
}

async function enviarTexto(sock: any, telefone: string, texto: string) {
  await marcarDigitando(sock, telefone);
  await sock.sendMessage(telefone, { text: texto });
  await salvarMensagem(telefone, texto, "enviada");
}

async function salvarCliente(telefone: string) {
  const { error } = await supabase.from("clientes").upsert(
    {
      telefone,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "telefone" },
  );

  if (error) console.log("Erro ao salvar cliente:", error.message);
}

async function buscarCliente(telefone: string) {
  const { data, error } = await supabase
    .from("clientes")
    .select("telefone, boas_vindas_enviada, atendimento_humano")
    .eq("telefone", telefone)
    .maybeSingle();

  if (error) {
    console.log("Erro ao buscar cliente:", error.message);
    return null;
  }

  return data;
}

async function atualizarCliente(telefone: string, campos: Record<string, any>) {
  const { error } = await supabase
    .from("clientes")
    .update({
      ...campos,
      atualizado_em: new Date().toISOString(),
    })
    .eq("telefone", telefone);

  if (error) console.log("Erro ao atualizar cliente:", error.message);
}

async function salvarMensagem(
  telefone: string,
  mensagem: string,
  direcao: "recebida" | "enviada",
) {
  const { error } = await supabase.from("mensagens").insert({
    telefone,
    mensagem,
    direcao,
  });

  if (error) console.log("Erro ao salvar mensagem:", error.message);
}

async function buscarHistoricoCliente(telefone: string) {
  const { data, error } = await supabase
    .from("mensagens")
    .select("mensagem,direcao,criado_em")
    .eq("telefone", telefone)
    .order("criado_em", { ascending: false })
    .limit(8);

  if (error || !data) return "";

  return data
    .reverse()
    .map(
      (m) =>
        `${m.direcao === "recebida" ? "Cliente" : "Assistente"}: ${m.mensagem}`,
    )
    .join("\n");
}

async function buscarInfoPorCategoria(categoria: string) {
  const { data, error } = await supabase
    .from("informacoes_canil")
    .select("conteudo")
    .eq("ativo", true)
    .ilike("categoria", categoria)
    .limit(1);

  if (error || !data || data.length === 0) return "";

  return data[0].conteudo || "";
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

  let melhorResposta: string | null = null;
  let maiorPontuacao = 0;

  for (const info of data) {
    const palavrasChave = String(info.palavras_chave || "")
      .split(",")
      .map((p) => normalizarTexto(p))
      .filter(Boolean);

    const categoria = normalizarTexto(info.categoria || "");
    const titulo = normalizarTexto(info.titulo || "");
    const palavras = [...palavrasChave, categoria, titulo].filter(Boolean);

    let pontuacao = 0;

    for (const palavra of palavras) {
      if (!palavra) continue;

      if (textoNormalizado === palavra) pontuacao += 5;
      else if (textoNormalizado.includes(palavra)) pontuacao += 3;
      else if (
        palavra.includes(textoNormalizado) &&
        textoNormalizado.length >= 4
      )
        pontuacao += 1;
    }

    if (pontuacao > maiorPontuacao) {
      maiorPontuacao = pontuacao;
      melhorResposta = info.conteudo || null;
    }
  }

  if (melhorResposta) {
    console.log("Resposta encontrada no banco. Pontuação:", maiorPontuacao);
    return melhorResposta;
  }

  console.log("Nenhuma palavra-chave bateu com:", textoNormalizado);
  return null;
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

  const filhotesComMidia = filhotes.filter((filhote: any) => {
    const fotos =
      Array.isArray(filhote.fotos) && filhote.fotos.length
        ? filhote.fotos
        : filhote.foto_url
          ? [filhote.foto_url]
          : [];

    const videos =
      Array.isArray(filhote.videos) && filhote.videos.length
        ? filhote.videos
        : [];

    return fotos.length > 0 || videos.length > 0;
  });

  if (filhotesComMidia.length === 0) {
    const resposta =
      (await buscarInfoPorCategoria("filhotes")) ||
      (await buscarRespostaExata("reserva")) ||
      "No momento vou confirmar a disponibilidade dos filhotes com o responsável do canil 🐶";

    await enviarTexto(sock, telefone, resposta);
    return;
  }

  await enviarTexto(
    sock,
    telefone,
    "Claro 😊🐶 Vou te mostrar os filhotes disponíveis no momento.",
  );

  for (const filhote of filhotesComMidia) {
    const fotos =
      Array.isArray(filhote.fotos) && filhote.fotos.length
        ? filhote.fotos
        : filhote.foto_url
          ? [filhote.foto_url]
          : [];

    const videos =
      Array.isArray(filhote.videos) && filhote.videos.length
        ? filhote.videos
        : [];

    const legenda = `🐶 ${filhote.nome || "Filhote disponível"}
${filhote.cor ? `🎨 Cor: ${filhote.cor}` : ""}
${filhote.sexo ? `🚻 Sexo: ${primeiraLetraMaiuscula(filhote.sexo)}` : ""}
${filhote.valor ? `💰 Valor: ${formatarValor(filhote.valor)}` : ""}
📅 Disponível em: ${filhote.data_disponivel ? dataBR(filhote.data_disponivel) : "Consulte"}

Quer saber mais sobre esse filhote ou fazer uma reserva? 😊`.trim();

    let primeiraMidia = true;

    for (const video of videos) {
      await marcarDigitando(sock, telefone, 500);
      await sock.sendMessage(telefone, {
        video: { url: video },
        caption: primeiraMidia ? legenda : undefined,
      });

      primeiraMidia = false;
      await salvarMensagem(telefone, `Vídeo enviado: ${video}`, "enviada");
      await delay(700);
    }

    for (const foto of fotos) {
      await marcarDigitando(sock, telefone, 500);
      await sock.sendMessage(telefone, {
        image: { url: foto },
        caption: primeiraMidia ? legenda : undefined,
      });

      primeiraMidia = false;
      await salvarMensagem(telefone, `Foto enviada: ${foto}`, "enviada");
      await delay(700);
    }
  }
}

function mensagemBoasVindas() {
  return `Olá, seja bem-vindo ao Canil Morvians Bull 🐶💙

Sou a assistente virtual do canil e posso te ajudar com informações sobre nossos filhotes de Bulldog Francês 😊

📋 Menu rápido:

1️⃣ Ver filhotes disponíveis
2️⃣ Formas de pagamento
3️⃣ Entrega e regiões atendidas
4️⃣ O que acompanha o filhote
5️⃣ Reservas e disponibilidade

Você pode responder com o número da opção ou escrever sua dúvida.`;
}

function mensagemTransferenciaHumana() {
  return `Perfeito 😊🐶

Agora vou encaminhar seu atendimento para o responsável do canil 👨‍💼

Ele irá conversar com você sobre:

• reserva
• valores
• formas de pagamento
• entrega
• disponibilidade

🤖 Atendimento automático pausado.
⏳ Aguarde só um instante, será um prazer atender você!`;
}

function pediuMenu(texto: string) {
  const t = normalizarTexto(texto);

  return [
    "menu",
    "menu geral",
    "mais info",
    "mais informacoes",
    "informacao",
    "informacoes",
    "quero saber mais",
    "opcoes",
    "opcoes do menu",
  ].some((g) => t === g || t.includes(g));
}

function pediuHumano(texto: string) {
  const t = normalizarTexto(texto);

  const gatilhos = [
    "falar com uma pessoa",
    "falar com atendente",
    "falar com alguem",
    "quero atendimento",
    "atendimento humano",
    "humano",
    "responsavel",
    "criador",
    "vendedor",
    "pessoa real",
  ];

  return gatilhos.some((g) => t.includes(g));
}

function querComprarOuReservar(texto: string) {
  const t = normalizarTexto(texto);

  const gatilhos = [
    "quero comprar",
    "comprar",
    "tenho interesse",
    "quero fechar",
    "fechar negocio",
    "como comprar",
    "como reservar",
    "faz desconto",
    "tem desconto",
    "desconto",
    "valor negociavel",
    "sinal",
  ];

  return gatilhos.some((g) => t.includes(g));
}

function pediuMidiaOuFilhote(texto: string) {
  const t = normalizarTexto(texto);

  const gatilhos = [
    "filhotes",
    "filhote",
    "disponivel",
    "disponiveis",
    "tem macho",
    "tem femea",
    "quero ver",
    "ver fotos",
    "ver foto",
    "ver videos",
    "me mostra",
    "mostrar filhote",
    "mostrar filhotes",
    "manda foto",
    "envia foto",
    "manda video",
    "video",
    "foto",
  ];

  return gatilhos.some((g) => t.includes(g));
}

function ehElogio(texto: string) {
  const t = normalizarTexto(texto);

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

function ehMensagemSimples(texto: string) {
  const t = normalizarTexto(texto);

  return [
    "ok",
    "oi",
    "ola",
    "bom dia",
    "boa tarde",
    "boa noite",
    "kkk",
    "show",
    "top",
    "legal",
    "aguardo",
    "valeu",
    "obrigado",
    "obg",
    "sim",
    "nao",
    "?",
  ].includes(t);
}

function respostaMensagemSimples(texto: string) {
  const t = normalizarTexto(texto);

  if (["oi", "ola", "bom dia", "boa tarde", "boa noite"].includes(t)) {
    return "Olá 😊 Como posso te ajudar?\n\nDigite *menu* para ver as opções.";
  }

  if (["obrigado", "obg", "valeu"].includes(t)) {
    return "Eu que agradeço 😊🐶";
  }

  if (t === "aguardo") {
    return "Perfeito 😊 O responsável irá te chamar assim que possível.";
  }

  if (["sim", "ok", "show", "top", "legal", "kkk"].includes(t)) {
    return "😊 Posso te ajudar com filhotes, valores, entrega, formas de pagamento ou reservas.";
  }

  if (t === "nao") {
    return "Tudo bem 😊 Caso precise, é só me chamar.";
  }

  return "😊 Posso te ajudar com filhotes, valores, entrega, formas de pagamento ou reservas.";
}

async function responderMenu(sock: any, telefone: string) {
  await enviarTexto(sock, telefone, mensagemBoasVindas());
}

async function responderOpcaoMenu(sock: any, telefone: string, opcao: string) {
  const opcoes: Record<string, () => Promise<void>> = {
    "1": async () => {
      await enviarMidiasFilhotes(sock, telefone);
    },
    "2": async () => {
      const resposta =
        (await buscarRespostaExata(
          "formas de pagamento pagamento valores preço parcelamento pix cartao avista infinity pay",
        )) ||
        "Os valores e formas de pagamento serão confirmados pelo responsável do canil 🐶";

      await enviarTexto(sock, telefone, resposta);
    },
    "3": async () => {
      const resposta =
        (await buscarRespostaExata(
          "entrega frete envio cep regioes atendidas transporte",
        )) ||
        "Realizamos entregas conforme a região. Envie seu CEP para o responsável calcular certinho para você 📍";

      await enviarTexto(sock, telefone, resposta);
    },
    "4": async () => {
      const resposta =
        (await buscarRespostaExata(
          "acompanha vacina vacinado vermifugado pedigree contrato garantia giardia",
        )) ||
        `Nossos filhotes acompanham:

💉 Vacinação conforme a idade
💊 Vermifugação, inclusive Giárdia
📄 Contrato de compra e venda
✅ Garantia de saúde contra viroses e verminoses
🎖️ Pedigree opcional`;

      await enviarTexto(sock, telefone, resposta);
    },
"5": async () => {
  await enviarTexto(sock, telefone, "TESTE RESERVAS");

  await pausarIAParaHumano(sock, telefone);
},
};

const acao = opcoes[opcao];
if (acao) await acao();
}

async function pausarIAParaHumano(sock: any, telefone: string) {
  await atualizarCliente(telefone, { atendimento_humano: true });
  await enviarTexto(sock, telefone, mensagemTransferenciaHumana());
}

async function gerarRespostaIA(texto: string) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return "Vou verificar essa informação com o responsável 🐶";
    }

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
          max_tokens: 180,
          messages: [
            {
              role: "system",
              content: `Você é a assistente virtual do Canil Morvians Bull.

Regras obrigatórias:
- Responda sempre em português do Brasil.
- Seja educada, curta, natural e profissional.
- Use poucos emojis.
- Não invente informações.
- Não informe valores, formas de pagamento, entrega, reserva, disponibilidade, pedigree ou saúde se a informação não estiver no texto enviado pelo sistema.
- Se o cliente pedir compra, reserva, desconto, negociação ou atendimento humano, responda exatamente: HUMANO_NECESSARIO
- Se a pergunta for específica do canil e você não tiver certeza, responda exatamente: Vou verificar essa informação com o responsável 🐶
- Para conversa simples, responda de forma amigável.

Exemplos:
Cliente: bom dia
Resposta: Bom dia 😊 Como posso te ajudar?

Cliente: obrigado
Resposta: Eu que agradeço 😊

Cliente: quero reservar
Resposta: HUMANO_NECESSARIO`,
            },
            {
              role: "user",
              content: texto,
            },
          ],
        }),
      },
    );

    const data = await response.json();
    const resposta = data?.choices?.[0]?.message?.content?.trim();

    return resposta || "Vou verificar essa informação com o responsável 🐶";
  } catch (error) {
    console.log("Erro IA:", error);
    return "Vou verificar essa informação com o responsável 🐶";
  }
}

async function tratarComandoAtendente(
  sock: any,
  msg: any,
  telefone: string,
  texto: string,
) {
  const comando = normalizarTexto(texto);

  if (comando === "/ia on" || comando === "ia on") {
    await atualizarCliente(telefone, { atendimento_humano: false });

    try {
      await sock.sendMessage(telefone, { delete: msg.key });
    } catch {}

    console.log("IA reativada para:", telefone);
    return true;
  }

  if (comando === "/ia off" || comando === "ia off") {
    await atualizarCliente(telefone, { atendimento_humano: true });

    try {
      await sock.sendMessage(telefone, { delete: msg.key });
    } catch {}

    console.log("IA pausada para:", telefone);
    return true;
  }

  return false;
}

async function processarMensagem(sock: any, msg: any) {
  const telefone = msg.key.remoteJid;
  if (!telefone) return;

  if (telefone.includes("@g.us")) return;
  if (msg.key.remoteJid === "status@broadcast") return;

  const texto = obterTextoMensagem(msg);
  const textoNormalizado = normalizarTexto(texto);

  if (msg.key.fromMe) {
    await tratarComandoAtendente(sock, msg, telefone, texto);
    return;
  }

  if (!texto && msg.message?.audioMessage) {
    await enviarTexto(
      sock,
      telefone,
      "🎤 No momento não consigo ouvir áudios. Pode enviar sua dúvida por texto? 😊",
    );
    return;
  }

  if (!texto) return;

  const chaveProcessamento = `${telefone}:${textoNormalizado}`;
  if (processandoMensagem.has(chaveProcessamento)) return;

  const agora = Date.now();
  const ultimoAtendimento = cooldownUsuarios.get(telefone) || 0;

  if (agora - ultimoAtendimento < COOLDOWN_MS) {
    console.log("Mensagem ignorada por cooldown:", telefone);
    return;
  }

  cooldownUsuarios.set(telefone, agora);
  processandoMensagem.add(chaveProcessamento);

  try {
    console.log("Mensagem recebida:", texto);

    await salvarCliente(telefone);
    await salvarMensagem(telefone, texto, "recebida");

    let cliente = await buscarCliente(telefone);

    if (!cliente?.boas_vindas_enviada) {
      await enviarTexto(sock, telefone, mensagemBoasVindas());
      await atualizarCliente(telefone, { boas_vindas_enviada: true });
      console.log("Mensagem de boas-vindas enviada!");
      return;
    }

    if (cliente?.atendimento_humano) {
      console.log("Atendimento humano ativo. IA não respondeu:", telefone);
      return;
    }

if (pediuMenu(texto)) {
  await responderMenu(sock, telefone);
  return;
}

if (["1", "2", "3", "4", "5"].includes(textoNormalizado)) {
  await responderOpcaoMenu(sock, telefone, textoNormalizado);
  return;
}

if (pediuHumano(texto) || querComprarOuReservar(texto)) {
  await pausarIAParaHumano(sock, telefone);
  return;
}

    if (ehElogio(texto)) {
      await enviarTexto(sock, telefone, "Ficamos felizes que gostou 😊🐶");
      return;
    }

    if (ehMensagemSimples(texto)) {
      await enviarTexto(sock, telefone, respostaMensagemSimples(texto));
      return;
    }

    if (pediuMidiaOuFilhote(texto)) {
      await enviarMidiasFilhotes(sock, telefone);
      return;
    }

    const respostaBanco = await buscarRespostaExata(texto);

    if (respostaBanco) {
      await enviarTexto(sock, telefone, respostaBanco);
      console.log("Resposta enviada diretamente do banco!");
      return;
    }

    const historico = await buscarHistoricoCliente(telefone);
    const respostaIA = await gerarRespostaIA(`${historico}\nCliente: ${texto}`);

    if (respostaIA === "HUMANO_NECESSARIO") {
      await pausarIAParaHumano(sock, telefone);
      return;
    }

    await enviarTexto(sock, telefone, respostaIA);
    console.log("Resposta IA enviada!");
  } catch (error) {
    console.log("Erro geral ao processar mensagem:", error);
  } finally {
    processandoMensagem.delete(chaveProcessamento);
  }
}

async function startBot() {
  console.log("Iniciando bot...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: true,
    browser: ["Chrome", "Windows", "120.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      console.log("QR RECEBIDO");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp conectado com sucesso!");
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      console.log("❌ Conexão fechada. Código:", statusCode);

      const deveReconectar = statusCode !== DisconnectReason.loggedOut;

      if (deveReconectar) {
        console.log("🔄 Reconectando WhatsApp...");
        await delay(4000);
        startBot();
      } else {
        console.log("Sessão deslogada. Apague auth_info e escaneie novamente.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      await processarMensagem(sock, msg);
    }
  });
}

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot WhatsApp online");
  })
  .listen(PORT, () => {
    console.log(`Servidor HTTP rodando na porta ${PORT}`);
  });

startBot();
