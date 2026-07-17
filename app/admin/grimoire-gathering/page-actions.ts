"use server";

import {
  deleteGrimoireCuratedGame,
  deleteGrimoireEvent,
  moderateGrimoireDmSubmission,
  updateGrimoireCuratedGame,
  updateGrimoireEvent,
} from "@/app/admin/grimoire-gathering/actions";

export async function submitDeleteEvent(formData: FormData) {
  await deleteGrimoireEvent(formData);
}

export async function submitDeleteCuratedGame(formData: FormData) {
  await deleteGrimoireCuratedGame(formData);
}

export async function submitModerationDecision(formData: FormData) {
  await moderateGrimoireDmSubmission(formData);
}

export async function submitEventUpdate(formData: FormData) {
  await updateGrimoireEvent(formData);
}

export async function submitCuratedGameUpdate(formData: FormData) {
  await updateGrimoireCuratedGame(formData);
}
