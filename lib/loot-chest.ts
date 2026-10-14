import { randomBytes } from "node:crypto";

const CHEST_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CHEST_CODE_LENGTH = 12;

export function generateChestCode() {
  const bytes = randomBytes(CHEST_CODE_LENGTH);
  const code = Array.from(bytes, (byte) => CHEST_CODE_ALPHABET[byte % CHEST_CODE_ALPHABET.length]).join("");

  return `CHEST-${code.match(/.{1,4}/g)?.join("-") ?? code}`;
}
