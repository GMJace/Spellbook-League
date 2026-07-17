"use server";

import {
  createGrimoireCuratedGame,
  createGrimoireEvent,
} from "@/app/admin/grimoire-gathering/actions";

export async function submitCreateGrimoireEvent(formData: FormData) {
  await createGrimoireEvent(formData);
}

export async function submitCreateGrimoireCuratedGame(formData: FormData) {
  await createGrimoireCuratedGame(formData);
}
