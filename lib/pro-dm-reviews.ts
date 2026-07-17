import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isFutureDateInput, isValidDateInput } from "@/lib/pro-dm-rating";

export type ProDmReview = {
  id: string;
  userId: string;
  game: string;
  date: string;
  rating: number;
  notes: string | null;
  createdAt: string;
};

export type ProDmRatingSummary = {
  rating: number;
  reviewCount: number;
};

const PRO_DM_REVIEWS_PATH = path.join(process.cwd(), "data", "pro-dm-reviews.json");

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeReview(entry: Partial<ProDmReview> & { userId: string }): ProDmReview {
  return {
    id:
      entry.id ??
      `${entry.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    userId: entry.userId,
    game: normalizeText(entry.game) ?? "Unknown game",
    date: normalizeText(entry.date) ?? "",
    rating: Math.max(1, Math.min(5, Number(entry.rating ?? 5))),
    notes: normalizeText(entry.notes),
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

function isPublicReview(review: ProDmReview) {
  return isValidDateInput(review.date) && !isFutureDateInput(review.date);
}

async function writeProDmReviews(reviews: ProDmReview[]) {
  await mkdir(path.dirname(PRO_DM_REVIEWS_PATH), { recursive: true });
  await writeFile(PRO_DM_REVIEWS_PATH, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
}

export async function getProDmReviews() {
  try {
    const file = await readFile(PRO_DM_REVIEWS_PATH, "utf8");
    const parsed = JSON.parse(file);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is Partial<ProDmReview> & { userId: string } => {
        return Boolean(entry && typeof entry === "object" && typeof entry.userId === "string");
      })
      .map((entry) => normalizeReview(entry))
      .filter((review) => isPublicReview(review));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function addProDmReview(
  review: Omit<ProDmReview, "id" | "createdAt">
) {
  const reviews = await getProDmReviews();
  reviews.push(normalizeReview(review));
  await writeProDmReviews(reviews);
}

export async function removeProDmReview(reviewId: string) {
  const reviews = await getProDmReviews();
  const reviewIndex = reviews.findIndex((review) => review.id === reviewId);

  if (reviewIndex === -1) {
    return null;
  }

  const [removedReview] = reviews.splice(reviewIndex, 1);
  await writeProDmReviews(reviews);

  return removedReview;
}

export function getProDmRatingSummary(
  userId: string,
  fallbackRating: number,
  reviews: ProDmReview[]
): ProDmRatingSummary {
  const userReviews = reviews.filter((review) => review.userId === userId);

  if (!userReviews.length) {
    return {
      rating: fallbackRating,
      reviewCount: 0,
    };
  }

  const averageRating =
    userReviews.reduce((sum, review) => sum + review.rating, 0) / userReviews.length;

  return {
    rating: Number(averageRating.toFixed(1)),
    reviewCount: userReviews.length,
  };
}

export function getProDmRatingSummaryMap(
  entries: Array<{ userId: string; rating: number }>,
  reviews: ProDmReview[]
) {
  return new Map(
    entries.map((entry) => [
      entry.userId,
      getProDmRatingSummary(entry.userId, entry.rating, reviews),
    ])
  );
}
