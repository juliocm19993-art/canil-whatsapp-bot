# Canil WhatsApp IA

Projeto base para atendimento automático de canil pelo WhatsApp usando:

- Next.js
- Supabase
- OpenAI
- WhatsApp Cloud API da Meta

## 1. Instalar dependências

```bash
npm install
```

## 2. Configurar variáveis

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha:

```env
OPENAI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
```

## 3. Criar tabelas no Supabase

Abra o Supabase > SQL Editor e rode o arquivo:

```txt
supabase/schema.sql
```

## 4. Rodar localmente

```bash
npm run dev
```

## 5. Webhook do WhatsApp

Endpoint:

```txt
/api/webhook/whatsapp
```

Na Meta, configure a URL pública do webhook, por exemplo:

```txt
https://seu-dominio.vercel.app/api/webhook/whatsapp
```

Use o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.

## 6. O que já funciona

- Recebe mensagem do WhatsApp
- Cria cliente no Supabase
- Consulta filhotes disponíveis
- Gera resposta com IA
- Salva histórico da conversa
- Responde automaticamente no WhatsApp

## Próximos passos

- Criar painel administrativo para cadastrar filhotes
- Enviar fotos dos filhotes
- Criar status de reserva
- Agendar visitas
- Criar lembretes de vacina
