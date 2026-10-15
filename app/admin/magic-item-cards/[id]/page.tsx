import Link from "next/link";
import { notFound } from "next/navigation";

import {
  revokeMagicItemCard,
  updateMagicItemCardDefinition,
} from "@/app/admin/magic-item-cards/actions";
import { AdminMagicItemCardAwardForm } from "@/components/admin-magic-item-card-award-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireAdminUser } from "@/lib/admin";
import { listMagicItemCardImages } from "@/lib/magic-item-card-image-upload";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatOptional(value: string) {
  return value.trim() || "Not added";
}

export default async function AdminMagicItemCardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ card?: string }>;
}) {
  await requireAdminUser();
  const { id } = await params;
  const query = await searchParams;

  const [definition, characters, availableImages] = await Promise.all([
    prisma.magicItemCardDefinition.findUnique({
      where: { id },
      include: {
        awards: {
          include: {
            character: {
              include: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            gameParticipant: {
              select: {
                chestCode: true,
              },
            },
          },
          orderBy: [{ limitedEditionNumber: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.character.findMany({
      include: {
        user: {
          select: {
            name: true,
          },
        },
        participants: {
          where: {
            chestCode: { not: null },
            chestCodeRedeemedAt: { not: null },
            logStatus: "APPROVED",
            game: { status: "COMPLETED" },
          },
          include: {
            game: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ user: { name: "asc" } }, { name: "asc" }],
    }),
    listMagicItemCardImages(),
  ]);

  if (!definition) {
    notFound();
  }

  const statusMessages: Record<string, string> = {
    awarded: "Card awarded.",
    created: "Catalog card created.",
    "duplicate-code": "That chest code has already awarded this card.",
    "duplicate-name": "Another catalog card already uses that item name.",
    "image-invalid": "Card images must be JPG, PNG, or WEBP files no larger than 10 MB each.",
    "images-required": "Choose or upload both a front image and a back image.",
    invalid: "The card change could not be completed.",
    "limit-too-low": "The limited-edition total cannot be lower than the number already given out.",
    "limit-reached": "This card has reached its limited-edition maximum.",
    revoked: "Awarded card removed from the character.",
    updated: "Card details updated.",
    "update-invalid": "Enter a card name and a valid limited-edition total.",
  };
  const statusMessage = query.card ? statusMessages[query.card] : "";
  const isFrontImage = (label: string) => /(?:-|_)front(?:-[^.]+)?\.[^.]+$/i.test(label);
  const isBackImage = (label: string) => /(?:-|_)back(?:-[^.]+)?\.[^.]+$/i.test(label);
  const frontImages = availableImages.filter((image) => isFrontImage(image.label));
  const backImages = availableImages.filter((image) => isBackImage(image.label));

  if (!frontImages.some((image) => image.path === definition.frontImagePath)) {
    frontImages.unshift({
      label: definition.frontImagePath.split("/").pop() || definition.frontImagePath,
      path: definition.frontImagePath,
    });
  }

  if (!backImages.some((image) => image.path === definition.backImagePath)) {
    backImages.unshift({
      label: definition.backImagePath.split("/").pop() || definition.backImagePath,
      path: definition.backImagePath,
    });
  }

  return (
    <main className="page-shell stack">
      <AdminPageHeader
        title={definition.itemName}
        description="Inspect this card and manage every awarded copy."
        extraActions={
          <Link className="button secondary" href="/admin/magic-item-cards">
            Back to card catalog
          </Link>
        }
      />

      {statusMessage ? <p style={{ margin: 0 }}>{statusMessage}</p> : null}

      <section className="admin-magic-card-detail-layout">
        <div className="admin-magic-card-image-pair">
          <figure>
            <img src={definition.frontImagePath} alt={`${definition.itemName} card front`} />
            <figcaption>Front</figcaption>
          </figure>
          <figure>
            <img src={definition.backImagePath} alt={`${definition.itemName} card back`} />
            <figcaption>Back</figcaption>
          </figure>
        </div>

        <div className="stack admin-magic-card-definition-details">
          <h2 style={{ margin: 0 }}>Card details</h2>
          <dl className="magic-card-detail-grid">
            <div>
              <dt>Counts as:</dt>
              <dd>{formatOptional(definition.countsAs)}</dd>
            </div>
            <div>
              <dt>Rarity:</dt>
              <dd>{formatOptional(definition.rarity)}</dd>
            </div>
            <div>
              <dt>Minor property:</dt>
              <dd>{formatOptional(definition.minorProperty)}</dd>
            </div>
            <div>
              <dt>Awarded:</dt>
              <dd>{definition.awardedCount}</dd>
            </div>
            <div>
              <dt>Limited:</dt>
              <dd>
                {definition.limitedEditionLimit != null
                  ? `${definition.awardedCount}/${definition.limitedEditionLimit}`
                  : "Not limited"}
              </dd>
            </div>
          </dl>
          <div>
            <h3>Flavor and notes</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {formatOptional(definition.flavorNotes)}
            </p>
          </div>
        </div>
      </section>

      <section className="list-card stack">
        <div>
          <h2 style={{ margin: 0 }}>Edit card details</h2>
        </div>

        <form action={updateMagicItemCardDefinition} className="form-stack">
          <input name="definitionId" type="hidden" value={definition.id} />
          <div className="form-grid">
            <label>
              Item name
              <input
                defaultValue={definition.itemName}
                maxLength={160}
                name="itemName"
                required
                type="text"
              />
            </label>
            <label>
              Counts as
              <input
                defaultValue={definition.countsAs}
                maxLength={240}
                name="countsAs"
                type="text"
              />
            </label>
            <label>
              Rarity
              <input
                defaultValue={definition.rarity}
                maxLength={120}
                name="rarity"
                type="text"
              />
            </label>
            <label>
              Minor property
              <input
                defaultValue={definition.minorProperty}
                maxLength={240}
                name="minorProperty"
                type="text"
              />
            </label>
            <label>
              Limited-edition total
              <input
                defaultValue={definition.limitedEditionLimit ?? ""}
                min={Math.max(1, definition.awardedCount)}
                name="limitedEditionLimit"
                step={1}
                type="number"
              />
            </label>
          </div>

          <div className="form-grid admin-magic-card-create-images">
            <label>
              Front image
              <select defaultValue={definition.frontImagePath} name="frontImagePath">
                {frontImages.map((image) => (
                  <option key={image.path} value={image.path}>{image.label}</option>
                ))}
              </select>
            </label>
            <label>
              Replace front image
              <input accept="image/jpeg,image/png,image/webp" name="frontImage" type="file" />
            </label>
            <label>
              Back image
              <select defaultValue={definition.backImagePath} name="backImagePath">
                {backImages.map((image) => (
                  <option key={image.path} value={image.path}>{image.label}</option>
                ))}
              </select>
            </label>
            <label>
              Replace back image
              <input accept="image/jpeg,image/png,image/webp" name="backImage" type="file" />
            </label>
          </div>

          <label>
            Flavor and notes
            <textarea
              defaultValue={definition.flavorNotes}
              maxLength={4000}
              name="flavorNotes"
              rows={7}
            />
          </label>

          <button className="button" type="submit">Save card details</button>
        </form>
      </section>

      <section className="list-card stack">
        <div>
          <h2 style={{ margin: 0 }}>Award this card</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Choose a character and optionally associate one of their redeemed chest codes.
          </p>
        </div>
        <AdminMagicItemCardAwardForm
          definitionId={definition.id}
          characters={characters.map((character) => ({
            id: character.id,
            name: character.name,
            playerName: character.user.name,
            chestCodes: character.participants.flatMap((participant) =>
              participant.chestCode
                ? [
                    {
                      id: participant.id,
                      code: participant.chestCode,
                      gameTitle: participant.game.title,
                    },
                  ]
                : [],
            ),
          }))}
        />
      </section>

      <section className="list-card stack">
        <div>
          <h2 style={{ margin: 0 }}>Award history</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {definition.awards.length} active award
            {definition.awards.length === 1 ? "" : "s"}
          </p>
        </div>

        {definition.awards.length ? (
          <div className="table-wrap">
            <table className="admin-magic-card-awards-table">
              <thead>
                <tr>
                  <th>#/#</th>
                  <th>Character</th>
                  <th>Player</th>
                  <th>Chest code</th>
                  <th>Awarded</th>
                  <th aria-label="Card controls" />
                </tr>
              </thead>
              <tbody>
                {definition.awards.map((award) => (
                  <tr key={award.id}>
                    <td>
                      {award.limitedEditionNumber != null && award.limitedEditionLimit != null
                        ? `${award.limitedEditionNumber}/${award.limitedEditionLimit}`
                        : "Not added"}
                    </td>
                    <td>
                      <Link href={`/player/characters/${award.character.id}`}>
                        {award.character.name}
                      </Link>
                    </td>
                    <td>{award.character.user.name}</td>
                    <td>{award.gameParticipant?.chestCode ?? "Manual admin award"}</td>
                    <td>{formatDateTime(award.createdAt)}</td>
                    <td>
                      <form action={revokeMagicItemCard}>
                        <input name="definitionId" type="hidden" value={definition.id} />
                        <input name="awardId" type="hidden" value={award.id} />
                        <ConfirmSubmitButton
                          className="button-danger button-small"
                          message={`Remove ${definition.itemName} from ${award.character.name}?`}
                        >
                          Take away
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">This card has not been awarded.</p>
        )}
      </section>
    </main>
  );
}
