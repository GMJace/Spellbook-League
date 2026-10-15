import type { Metadata } from "next";
import Link from "next/link";
import { QuestsGuideShell } from "@/components/quests-guide-shell";

export const metadata: Metadata = {
  title: "QUESTS Player's Guide | SPELLBOOK",
  description: "Create your ORDO character, prepare for QUESTS, and learn about loot, advancement, achievements, downtime, and trading.",
};

const contents = [
  ["welcome", "Welcome to QUESTS"],
  ["getting-started", "Getting started"],
  ["etiquette", "Etiquette and safety"],
  ["rules-sources", "Rules sources"],
  ["ordo", "The ORDO and its oath"],
  ["character-creation", "Character creation"],
  ["before-play", "Before play and mustering"],
  ["earnings", "Gameplay earnings"],
  ["treasure", "Treasure and carry limits"],
  ["loot-chests", "Opening Loot Chests"],
  ["advancement", "Gaining levels"],
  ["grim-tidings", "Grim Tidings"],
  ["achievements", "Achievements"],
  ["downtime", "Downtime activities"],
  ["trading", "Trading magic items"],
  ["recovery", "Death and recovery"],
  ["supporting-dms", "Supporting your DM"],
  ["after-session", "After every session"],
] as const;

export default function QuestsPlayersGuidePage() {
  return (
    <QuestsGuideShell slug="players-guide">
      <section className="panel stack quests-guide-copy">
        <p className="eyebrow">ORDO Player&apos;s Guide · Working Draft v0.3</p>
        <p>Adventure across the multiverse with the ORDO. Your reference for creating a character, joining QUESTS, and tracking the rewards that build your legend.</p>
        <div className="inline-actions">
          <a className="button button-small" href="/handbooks/spellbook-quests-ordo-players-guide-v0.3.pdf" download>Download Player&apos;s Guide PDF</a>
          <Link className="button button-secondary button-small" href="/league">Find a QUEST</Link>
        </div>
      </section>

      <nav className="panel quests-guide-contents" aria-label="Player's Guide contents">
        <h2>In this guide</h2>
        <ol>
          {contents.map(([id, title]) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}
        </ol>
      </nav>

      <article className="panel quests-guide-copy">
        <section id="welcome">
          <h2>Welcome to SPELLBOOK QUESTS</h2>
          <p>Join the ORDO, a guild of adventurers sworn to uphold balance, and find your next adventure on the QUESTBOARD. Your character can come from anywhere in the multiverse and explore every corner of it.</p>
          <p>DMs may weave DMsGuild adventures, official Adventurers League modules, Legends of Greyhawk adventures, or homebrew campaigns into the ORDO&apos;s mission. A universal reward system connects these stories, letting you build your character and trade magic items with fellow players.</p>
          <h3>What is a QUEST?</h3>
          <p>A QUEST is an adventure that may span one or more sessions. You do not need to finish the whole QUEST to earn session rewards. QUESTBOARD listings explain the adventure and planned number of sessions; for campaigns, discuss the expected length with your DM.</p>
          <p>Participate for at least <strong>three hours in a single session on the SPELLBOOK Discord</strong> to receive one chest code. Six hours earns two codes, nine hours earns three, and so on. Each Loot Chest has its own code. Unused hours do not carry over between sessions. WEAVER, the Discord bot, tracks gameplay sessions.</p>
        </section>

        <section id="getting-started">
          <h2>Getting started with QUESTS</h2>
          <ol>
            <li><a href="https://discord.gg/wxnpXZchWx" target="_blank" rel="noreferrer">Join the SPELLBOOK Discord.</a></li>
            <li>Create your character on <a href="https://www.dndbeyond.com/characters/builder" target="_blank" rel="noreferrer">DnDBeyond</a>.</li>
            <li><Link href="/player">Register your character in the SPELLBOOK App.</Link></li>
            <li><Link href="/league">Find a game on the QUESTBOARD.</Link></li>
          </ol>
          <p>The app tracks characters, sessions, rewards, and achievements. The QUESTBOARD connects you with games, and Discord brings the community together to meet, organize, and play.</p>
        </section>

        <section id="etiquette">
          <h2>Player and DM etiquette</h2>
          <p>Follow SPELLBOOK&apos;s Code of Conduct and treat everyone with respect, including players and characters with disabilities. Arrive prepared, pay attention, be ready for your turn, and share the spotlight. Strong characters are welcome, and everyone should have meaningful opportunities to contribute.</p>
          <p>Character choices, alignment, and the ORDO oath never excuse sabotage or disruption.</p>
          <h3>Safety and boundaries</h3>
          <p>QUESTS uses the <strong>Red Card</strong> safety tool. Anyone may call “Red Card” or use the agreed signal to pause play without explaining why. Stop, adjust the content, and resume when the group is ready. The DM discusses sensitive themes before play.</p>
          <h3>Player-versus-player conflict</h3>
          <p>PvP is permitted only in adventures that explicitly include it, with the informed agreement of everyone involved before participation. Otherwise, PvP is not allowed and the DM will stop it.</p>
          <h3>Rules decisions</h3>
          <p>The DM makes immediate rules calls, and their ruling stands for the session. Bring unresolved disputes to the Rules Chat Discord channel afterward. Discuss disagreements respectfully.</p>
        </section>

        <section id="rules-sources">
          <h2>Rules sources and updated content</h2>
          <p>Use the Player&apos;s Handbook or D&amp;D Basic Rules alongside QUESTS-approved content. Consult the Source List and Banned List when choosing options. An adventure&apos;s inclusion does not automatically approve its character options or rewards; QUESTS uses its own reward systems.</p>
          <p>Use the most recent version of approved content. Older options remain available if they have not been replaced and are not banned. When an approved update replaces an option, you have <strong>10 days from its global release date</strong> to update your character. New content becomes available when approved and announced through the app or Discord.</p>
        </section>

        <section id="ordo">
          <h2>Recruitment into the Watch</h2>
          <p>Every QUESTS character belongs to the ORDO, a secretive multiversal guild with seemingly limitless resources. Generally independent of political allegiances, it intervenes where The Balance is threatened. Its Keep is hidden within the City of Doors. Read the ORDO Primer for more lore.</p>
          <p>The ORDO observes potential recruits. Courage, resistance to unchecked power, or the discovery of a dangerous truth may attract its attention, before a senior officer delivers a summons to the Keep. This is a character-creation prompt, not an invitation requirement for players.</p>
          <p>Decide who you were before the summons, what deed drew the guild&apos;s attention, what belief you questioned, and what you hope to protect.</p>
          <h3>The ORDO oath</h3>
          <blockquote className="quests-guide-oath">
            <p>I stand where the balance falters.</p>
            <p>I will guard the vulnerable, confront unchecked power, and judge the cost of my actions.</p>
            <p>I will honor my companions and answer for my deeds.</p>
            <p>Across all worlds, I serve the balance.</p>
          </blockquote>
          <p>Balance may mean restoring an ecosystem, stopping a tyrant, containing dangerous magic, or protecting innocent lives. It does not require preserving cruelty or creating suffering to offset good deeds. The oath never overrides player boundaries or cooperation.</p>
        </section>

        <section id="character-creation">
          <h2>Character creation</h2>
          <p><strong>Starting level:</strong> Characters begin at level 3. Your level determines your tier.</p>
          <div className="table-wrap"><table>
            <caption>Character tiers</caption>
            <thead><tr><th scope="col">Tier</th><th scope="col">Character level</th></tr></thead>
            <tbody>
              <tr><th scope="row">Tier 1</th><td>3–4</td></tr>
              <tr><th scope="row">Tier 2</th><td>5–10</td></tr>
              <tr><th scope="row">Tier 3</th><td>11–16</td></tr>
              <tr><th scope="row">Tier 4</th><td>17–20</td></tr>
            </tbody>
          </table></div>
          <dl>
            <dt>Origin and setting</dt><dd>Choose a home world and background from anywhere in the multiverse. The ORDO operates from the City of Doors.</dd>
            <dt>Languages</dt><dd>You may select your heritage language if it is missing from the available choices, such as Infernal for a tiefling.</dd>
            <dt>Ability scores</dt><dd>Use Point Buy, then increase one ability score by 2 for specialized ORDO training. This bonus may exceed the normal character-creation maximum. You must have Intelligence or Wisdom of at least 10.</dd>
            <dt>Alignment</dt><dd>Choose an alignment compatible with your oath and party cooperation. Good or neutral are suggested. Discuss individual campaign expectations with your DM.</dd>
            <dt>Deity</dt><dd>You may follow a deity from your home setting or elsewhere. Service to The Balance takes precedence over religious allegiance.</dd>
            <dt>Starting equipment and gold</dt><dd>Begin with your standard starting equipment and gold, plus a <strong>1,000 gp stipend</strong> for joining the ORDO.</dd>
            <dt>Guilds and factions</dt><dd>Other memberships are allowed if you can honor your oath and cooperate with companions. They grant no automatic mechanical rewards. Your DM determines story benefits and consequences.</dd>
            <dt>Permanent class choices</dt><dd>Your class and subclass choices are permanent once made, including choices made when gaining additional class levels or selecting a subclass.</dd>
          </dl>
        </section>

        <section id="before-play">
          <h2>Before play</h2>
          <p>Resolve character options flagged by the app before joining a game. Consult its approved source list, banned list, and FAQ, or ask for help in Discord&apos;s Ask Us Anything channel.</p>
          <h3>Character checks and syncing</h3>
          <p>The app attempts to sync supported character data with D&amp;D Beyond when you open your character page and flags restricted options. Update your D&amp;D Beyond character link on that page.</p>
          <p>A flag is a request to check or correct an option, not an accusation. If it appears incorrect, request a review in Ask Us Anything. A successful sync cannot verify every in-game effect or past reward; you remain responsible for character accuracy. Report errors, unexpected results, or suspected exploits in Report a Bug.</p>
          <h3>Mustering for the game</h3>
          <p>Each DM has mustering and voice channels on Discord, with a thread for each game. Your app notifications provide the link when you purchase a ticket or your RSVP is confirmed.</p>
          <ol>
            <li>Open your character page in the app.</li>
            <li>Select <strong>Copy Muster Info</strong> and paste it into the game&apos;s mustering thread.</li>
            <li>Select <strong>Copy Player Token</strong> and paste it into the same thread.</li>
          </ol>
          <p>Posting your details helps both the DM and your fellow players prepare.</p>
        </section>

        <section id="earnings">
          <h2>Gameplay earnings</h2>
          <ul>
            <li><strong>Grim Tidings:</strong> One point per paid QUESTBOARD ticket, spent on chest rerolls or Grimoire Gathering Special Events.</li>
            <li><strong>Advancement Notches:</strong> Earned through qualifying sessions to level up. Campaigns may use the DM&apos;s advancement plan.</li>
            <li><strong>Achievements:</strong> Character-specific badges celebrating deeds and milestones, without mechanical benefits.</li>
            <li><strong>Loot, treasure, and Magic Item Cards:</strong> Gameplay rewards to collect, spend, or trade. SPELLBOOK-exclusive cards can be collected in your character&apos;s logsheet.</li>
            <li><strong>Downtime:</strong> 10 Downtime Days per completed QUEST, or downtime at your campaign DM&apos;s discretion, for activities at your Bastion of Operations.</li>
          </ul>
        </section>

        <section id="treasure">
          <h2>Earning treasure</h2>
          <p>You may use treasure found during a QUEST throughout its sessions. At the end of the QUEST, surrender it to the ORDO as evidence rather than keeping it as a permanent reward. Story-critical items may earn bonus coin at the DM&apos;s discretion.</p>
          <p>Qualifying sessions award codes for random Loot Chests containing coins, consumables, magic items, and limited-edition Magic Item Cards. Chests replace adventure-specific magic item rewards, encouraging you to choose stories and challenges rather than chase a particular item.</p>
          <h3>Magic item carry limits</h3>
          <p>You may own more items than you can carry. Additional items remain at your Bastion of Operations, the Keep.</p>
          <div className="table-wrap"><table className="quests-guide-carry-table">
            <caption>Magic item carry limits by character level</caption>
            <thead><tr><th scope="col">Level / tier</th><th scope="col">Carry limit</th></tr></thead>
            <tbody>
              <tr><th scope="row">3–4 / Tier 1</th><td>5 Common items, plus 1 Uncommon or Rare item</td></tr>
              <tr><th scope="row">5–10 / Tier 2</th><td>5 Common items, plus 3 Uncommon items and 1 Rare or Very Rare item</td></tr>
              <tr><th scope="row">11–16 / Tier 3</th><td>8 Common items, plus 5 Uncommon items and 3 items of Rare or Very Rare rarity</td></tr>
              <tr><th scope="row">17–20 / Tier 4</th><td>10 Common items, plus 8 Uncommon items, 5 Rare items, and 3 items of Very Rare, Legendary, or Artifact rarity</td></tr>
            </tbody>
          </table></div>
          <h3 style={{ paddingTop: "10px" }}>Loot Chest rewards</h3>
          <p>A code&apos;s rarity is determined by the adventure&apos;s level when earned, rather than your level when opening it. Gold rewards are random and based on your character&apos;s level when the code was earned.</p>
          <p>Cards may represent book items or feature additional properties, limited-edition art, or unique, one-of-one artwork autographed by the artist. Add cards pulled from chests to your collection. Magic items and consumables may also be purchased at the Mercantile Market.</p>
          <p>QUESTS does not award boons, charms, or blessings. Each qualifying session awards <strong>one Advancement Notch</strong>, regardless of length or number of chests.</p>
          <div className="table-wrap"><table>
            <caption>Maximum Loot Chest rarity by adventure tier</caption>
            <thead><tr><th scope="col">Adventure tier</th><th scope="col">Maximum rarity</th></tr></thead>
            <tbody>
              <tr><th scope="row">Tier 1</th><td>Uncommon</td></tr>
              <tr><th scope="row">Tier 2</th><td>Rare</td></tr>
              <tr><th scope="row">Tier 3</th><td>Very Rare</td></tr>
              <tr><th scope="row">Tier 4</th><td>Legendary</td></tr>
            </tbody>
          </table></div>
        </section>

        <section id="loot-chests">
          <h2>Opening a Loot Chest</h2>
          <ol>
            <li>Sign in and open your character page.</li>
            <li>Scroll to <strong>Loot Chest Codes</strong>.</li>
            <li>Select <strong>Copy Code</strong>, then <strong>Redeem</strong>.</li>
            <li>Paste the code into <strong>Redeem Chest Code</strong> on the Loot Chest page and select <strong>Redeem</strong>.</li>
            <li>Review your treasure and Magic Item Cards. Accept the rewards or spend one Grim Tidings point to reroll.</li>
          </ol>
          <p>Each chest may be rerolled only once, and the new results completely replace the original rewards. Redeem multiple codes separately.</p>
        </section>

        <section id="advancement">
          <h2>Gaining levels</h2>
          <p><strong>QUEST campaigns:</strong> DMs may use a different advancement plan. Discuss it before play.</p>
          <p><strong>QUESTBOARD sessions:</strong> Each qualifying session of at least three hours earns one Advancement Notch, regardless of length. After four notches at your current level, you may advance immediately or wait until after a session of your choosing.</p>
          <p>Extra notches earned while delaying do not carry over. Your notch count resets to zero when you level up. Record level changes on D&amp;D Beyond; the app syncs progress when you open or refresh your character page.</p>
        </section>

        <section id="grim-tidings">
          <h2>Grim Tidings</h2>
          <p>Every paid QUESTBOARD ticket earns one Grim Tidings point. Free-to-play QUESTS do not award points. Tidings belong to you, the player, rather than an individual character, and are tracked in the app.</p>
          <ul>
            <li><strong>Chest rerolls:</strong> Spend one point on any one of your characters&apos; chests, once per chest. New results completely replace the old rewards.</li>
            <li><strong>Special event games:</strong> Spend five or more points to join a special-edition adventure run by a SPELLBOOK resident DM.</li>
          </ul>
        </section>

        <section id="achievements">
          <h2>Achievements</h2>
          <p>Achievements celebrate your character&apos;s memorable deeds and belong to the character who earned them. Each has specific requirements. There are nine categories:</p>
          <ul>
            <li><strong>Combat:</strong> Powerful foes and exceptional feats in battle.</li>
            <li><strong>Epic Table:</strong> Campaign milestones, recognition, and lasting legacy.</li>
            <li><strong>Exploration:</strong> Secrets, dangerous places, and traps.</li>
            <li><strong>Funny and Weird:</strong> Outrageous decisions and unforgettable outcomes.</li>
            <li><strong>Healing and Support:</strong> Protecting companions and restoring allies.</li>
            <li><strong>Skill and Roleplay:</strong> Clues, promises, and challenges resolved through skill and personality.</li>
            <li><strong>Spellcasting:</strong> Remarkable magic through precision, power, and creativity.</li>
            <li><strong>Survival:</strong> Deadly encounters, depleted resources, and brushes with death.</li>
            <li><strong>Teamwork:</strong> Combining strengths and setting up companions to succeed.</li>
          </ul>
          <p>DMs confirm gameplay achievements during or after sessions. EPIC QUESTS organizers confirm community achievements. Awards are recorded in the app and grant recognition, with no in-game mechanical benefits.</p>
        </section>

        <section id="downtime">
          <h2>Downtime activities</h2>
          <p>Each completed QUEST earns 10 Downtime Days, or your campaign DM may award downtime at their discretion. Spend 1 DT per day of activity requiring up to eight hours of work. Activities during an ongoing adventure or campaign require DM approval.</p>
          <dl>
            <dt>Copying spells</dt><dd>Spend 1 DT per spell of levels 1–4, or 2 DT per spell of levels 5–9, to copy a spell found during an adventure. Meet the normal requirements and pay applicable gold costs.</dd>
            <dt>Crafting equipment</dt><dd>Follow approved crafting rules for time, costs, tools, and proficiency. Craft ammunition in the quantities in which it is normally sold.</dd>
            <dt>Scribing spell scrolls</dt><dd>Follow approved scribing rules for time, costs, and spellcasting. Scribe at the spell&apos;s base level, not a higher level.</dd>
          </dl>
          <p>Manage these activities through <strong>Downtime Activities</strong> on your character page. Select the activity and spend the required days; the app records the results. Magic item trade costs, including trades between your own characters, are handled in the <strong>Trade</strong> section instead.</p>
        </section>

        <section id="trading">
          <h2>Trading at the Mercane Mercantile</h2>
          <p>Browse the community marketplace to discover other adventurers&apos; listings and offer your own magic item cards for trade.</p>
          <ul>
            <li>Trade one permanent magic item card for another of the <strong>same rarity</strong>.</li>
            <li>Both items need valid QUESTS records, and each receiving character must be eligible to carry the item.</li>
            <li>You may trade between your own characters. Characters do not need to share an adventure or home world.</li>
            <li>Record the exchange on both characters. Ownership transfers completely, with no copy retained by the former owner.</li>
            <li>Expended uses remain expended if they are not rechargeable.</li>
            <li>Trades have no gold fee. Downtime costs apply through the app&apos;s trading rules. Consumables cannot be traded.</li>
          </ul>
          <p><Link href="/mercane-mercantile">Browse the Mercane Mercantile</Link></p>
        </section>

        <section id="recovery">
          <h2>Death, recovery, and returning to play</h2>
          <p>Death, curses, and other consequences follow the 5.5e rules during a QUEST. DMs explain heightened stakes before play.</p>
          <p><strong>Returning to life:</strong> If you remain dead at the end of an adventure and the party preserved the necessary remains, the ORDO can arrange resurrection between adventures for <strong>300 gp and 10 Downtime Days</strong>. You retain earned rewards; resurrection does not restore consumed items or undo the outcome.</p>
          <p><strong>Campaign consequences:</strong> Continuing campaigns may use different recovery rules with prior agreement. Discuss how they affect a return to other QUESTS tables. Permanent retirement should be an informed player choice.</p>
          <p><strong>Returning to play:</strong> Between unrelated adventures, begin with a long rest&apos;s benefits and recharge items according to their descriptions. Continuing sessions may preserve depleted resources and ongoing effects when the story requires it.</p>
          <p><strong>Downtime and Bastions:</strong> Completed QUESTS award 10 Downtime Days unless otherwise noted. Spend them on activities at your Bastion.</p>
        </section>

        <section id="supporting-dms">
          <h2>Supporting Dungeon Masters</h2>
          <p>DMs prepare stories, maps, and the details that bring QUESTS to life. Registering sessions also makes game logging largely automatic for players.</p>
          <p>After a game, rate your DM, send a private thank-you, or offer constructive feedback. Use the end-of-game feedback form to recognize especially memorable sessions. SPELLBOOK rewards exceptional DMs at the end of each season.</p>
          <p>Roster DMs complete assessments and trial games, set their own ticket prices, and receive a substantial, fair share of sales. Tips and gratuities are not accepted.</p>
          <p>Confirm attendance, keep your character accurate and compliant, arrive prepared, and contribute to a respectful, welcoming table.</p>
        </section>

        <section id="after-session">
          <h2>After every session</h2>
          <ol>
            <li><strong>Approve your game.</strong> Open your character page, find Completed Games Awaiting Approval near the bottom, review the session, and select Add to Adventure Log.</li>
            <li><strong>Update D&amp;D Beyond.</strong> Record spent consumables, gold, and significant character changes.</li>
            <li><strong>Redeem your Loot Chests.</strong> Add awarded magic items and consumables to your D&amp;D Beyond inventory.</li>
            <li><strong>Check rewards.</strong> Confirm DM-approved achievements and your Advancement Notch. Grim Tidings come from paid ticket purchases, not session completion.</li>
            <li><strong>Choose whether to level up.</strong> With four notches, advance or delay. Apply any level changes on D&amp;D Beyond before your next game.</li>
            <li><strong>Sync your character.</strong> Refresh the app&apos;s character page and review the synced results for accuracy.</li>
          </ol>
        </section>
        <p><a href="#quests-guides-top">Back to top</a></p>
      </article>
    </QuestsGuideShell>
  );
}
