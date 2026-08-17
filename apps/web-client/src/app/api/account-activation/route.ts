import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readWebEnv } from "@/config/env";
import { createServerSupabaseClient } from "@/shared/supabase/server-client";

const TOKEN_COOKIE = "mealmind.account-invitation";

async function token() {
  return (await cookies()).get(TOKEN_COOKIE)?.value ?? null;
}

function apiUrl(path: string) {
  return `${readWebEnv().apiUrl.replace(/\/+$/, "")}${path}`;
}

export async function GET() {
  const invitationToken = await token();
  if (invitationToken === null)
    return NextResponse.json({ data: { status: "INVALID", recipientEmailHint: null } });
  const result = await fetch(apiUrl("/api/v1/account-invitations/inspect"), {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ token: invitationToken }),
    cache: "no-store",
  });
  return new NextResponse(await result.text(), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST() {
  const invitationToken = await token();
  if (invitationToken === null)
    return NextResponse.json({ error: { code: "ACCOUNT_INVITATION_INVALID" } }, { status: 404 });
  const supabase = await createServerSupabaseClient();
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (session.error !== null || accessToken === undefined) {
    return NextResponse.json({ error: { code: "AUTHENTICATION_REQUIRED" } }, { status: 401 });
  }
  const result = await fetch(apiUrl("/api/v1/account-invitations/claim"), {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ token: invitationToken }),
    cache: "no-store",
  });
  const response = new NextResponse(await result.text(), {
    status: result.status,
    headers: { "content-type": "application/json" },
  });
  if (result.ok) response.cookies.delete(TOKEN_COOKIE);
  return response;
}
