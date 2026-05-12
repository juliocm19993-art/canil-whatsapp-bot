import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const usuario = process.env.PAINEL_USER || "admin";
const senha = process.env.PAINEL_PASSWORD || "123456";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // libera arquivos do next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // libera login
  if (pathname === "/login") {
    return NextResponse.next();
  }

  const auth = req.cookies.get("painel-auth");

  if (!auth || auth.value !== "logado") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clientes/:path*",
    "/conversas/:path*",
    "/filhotes/:path*",
    "/informacoes/:path*",
    "/configuracoes/:path*",
  ],
};