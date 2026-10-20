import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "OTP is handled by Firebase Phone Authentication. Use the KHOJO sign-in form." }, { status: 410 }); }
