import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const clientId = process.env.META_APP_ID;
  const baseUrl = process.env.NEXTAUTH_URL;

  if (!clientId || !baseUrl) {
    return NextResponse.json(
      { error: "Meta OAuth not configured" },
      { status: 500 }
    );
  }

  const redirectUri = `${baseUrl}/api/meta/callback`;
  const state = (session.user as { id: string }).id;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "ads_management,ads_read",
    state,
    response_type: "code",
  });

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
