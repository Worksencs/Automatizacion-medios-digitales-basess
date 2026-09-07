import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/src/db";
import type { RoleCode } from "@/src/domain/permissions";

const COOKIE = "nexo_session";
const secret = () => process.env.AUTH_SECRET ?? "demo-only-change-me";
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
export function createSessionToken(email: string) { const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url"); return `${payload}.${sign(payload)}`; }
export function verifySessionToken(token?: string) { if (!token) return null; const [payload, signature] = token.split("."); if (!payload || !signature) return null; const expected = sign(payload); if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; try { const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; exp: number }; return parsed.exp > Date.now() ? parsed : null; } catch { return null; } }
export async function currentUser() { const store = await cookies(); const session = verifySessionToken(store.get(COOKIE)?.value); if (!session) return null; return prisma.user.findUnique({ where: { email: session.email }, include: { role: true, outlet: true } }); }
export async function requireUser() { const user = await currentUser(); if (!user || !user.active) throw new Error("UNAUTHENTICATED"); return { ...user, roleCode: user.role.code as RoleCode }; }
export const sessionCookie = { name: COOKIE, options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 60 * 60 } };
