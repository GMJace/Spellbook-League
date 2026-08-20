import type { TradingPostProposalStatus, TradingPostRarity } from "@prisma/client";

export const TRADING_POST_RARITY_OPTIONS: Array<{
  label: string;
  value: TradingPostRarity;
}> = [
  { value: "COMMON", label: "Common" },
  { value: "UNCOMMON", label: "Uncommon" },
  { value: "RARE", label: "Rare" },
  { value: "VERY_RARE", label: "Very Rare" },
  { value: "LEGENDARY", label: "Legendary" },
  { value: "UNIQUE", label: "Unique / Artifact" },
];

export function formatTradingPostRarity(rarity: TradingPostRarity) {
  return TRADING_POST_RARITY_OPTIONS.find((option) => option.value === rarity)?.label ?? rarity;
}

export function formatTradingPostProposalStatus(status: TradingPostProposalStatus) {
  switch (status) {
    case "PENDING":
      return "Pending review";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "WITHDRAWN":
      return "Withdrawn";
    default:
      return status;
  }
}

export function formatTradingPostItemName(item: { item: string; itemName: string }) {
  if (item.itemName?.trim() && item.itemName.trim() !== item.item.trim()) {
    return `${item.itemName.trim()} (counts as ${item.item.trim()})`;
  }

  return item.itemName?.trim() || item.item.trim();
}
