import { NextResponse } from "next/server";
import { z } from "zod";
import { startSession } from "@/lib/auth";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const parsed = z.object({ idToken: z.string().min(100).max(10000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Firebase sign-in token is missing." }, { status: 400 });
  try {
    const needsProfile = await startSession(parsed.data.idToken);
    return NextResponse.json({ ok: true, needsProfile });
  } catch {
    return NextResponse.json({ error: "Firebase could not verify this sign-in. Check Firebase configuration and try again." }, { status: 401 });
  }
}
