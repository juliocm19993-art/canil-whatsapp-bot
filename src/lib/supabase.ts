import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

dotenv.config({
  path: process.cwd() + "/.env",
  override: true,
});

console.log("SUPABASE URL carregada?", !!process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL não encontrada no .env");
}

if (!supabaseKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não encontrada no .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: WebSocket as any,
  },
});