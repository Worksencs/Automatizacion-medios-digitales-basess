import { NextResponse } from "next/server";
import { sessionCookie } from "@/src/auth";
export async function GET(request: Request) { const response = NextResponse.redirect(new URL("/login", request.url)); response.cookies.set(sessionCookie.name, "", { ...sessionCookie.options, maxAge: 0 }); return response; }
