import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { ownerSmsPhone } from "@/lib/config";
import { testAlert } from "@/lib/messages";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const denied = await requireOwner();
  if (denied) return denied;

  const result = await sendSms(ownerSmsPhone(), testAlert());
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
