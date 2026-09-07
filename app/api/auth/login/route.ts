import { NextResponse } from "next/server";
import { prisma } from "@/src/db";
import { createSessionToken, sessionCookie } from "@/src/auth";
import { protectMutation } from "@/src/security/http";
export async function POST(request: Request) { const blocked = protectMutation(request, "auth:login", 10); if (blocked) return blocked; const form = await request.formData(); const email = String(form.get("email") ?? ""); const user = await prisma.user.findUnique({ where: { email } }); if (!user?.active) return NextResponse.redirect(new URL("/login?error=1", request.url), 303); const response = NextResponse.redirect(new URL("/", request.url), 303); response.cookies.set(sessionCookie.name, createSessionToken(email), sessionCookie.options); return response; }
