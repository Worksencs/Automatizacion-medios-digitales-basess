import { NextResponse } from "next/server";
import { currentUser } from "@/src/auth";

export async function GET() {
  const user = await currentUser();
  if (!user?.active) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const integrationMode = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_ENABLED !== "true" ? "Claude sin verificar" : process.env.DEMO_MODE === "false" ? (process.env.ANTHROPIC_API_KEY ? "Claude conectado" : process.env.OPENAI_API_KEY ? "OpenAI conectado" : "Sin proveedor AI") : "Modo demostración";
  return NextResponse.json({ user: { name: user.name, role: user.role.name, roleCode: user.role.code, outlet: user.outlet?.name ?? null }, integrationMode });
}
