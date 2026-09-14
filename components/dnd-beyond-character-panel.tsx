"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DndBeyondCharacterImport } from "@/lib/dnd-beyond-character-import";

export function DndBeyondCharacterPanel({ characterId, link, data, syncedAt, savedError }: {
  characterId: string; link: string; data: string | null; syncedAt: string | null; savedError: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [localSyncedAt, setLocalSyncedAt] = useState(syncedAt);
  useEffect(() => { setLocalSyncedAt(syncedAt ? new Date(syncedAt).toLocaleString() : null); }, [syncedAt]);
  const imported = useMemo(() => {
    try { return data ? JSON.parse(data) as DndBeyondCharacterImport : null; } catch { return null; }
  }, [data]);
  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage("Checking D&D Beyond…");
    try {
      const response = await fetch(`/api/characters/${encodeURIComponent(characterId)}/dndbeyond-sync`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not refresh this character.");
      setMessage(result.status === "synced" ? "Character and inventory refreshed." : result.status === "recent" ? "A refresh was requested recently. Please allow 30 seconds between checks." : result.status === "changed" ? "The character was edited during refresh. Your edit was kept; try again shortly." : result.error || "Save a D&D Beyond character link to enable syncing.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Refresh failed. Saved information is still available."); }
    finally { setBusy(false); }
  }, [characterId, router]);
  useEffect(() => { void refresh(); }, [refresh, link]);
  const items = imported?.inventory?.filter(item => `${item.name} ${item.originalName} ${item.type} ${item.container}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  return (
    <section className="list-card stack" aria-labelledby="dnd-beyond-heading">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h2 id="dnd-beyond-heading" style={{ margin: 0 }}>D&amp;D Beyond inventory</h2>
          <p className="muted" style={{ margin: ".4rem 0 0" }}>Refreshes when this log opens. Last synced: {localSyncedAt || "Not yet synced"}.</p>
        </div>
        <button type="button" className="button-secondary" disabled={busy} onClick={() => void refresh()}>{busy ? "Refreshing…" : "Refresh now"}</button>
      </div>
      <p role="status" style={{ margin: 0 }}>{message || savedError}</p>
      {savedError ? <p className="muted">Last refresh error: {savedError}</p> : null}
      {imported?.warnings.map(warning => <p key={warning} className="muted" style={{ margin: 0 }}>{warning}</p>)}
      {imported ? <>
        <p className="muted" style={{ margin: 0 }}>D&amp;D Beyond currency: {Object.entries(imported.currencies).map(([unit, amount]) => `${amount.toLocaleString("en-US")} ${unit.toUpperCase()}`).join(" · ") || "Not supplied"}. SPELLBOOK gold and league item selections are managed separately.</p>
        <label>Find an inventory item<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Item, type, or container" /></label>
        <p style={{ margin: 0 }}>{items.length} of {imported.inventory.length} inventory entries</p>
        <div style={{ overflowX: "auto", maxHeight: "36rem" }}>
          <table style={{ width: "100%", textAlign: "left" }}>
            <caption className="muted">All items currently in the linked D&amp;D Beyond inventory</caption>
            <thead><tr>{["Item", "Quantity", "Type / rarity", "Container", "Status"].map(label => <th key={label} scope="col" style={{ padding: ".6rem" }}>{label}</th>)}</tr></thead>
            <tbody>{items.map(item => <tr key={item.id}>
              <td style={{ padding: ".6rem", minWidth: "15rem" }}>
                <strong>{item.name}</strong>{item.name !== item.originalName ? <div className="muted">{item.originalName}</div> : null}
                {item.notes ? <p style={{ margin: ".3rem 0" }}>{item.notes}</p> : null}
                {item.description ? <details><summary className="muted">Item details</summary><p>{item.description}</p>{item.weight != null ? <p>Weight per item: {item.weight} lb.</p> : null}</details> : null}
              </td>
              <td style={{ padding: ".6rem" }}>{item.quantity}</td>
              <td style={{ padding: ".6rem" }}>{[item.type, item.rarity].filter(Boolean).join(" · ")}</td>
              <td style={{ padding: ".6rem" }}>{item.container}</td>
              <td style={{ padding: ".6rem" }}>{[item.equipped && "Equipped", item.attuned && "Attuned", item.custom && "Custom", item.consumable && "Consumable"].filter(Boolean).join(" · ") || "—"}</td>
            </tr>)}</tbody>
          </table>
          {!items.length ? <p>{query ? "No matching items." : "No inventory items on this character."}</p> : null}
        </div>
        {imported.spells.length ? <details><summary>Spells ({imported.spells.length})</summary><ul>{imported.spells.map(spell => <li key={spell.name}>{spell.name} — {spell.level === 0 ? "Cantrip" : `Level ${spell.level ?? "unknown"}`}</li>)}</ul></details> : null}
      </> : <p className="muted">Inventory will appear after the first successful refresh. The linked character must be Public on D&amp;D Beyond.</p>}
    </section>
  );
}
