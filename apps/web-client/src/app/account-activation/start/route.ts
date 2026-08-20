import { NextResponse } from "next/server";

const TOKEN_COOKIE = "mealmind.account-invitation";
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

export function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const destination = new URL("/account-activation", url.origin);
  const response = NextResponse.redirect(destination);
  if (token === null || !tokenPattern.test(token)) {
    response.cookies.delete(TOKEN_COOKIE);
    destination.searchParams.set("invalid", "1");
    return NextResponse.redirect(destination);
  }
  response.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
