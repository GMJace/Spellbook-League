"use server";

import {
  processSpellbookMonthlySubscription,
  spellbookMonthlySchema,
  SPELLBOOK_MONTHLY_SAVE_ERROR_MESSAGE,
} from "@/lib/spellbook-monthly";

export type SpellbookMonthlyState = {
  error: string;
  success: string;
};

export async function subscribeToSpellbookMonthly(
  _previousState: SpellbookMonthlyState,
  formData: FormData
): Promise<SpellbookMonthlyState> {
  const parsed = spellbookMonthlySchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: "Enter a valid email address.",
      success: "",
    };
  }

  try {
    const result = await processSpellbookMonthlySubscription(parsed.data.email);
    return {
      error: "",
      success: result.success,
    };
  } catch (error) {
    console.error("Failed to save SPELLBOOK Monthly subscription.", error);

    return {
      error: SPELLBOOK_MONTHLY_SAVE_ERROR_MESSAGE,
      success: "",
    };
  }
}
