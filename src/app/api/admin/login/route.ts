import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  checkPasscode,
  createAdminToken,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { passcode?: string };
    const passcode = typeof body.passcode === "string" ? body.passcode.trim() : "";

    if (!passcode || !checkPasscode(passcode)) {
      return NextResponse.json(
        { error: "Invalid clinic admin passcode." },
        { status: 401 }
      );
    }

    const isHttps =
      request.url.startsWith("https://") ||
      request.headers.get("x-forwarded-proto") === "https";

    const token = createAdminToken();
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
      secure: isHttps,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
