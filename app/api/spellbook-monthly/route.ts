import { NextResponse } from "next/server";
import {
  processSpellbookMonthlySubscription,
  spellbookMonthlySchema,
  SPELLBOOK_MONTHLY_SAVE_ERROR_MESSAGE,
} from "@/lib/spellbook-monthly";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const parsed = spellbookMonthlySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    const result = await processSpellbookMonthlySubscription(parsed.data.email);

    return NextResponse.json({
      success: result.success,
    });
  } catch (error) {
    console.error("Failed to save SPELLBOOK Monthly subscription.", error);

    return NextResponse.json(
      { error: SPELLBOOK_MONTHLY_SAVE_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}
