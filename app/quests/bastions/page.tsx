import type { Metadata } from "next";
import Link from "next/link";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";

export const metadata: Metadata = {
  title: "Bastions of the Keep | SPELLBOOK QUESTS",
  description: "Explore the Keep’s Bastion facilities, tier requirements, and Downtime orders for SPELLBOOK QUESTS.",
};

type FacilityRow = { facility: string; order: string; result: string };

const tier1: FacilityRow[] = [
  {
    facility: "Arcane Study",
    order: "Craft",
    result: "Commission an Arcane Focus or pay 10 GP for a blank book. Requires the ability to use an Arcane Focus or a tool as a Spellcasting Focus.",
  },
  {
    facility: "Garden",
    order: "Harvest",
    result: "Choose one available harvest. Decorative yields 10 bouquets, 10 vials of Perfume, or 10 Candles. Food yields 100 days of Rations. Herb yields 10 Healer’s Kits or one Potion of Healing. Poison yields two vials of Antitoxin or one vial of Basic Poison. Produce and supplies from this order are for use or donation.",
  },
  {
    facility: "Library",
    order: "Research",
    result: "Choose a legend, known event or location, notable person, kind of creature, or famous object. The QUEST Weaver provides up to three accurate facts new to your agent.",
  },
  {
    facility: "Sanctuary",
    order: "Craft",
    result: "Commission a Holy Symbol or a wooden staff Druidic Focus. Requires the ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus.",
  },
  {
    facility: "Smithy",
    order: "Craft",
    result: "Commission eligible nonmagical equipment made with Smith’s Tools. Use the applicable crafting time and cost.",
  },
  {
    facility: "Storehouse",
    order: "Trade",
    result: "Procure eligible nonmagical trade goods and supplies at standard prices. The total order limit is 500 GP in Tier 1, 2,000 GP in Tier 2, and 5,000 GP in Tiers 3 and 4. Sales use the normal QUESTS rules.",
  },
  {
    facility: "Workshop",
    order: "Craft",
    result: "Commission eligible mundane gear using the Keep’s artisan’s tools. Use the applicable crafting time and cost. Confirm that the Workshop has the tools needed for your order.",
  },
];

const tier2: FacilityRow[] = [
  {
    facility: "Greenhouse",
    order: "Harvest",
    result: "Receive one Potion of Healing (greater) or one dose of an eligible game poison chosen from Assassin’s Blood, Malice, Pale Tincture, or Truth Serum.",
  },
  {
    facility: "Laboratory",
    order: "Craft",
    result: "Commission eligible mundane items made with Alchemist’s Supplies using their crafting time and cost. Alternatively, commission one dose of Burnt Othur Fumes, Essence of Ether, or Torpor if eligible. The poison order costs 7 Downtime days and half the listed price.",
  },
  {
    facility: "Sacristy",
    order: "Craft",
    result: "Commission one flask of Holy Water at its standard potency. Requires the ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus.",
  },
  {
    facility: "Scriptorium",
    order: "Craft",
    result: "Copy a nonmagical book by supplying the original and a blank book, or commission up to 50 copies of a handbill at 1 GP per copy. You can also commission an eligible Spell Scroll of a Cleric or Wizard spell of level 3 or lower using the spell’s normal scribing time, GP, and component costs. The scribe meets the scribing prerequisites.",
  },
  {
    facility: "Stable",
    order: "Trade",
    result: "Purchase an eligible mount at standard price, subject to availability, or arrange a loan for an approved QUEST. A loan covers that QUEST and ends on return to the Keep. Sales use the normal QUESTS rules.",
  },
  {
    facility: "Training Area",
    order: "Empower",
    result: "Choose one of the training benefits below. Your agent attends the training personally. This is a session benefit.",
  },
  {
    facility: "Trophy Room",
    order: "Research",
    result: "Investigate a legend, kind of creature, or famous object. The QUEST Weaver provides up to three accurate facts new to your agent.",
  },
];

const tier3: FacilityRow[] = [
  {
    facility: "Archive",
    order: "Research",
    result: "Request a report on a person, place, or object. The archivist’s findings are equivalent to what a casting of Legend Lore would reveal, as determined by the QUEST Weaver.",
  },
  {
    facility: "Meditation Chamber",
    order: "Empower",
    result: "Roll twice on a d6, rerolling duplicates. In order, the results correspond to Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Gain Advantage on saving throws using those two abilities. This is a session benefit.",
  },
  {
    facility: "Observatory",
    order: "Empower",
    result: "Roll a die. On an odd result, choose a Charm of Darkvision, Heroism, or Vitality. On an even result, the observation grants no Charm. The Charm is a session benefit and must be used during that session. Requires the ability to use a Spellcasting Focus.",
  },
  {
    facility: "Pub",
    order: "Research",
    result: "Ask the staff to investigate a local event or locate a creature familiar to you. The QUEST Weaver defines the network’s reach and determines what its contacts can learn.",
  },
  {
    facility: "Reliquary",
    order: "Empower",
    result: "Receive a Charm that lets you cast Greater Restoration once without spending a spell slot or providing Material components. This is a session benefit. Requires the ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus.",
  },
];

const tier4: FacilityRow[] = [
  {
    facility: "Demiplane",
    order: "Empower",
    result: "Spend the final Long Rest of your Downtime in a warded chamber. Begin the approved session with Temporary Hit Points equal to five times your level. This is a session benefit and follows the normal rules for Temporary Hit Points. Requires the ability to use an Arcane Focus or a tool as a Spellcasting Focus.",
  },
  {
    facility: "Guildhall",
    order: "Recruit",
    result: "Commission a guild for a specific assignment such as a survey, construction, or transport. Before spending, agree with the QUEST Weaver on the scope, time, GP, and deliverable. The guild’s work provides support for the campaign or QUEST. Requires Expertise in a skill.",
  },
  {
    facility: "Sanctum",
    order: "Empower",
    result: "Receive a Charm that lets you cast Heal once without spending a spell slot. This is a session benefit. Requires the ability to use a Holy Symbol or Druidic Focus as a Spellcasting Focus.",
  },
  {
    facility: "War Room",
    order: "Recruit",
    result: "Request ORDO personnel for a defined role, such as reconnaissance, evacuation, or holding a position. Agree on the scope and any provisioning costs with the QUEST Weaver before spending. Personnel remain under ORDO command. Requires a Fighting Style or Unarmored Defense feature.",
  },
];

const ordo: FacilityRow[] = [
  {
    facility: "Armory",
    order: "Tier 1",
    result: "Stock equipment for a Keep defense or issue gear for a specific assignment.",
  },
  {
    facility: "Barrack",
    order: "Tier 1",
    result: "Recruit and house ORDO defenders. The Keep maintains their roster.",
  },
  {
    facility: "Gaming Hall",
    order: "Tier 2",
    result: "Host a tournament, social scene, or information exchange. Winnings are campaign-specific.",
  },
  {
    facility: "Teleportation Circle",
    order: "Tier 2",
    result: "Arrange approved transit or invite a visiting spellcaster for a specific service. The QUEST Weaver determines access, destination, and spell availability. Pay any required costly spell components.",
  },
  {
    facility: "Theater",
    order: "Tier 2",
    result: "Stage a performance or use a production to support a campaign storyline. The QUEST Weaver can use the source rules for rehearsals and Theater dice within that campaign.",
  },
  {
    facility: "Menagerie",
    order: "Tier 3",
    result: "House, study, or manage creatures in ORDO custody. The QUEST Weaver controls acquisition and deployment.",
  },
];

function FacilityTable({ title, rows, campaign = false }: {
  title: string;
  rows: FacilityRow[];
  campaign?: boolean;
}) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={title}>
      <table className="bastion-facility-table">
        <colgroup>
          <col className="bastion-facility-name" />
          <col className="bastion-facility-order" />
          <col />
        </colgroup>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Facility</th>
            <th scope="col">{campaign ? "Minimum tier" : "Order"}</th>
            <th scope="col">{campaign ? "Campaign use" : "Result"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ facility, order, result }) => (
            <tr key={facility}>
              <th scope="row">{facility}</th>
              <td>{order}</td>
              <td>{result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BastionsPage() {
  return (
    <div className="stack quests-guide-page" id="bastions-top">
      <header className="panel stack quests-guide-header">
        <div className="quests-guide-title">
          <img src="/Q-book-logo.png" width="69" height="81" alt="" />
          <div>
            <p className="eyebrow"><RainbowSpellbook /> QUESTS</p>
            <h1>Bastions of the Keep</h1>
          </div>
        </div>
        <nav className="inline-actions" aria-label="Related QUESTS pages">
          <Link className="button button-secondary button-small" href="/quests/players-guide#downtime">Player’s Guide</Link>
          <Link className="button button-secondary button-small" href="/quests/dm-guide">DM’s Guide</Link>
        </nav>
      </header>

      <div className="panel quests-guide-copy">
        <p>When ORDO agents return to the Keep in the City of Doors, their work continues. An agent might commission a replacement focus, ask an archivist to trace a planar relic, or train for the next assignment. These services are provided by Bastion facilities maintained and staffed by the ORDO.</p>
        <p>Campaign rules may vary by DM. Talk with your DM about how Bastions work in your campaign before spending Downtime. The rules below apply to shared SPELLBOOK QUESTS play. A QUEST Weaver can approve a facility benefit for their own adventure. Campaign-specific benefits apply within that campaign unless SPELLBOOK QUESTS rules also allow them in shared play.</p>
      </div>

      <article className="panel quests-guide-copy">
        <section id="using-a-facility">
          <h2>Using a Bastion Facility</h2>
          <p>An ORDO agent can use an open facility if they are in its listed tier or higher and meet any listed prerequisite. Facilities belong to the Keep. Its staff handle upkeep, staffing, and security. Your agent spends Downtime to request a service or participate in an activity.</p>
          <ol>
            <li><strong>Choose an order.</strong> Pick one listed activity and confirm any choices that affect the result. For research, name your subject and what you want to learn. For crafting, name the item and confirm its eligibility and costs.</li>
            <li><strong>Confirm rulings before spending.</strong> Ask your QUEST Weaver about activities that require a ruling, an NPC response, or a benefit you intend to bring into their session. Agree on the cost and expected outcome or possible outcomes before logging the spend.</li>
            <li><strong>Log the spend.</strong> Use the character’s Downtime record in the SPELLBOOK app. Record the facility, order, days spent, any GP or materials spent, and the result. Record the approving QUEST Weaver and session when relevant. The character receiving the service pays its full Downtime cost.</li>
            <li><strong>Resolve and record the result.</strong> Spend the full cost in one entry. Once the spend is logged and any required roll or ruling is resolved, the order is complete. Add a permitted item to your character’s inventory once, or record the information or benefit in the same entry.</li>
          </ol>
        </section>

        <section id="downtime-and-rewards">
          <h2>Downtime and rewards</h2>
          <ul>
            <li><strong>Time.</strong> One day of work costs one day of logged Downtime. Most orders cost 7 Downtime days. An activity with its own duration uses that duration instead. Use the crafting rules referenced by the order where the cost varies by item. A failed roll still spends the days and any costs agreed before the roll.</li>
            <li><strong>Costs.</strong> Pay listed GP and provide required materials in addition to Downtime. Where an order lists a crafting cost, apply the relevant crafting rules and count each material expense once.</li>
            <li><strong>Inventory.</strong> Bastion orders can award eligible mundane gear and the consumables expressly listed below, subject to QUESTS item rules. Permanent magic items follow the Loot Chest rules. Staff, mounts on loan, and ORDO equipment remain under the Keep’s authority. Items supplied for an assignment are returned at its conclusion.</li>
            <li><strong>Temporary benefits.</strong> An effect marked session benefit is reserved for one named session with that QUEST Weaver’s approval. It begins at the start of the session and ends when used, when its normal in-game duration ends, or when the session ends, whichever comes first. An agent may bring one Bastion session benefit into a session. If the session is cancelled, the same QUEST Weaver can approve moving the benefit to a replacement session.</li>
            <li><strong>Research.</strong> QUEST Weavers decide what their adventure’s sources can reveal. A successful order can produce leads, context, or corroboration that fits what ORDO staff could plausibly learn. Confirm that a subject is researchable before spending days.</li>
          </ul>
          <p><strong>Example.</strong> A Tier 1 agent spends 7 Downtime days at the Library to investigate a sigil recovered on a QUEST. The QUEST Weaver provides two findings and the agent records both in the Downtime entry. The Library charges no GP for this order.</p>
        </section>

        <section id="agent-facilities">
          <h2>Facilities Open to Agents</h2>
          <p>Orders cost 7 Downtime days and no GP unless the entry specifies otherwise.</p>
          <FacilityTable title="Tier 1 (Levels 1–4)" rows={tier1} />
          <FacilityTable title="Tier 2 (Levels 5–10)" rows={tier2} />
          <p><strong>Training Area benefits.</strong> Choose one when you log the order.</p>
          <ul>
            <li><strong>Battle Expert.</strong> When an Unarmed Strike or weapon attack deals damage to you, you can take a Reaction to reduce that damage by 1d4.</li>
            <li><strong>Skills Expert.</strong> Gain proficiency in Acrobatics, Athletics, Performance, Sleight of Hand, or Stealth.</li>
            <li><strong>Tools Expert.</strong> Gain proficiency with one tool.</li>
            <li><strong>Unarmed Combat Expert.</strong> When you hit with an Unarmed Strike and deal damage, the attack deals an extra 1d4 Bludgeoning damage.</li>
            <li><strong>Weapon Expert.</strong> Choose one kind of Simple or Martial weapon. Gain proficiency with it if you lack it. If you already have proficiency, you can use its mastery property.</li>
          </ul>
          <FacilityTable title="Tier 3 (Levels 11–16)" rows={tier3} />
          <FacilityTable title="Tier 4 (Levels 17–20)" rows={tier4} />
        </section>

        <section id="ordo-facilities">
          <h2>Facilities Managed by the ORDO</h2>
          <p>These facilities can appear in an adventure or campaign. The QUEST Weaver determines access, outcomes, and any Downtime and GP costs before an agent uses them.</p>
          <FacilityTable title="ORDO campaign facilities" rows={ordo} campaign />
          <p>Keep-wide construction, facility expansion, defender losses, and Bastion Events are handled as campaign events. Passive benefits tied to resting or visiting a facility are available in play when the QUEST Weaver uses the facility in a scene. Shared-play benefits that carry into a session use the orders listed above.</p>
        </section>

        <p><a href="#bastions-top">Back to top</a></p>
      </article>
    </div>
  );
}
