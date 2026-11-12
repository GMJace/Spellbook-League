import type { Metadata } from "next";
import Link from "next/link";
import { QuestsGuideShell } from "@/components/quests-guide-shell";

export const metadata: Metadata = {
  title: "QUESTS Dungeon Master's Guide | SPELLBOOK",
  description: "Prepare, organize, run, and record SPELLBOOK QUESTS as a Dungeon Master.",
};

const contents = [
  ["before-your-first-quest", "What You Need"],
  ["choosing-and-adapting", "Choosing and Adapting a QUEST"],
  ["registering-games", "Registering Your Game in the App"],
  ["mustering", "Setting Up Your Discord Table"],
  ["weaver", "WEAVER and Session Tracking"],
  ["starting-play", "Before Play"],
  ["running-play", "Running a Welcoming Table"],
  ["session-rewards", "Awarding Session Rewards"],
  ["rewards", "Loot Chests and Treasure"],
  ["advancement", "Advancement"],
  ["achievements", "Achievements"],
  ["recovery", "Death, Recovery, and Continuing Campaigns"],
  ["downtime-and-trading", "Downtime and Trading"],
  ["after-the-session", "Closing and Logging Your Session"],
  ["player-follow-up", "What Players Do Next"],
  ["getting-help", "Troubleshooting and Support"],
  ["feedback-and-recognition", "DM Recognition and Feedback"],
  ["working-appendix", "Working Appendix"],
] as const;

export default function QuestsDmGuidePage() {
  return (
    <QuestsGuideShell slug="dm-guide">
      <div className="panel stack quests-guide-copy">
        <h2>Welcome, QUEST Weaver</h2>
        <p>Every QUEST needs someone to bring it to life. As a SPELLBOOK Dungeon Master, you turn adventures into shared stories and give every player a chance to shape their character’s legend. You weave the Tales of the ORDO, a multiversal guild dedicated to protecting the natural balance.</p>
        <p>This guide accompanies the <Link href="/quests/players-guide">SPELLBOOK QUESTS Player’s Guide</Link>, which covers character eligibility, advancement, equipment limits, and player rewards. Here, you’ll learn how to prepare, organize, run, and record your games through the SPELLBOOK App and Discord.</p>
      </div>

      <nav className="panel quests-guide-contents" aria-label="Dungeon Master's Guide contents">
        <h2>In this guide</h2>
        <ol>
          {contents.map(([id, title]) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}
        </ol>
      </nav>

      <article className="panel quests-guide-copy">
        <section id="before-your-first-quest">
          <h2>What You Need</h2>
          <p>Before running your first QUEST, make sure you have the following.</p>
          <ul>
            <li>The current QUESTS Player’s Guide, this guide, and the QUESTS Source List and Banned List.</li>
            <li>The approved D&amp;D rules and the adventure or campaign you intend to run.</li>
            <li>A SPELLBOOK App account with DM access to create and manage your games.</li>
            <li>Access to the dedicated Discord mustering, text, and voice channels provided when you become a SPELLBOOK DM.</li>
            <li>Any maps, tokens, notes, virtual tabletop, or other tools your game requires.</li>
          </ul>
          <p>Prepare your materials and test your technology before players arrive. Let players know which tools they’ll need, and share joining instructions in advance.</p>
        </section>

        <section id="choosing-and-adapting">
          <h2>Choosing and Adapting a QUEST</h2>
          <p>QUESTS can take adventurers anywhere in the multiverse. You may run any of the following.</p>
          <ul>
            <li>A Wizards of the Coast campaign or adventure.</li>
            <li>A DMsGuild adventure.</li>
            <li>An Adventurers League module.</li>
            <li>A Legends of Greyhawk adventure.</li>
            <li>A homebrew adventure or campaign. See the Homebrew Guide.</li>
          </ul>
          <p>Adapt your chosen adventure to follow SPELLBOOK QUESTS rules for character eligibility, advancement, and rewards. An adventure’s original organized-play rules do not automatically carry over. Apply QUESTS restrictions and reward procedures even when running material written for another program.</p>

          <h3>A Multiverse of Adventures</h3>
          <p>Characters and adventures may come from anywhere in the multiverse. Connect the adventure to the ORDO’s mission of balance through a briefing, a request for help, an investigation, or a dangerous discovery. This connection should support the adventure’s central story. The Keep in the City of Doors provides a shared point of departure and return.</p>
          <h3>Story and Pacing</h3>
          <p>Prepare a clear opening, meaningful decisions, and a suitable stopping point. Tell players whether the QUEST is a one-shot or part of a continuing campaign, along with the expected number of sessions.</p>
          <h3>Encounter Preparation</h3>
          <p>Review encounters with the party’s capabilities and carried magic items in mind. Prepare challenges that give different characters opportunities to contribute. Explain campaign-specific expectations and adjustments before play so players can prepare their characters appropriately.</p>
          <h3>Treasure Adaptation</h3>
          <p>Identify items needed for puzzles, encounters, or the storyline. Characters may use adventure treasure during the QUEST, as directed by the QUEST Weaver, but surrender it to the ORDO as evidence when the QUEST concludes. Loot Chest rewards replace magic items awarded by the adventure, and permanent rewards follow the QUESTS reward system.</p>
        </section>

        <section id="registering-games">
          <h2>Registering Your Game in the App</h2>
          <p>Register your game in the SPELLBOOK App so players can find it, join it, and receive the appropriate session records and rewards.</p>
          <p>Use this preparation checklist when entering the information supported by the game form.</p>
          <ul>
            <li>Adventure title, description, and ORDO connection.</li>
            <li>Adventure level or tier and the intended character range.</li>
            <li>Date, start time, time zone, and expected session length.</li>
            <li>Whether this is a single session or part of a continuing campaign.</li>
            <li>Available seats and whether entry is by paid ticket or free RSVP.</li>
            <li>Mustering thread, Discord voice channel, and any virtual tabletop instructions.</li>
            <li>Content warnings, PvP expectations, and any agreed campaign advancement or recovery rules.</li>
          </ul>
          <h3>Adventure Level Matters</h3>
          <p>Chest rarity is based on the adventure in which the code is earned. Check the adventure level carefully before the game is offered and before its rewards are recorded.</p>
          <h3>Paid Games</h3>
          <p>SPELLBOOK roster DMs complete assessments and trial games, set their own ticket prices, and receive a share of ticket sales. Tips and gratuities are not accepted. Follow the applicable roster and payment procedures when offering paid games.</p>
        </section>

        <section id="mustering">
          <h2>Setting Up Your Discord Table</h2>
          <p>Your table uses a mustering channel, a game-specific thread, and a voice channel on the SPELLBOOK Discord. Players receive the mustering link through app notifications when they purchase a ticket or their RSVP is confirmed.</p>
          <h3>Before Players Arrive</h3>
          <ol>
            <li>Confirm that you and your registered players can access the correct channels.</li>
            <li>Prepare the thread for this specific game so its details are easy to find.</li>
            <li>Post the start time and time zone, expected duration, adventure level, tools, joining instructions, and content warnings.</li>
            <li>Ask players to post their character’s muster information and player token.</li>
            <li>Test your microphone, voice connection, maps, and virtual tabletop.</li>
          </ol>
          <p>Players can open their character page in the SPELLBOOK App, select <strong>Copy Muster Info</strong>, and paste it into the thread. They then select <strong>Copy Player Token</strong> and paste that into the same thread. You can also access registered character profiles through their game registration.</p>
        </section>

        <section id="weaver">
          <h2>WEAVER and Session Tracking</h2>
          <p>WEAVER, the SPELLBOOK Discord bot, records each player’s gameplay time and determines how many Loot Chest codes they earn. Breaks of up to 15 minutes count as gameplay time. Players earn one code for every full three hours WEAVER records in a single session. Time does not carry over between sessions.</p>
          <p>Review WEAVER’s attendance and gameplay totals when completing the game record. If tracking appears incorrect, report the discrepancy for review.</p>
        </section>

        <section id="starting-play">
          <h2>Before Play</h2>
          <p>Welcome the players, confirm the characters they are bringing, and explain how this session fits into the QUEST. Resolve character flags before play or direct the player to the appropriate review channel.</p>
          <p>Review the adventure’s sensitive themes, expected difficulty, and any heightened risks. Explain the Red Card tool and how players can signal it in your voice or text setup.</p>
          <p>Confirm the following where relevant.</p>
          <ul>
            <li>The campaign’s advancement plan, if it differs from standard QUESTBOARD sessions.</li>
            <li>How ongoing effects, resources, and recovery carry between campaign sessions.</li>
            <li>Whether the adventure explicitly includes PvP and whether everyone involved has given informed agreement.</li>
            <li>The expected session length and any planned breaks.</li>
          </ul>
          <p>Do not require players to disclose personal reasons for their boundaries.</p>
        </section>

        <section id="running-play">
          <h2>Running a Welcoming Table</h2>
          <p>Follow SPELLBOOK’s Code of Conduct. Share the spotlight, invite quieter players to contribute, and keep play moving without rushing people through important choices.</p>
          <p>Strong characters are welcome. Challenge the party through varied encounters, objectives, exploration, and social decisions. Use the ORDO oath as a story opportunity. Respect player boundaries and support cooperation among companions.</p>
          <dl>
            <dt>Rules Calls</dt>
            <dd>Make immediate rulings so play can continue. Your ruling stands for the session. Unresolved rules disputes can be discussed afterward in the Rules Chat Discord channel.</dd>
            <dt>Red Card</dt>
            <dd>If anyone calls “Red Card” or uses the agreed signal, pause immediately. Adjust the content and resume when the group is ready. No explanation is required.</dd>
            <dt>PvP</dt>
            <dd>Player-versus-player conflict is allowed only in adventures that explicitly include it and with the prior informed agreement of everyone involved. Stop unagreed PvP.</dd>
            <dt>Disruptions</dt>
            <dd>Address problems calmly and respectfully. Refer conduct concerns to SPELLBOOK administrators when you need assistance, following the Code of Conduct.</dd>
          </dl>
        </section>

        <section id="session-rewards">
          <h2>Awarding Session Rewards</h2>
          <p>Use the Player’s Guide and the app’s supported reward workflow. Do not carry over an adventure’s original reward package into QUESTS.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th scope="col">Reward</th><th scope="col">QUESTS Rule</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Loot Chest code</th>
                  <td>A player earns one Loot Chest code once WEAVER records at least three hours of gameplay in one Discord session.</td>
                </tr>
                <tr>
                  <th scope="row">Additional chest codes</th>
                  <td>WEAVER’s recorded gameplay time determines the total. Players earn two codes at six hours, three at nine hours, and so on. Breaks of up to 15 minutes count. Time does not carry over.</td>
                </tr>
                <tr>
                  <th scope="row">Advancement</th>
                  <td>Each qualifying QUESTBOARD session earns one Advancement Notch, regardless of length. Campaigns may use a different advancement plan agreed before play.</td>
                </tr>
                <tr>
                  <th scope="row">Grim Tidings</th>
                  <td>Players earn one point per paid QUESTBOARD ticket purchased. Free-to-play QUESTS do not award points. Points belong to the player and are earned at purchase.</td>
                </tr>
                <tr>
                  <th scope="row">Downtime</th>
                  <td>Each participating character earns 10 Downtime Days for a completed, logged single-session QUEST, or 10 for each session they play and log in a multi-session QUEST. Campaign DMs may award downtime at their discretion. The app uses 10 days when a player adds a completed session to their Adventure Log unless another amount is recorded.</td>
                </tr>
                <tr>
                  <th scope="row">Achievements</th>
                  <td>Award character-specific achievements when their published requirements are met. They provide no in-game mechanical benefits.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="rewards">
          <h2>Loot Chests and Treasure</h2>
          <p>Chest rarity follows the adventure level at the time the code is earned. Maximum chest rarities are Uncommon at Tier 1, Rare at Tier 2, Very Rare at Tier 3, and Legendary at Tier 4.</p>
          <p>Players redeem codes from their character page under <strong>Loot Chest Codes</strong>. They select <strong>Copy Code</strong>, then <strong>Redeem</strong>, paste the code into <strong>Redeem Chest Code</strong>, and redeem it. Multiple codes are redeemed separately.</p>
          <p>A player may spend one Grim Tidings point to reroll a chest once. The new results replace the original results completely. Do not award an additional reroll outside that process.</p>
          <p>Chests include coins, consumables, magic items, and Magic Item Cards. Chest gold is based on the character’s level when the code was earned. Story-critical evidence may earn bonus coin at your discretion. QUESTS does not award boons, charms, or blessings.</p>
        </section>

        <section id="advancement">
          <h2>Advancement</h2>
          <p>Under standard QUESTBOARD advancement, four notches earned at the current level permit a level-up. Players may delay advancing, but additional notches do not carry over. Their count resets to zero when they level up.</p>
          <p>For campaigns, explain your advancement plan before play. Do not award an automatic level merely because the original adventure’s organized-play instructions say to do so.</p>
        </section>

        <section id="achievements">
          <h2>Achievements</h2>
          <p>Review the published requirements before confirming an achievement. The nine categories are Combat, Epic Table, Exploration, Funny and Weird, Healing and Support, Skill and Roleplay, Spellcasting, Survival, and Teamwork.</p>
          <p>Confirm gameplay achievements during or after the session for the character who earned them. EPIC QUESTS organizers confirm community achievements. Encourage memorable play without encouraging disruption or competition that harms the table.</p>
        </section>

        <section id="recovery">
          <h2>Death, Recovery, and Continuing Campaigns</h2>
          <p>Apply the 5.5e rules for death, curses, and other consequences during play. Explain heightened stakes before the game.</p>
          <p>If a character remains dead after the adventure and the party has preserved the necessary remains, the ORDO can arrange resurrection between adventures for <strong>300 gp and 10 Downtime Days</strong>. Characters keep earned rewards. Consumed items stay expended and the adventure’s outcome stands.</p>
          <p>Continuing campaigns may use different recovery rules with prior player agreement. Discuss how those consequences affect the character’s return to other QUESTS tables. Permanent retirement should be an informed player choice.</p>
          <p>Between unrelated adventures, characters receive the benefits of a long rest and recharge items according to their descriptions. Continuing sessions may preserve depleted resources and ongoing effects when the story requires it.</p>
        </section>

        <section id="downtime-and-trading">
          <h2>Downtime and Trading</h2>
          <p>Approve downtime undertaken during an ongoing adventure or campaign. One Downtime Day represents up to eight hours of work. Players manage copying spells, crafting equipment, and scribing scrolls through <strong>Downtime Activities</strong> on their character page, following the Player’s Guide and approved activity rules.</p>
          <p>Magic item card trades are managed through the app’s <strong>Trade</strong> section and the <Link href="/mercane-mercantile">Mercane Mercantile</Link>. Each trade costs 5 Downtime Days, including exchanges between a player’s own characters. Permanent item cards are exchanged one-for-one at the same rarity, with valid records and appropriate carrying eligibility. Consumables cannot be traded. No gold fee applies.</p>
        </section>

        <section id="after-the-session">
          <h2>Closing and Logging Your Session</h2>
          <ol>
            <li>Confirm the participating players, characters, and actual qualifying gameplay time.</li>
            <li>Complete the session record in the SPELLBOOK App using its DM workflow.</li>
            <li>Check the adventure level and the chest codes allotted to each eligible participant.</li>
            <li>Confirm earned achievements and the applicable advancement. Verify that each participating character’s log shows 10 Downtime Days or the amount set by the campaign DM. For a multi-session QUEST, check after every logged session.</li>
            <li>Record any ongoing campaign consequences, story evidence payments, and recovery requirements.</li>
            <li>Remind players to approve their game and update their character records.</li>
            <li>Invite feedback and make sure players know where to find the next session’s details.</li>
          </ol>
        </section>

        <section id="player-follow-up">
          <h2>What Players Do Next</h2>
          <p>On their character page, players find <strong>Completed Games Awaiting Approval</strong>, review the game, and select <strong>Add to Adventure Log</strong>. They update consumables, gold, inventory, and character changes on D&amp;D Beyond, redeem chest codes, check their achievements and Advancement Notch, and decide whether to level up.</p>
          <p>Refreshing the character page prompts a D&amp;D Beyond sync. Players are still responsible for verifying their character records and rewards.</p>
        </section>

        <section id="getting-help">
          <h2>Troubleshooting and Support</h2>
          <dl>
            <dt>Character Flags</dt>
            <dd>A flag is a request for review or correction. Direct incorrect flags and eligibility questions to <a href="https://discord.com/channels/744348925414080592/1314666583154757662" target="_blank" rel="noreferrer">Ask Us Anything</a>.</dd>
            <dt>App Errors</dt>
            <dd>Report errors and unexpected results in <a href="https://discord.com/channels/744348925414080592/1569385200289452092" target="_blank" rel="noreferrer">Report a Bug</a>. Record enough information to identify the affected session and character. Bring suspected exploits to the administrators.</dd>
            <dt>Rules Questions</dt>
            <dd>Use Rules Chat for unresolved rules discussions after the game.</dd>
            <dt>Discord or Tracking Problems</dt>
            <dd>Ask an administrator for help with missing access or WEAVER tracking.</dd>
          </dl>
        </section>

        <section id="feedback-and-recognition">
          <h2>DM Recognition and Feedback</h2>
          <p>Players may rate their DM, offer constructive feedback, send a private thank-you, and complete the end-of-game feedback form. SPELLBOOK recognizes DMs who provide welcoming tables, reliable service, and memorable games.</p>
          <p>DMs register sessions through the app for DM Bookmark rewards and other service recognition. See the DM Service Guide for eligibility, rates, and redemption requirements. Only promise rewards or merchandise quantities confirmed by that guide.</p>
        </section>

        <section id="working-appendix">
          <h2>Working Appendix</h2>
          <p>Proposed procedures, open decisions, and verification checklists for SPELLBOOK staff.</p>
          <details>
            <summary>Show working notes</summary>
            <h3>SPELLBOOK App walkthrough</h3>
            <p>The exact game-creation fields, publication process, and DM access requirements need verification against the app before this section becomes a screenshot walkthrough.</p>
            <p>The precise DM-side logging, code-allotment, achievement-award, and correction controls require verification. This checklist describes the information to reconcile.</p>
            <dl>
              <dt>DM access</dt>
              <dd>Proposed: Have the DM sign in, link the Discord identity they will use at the table, and confirm they can manage their own games. Test access separately for a community DM, a paid roster DM, and an administrator. If a control is missing, have the DM contact the designated administrator with their account name and a screenshot, without sharing credentials.</dd>
              <dt>Create and publish</dt>
              <dd>Enter the adventure title and tier, date and time zone, expected length, seat count, experience level, content notes, and whether it is a one-shot or part of a campaign. Add the virtual tabletop and Discord details where the app supports them. Review the player-facing listing before publishing. Check that a test player sees the correct time, available seats, and joining instructions.</dd>
              <dt>Tickets or RSVP</dt>
              <dd>For a free game, test that an RSVP reserves a seat and exposes the correct mustering link. For a paid game, confirm the roster DM can set the listed price and that a successful purchase reserves one seat, sends the link, and awards one Grim Tidings point. Verify how waitlists, failed purchases, and duplicate registrations behave.</dd>
              <dt>Roster review</dt>
              <dd>Before the game, match each confirmed seat to a Discord account and a registered character. Check tier and relevant restrictions. Note substitutions or character changes before recording rewards so the log follows the character who played.</dd>
              <dt>Close and log</dt>
              <dd>Review the gameplay time recorded by WEAVER for each player, check chest allotments, and confirm character-specific achievements. Verify downtime for every logged session, including sessions in a QUEST still in progress. From the player side, verify that the game appears under Completed Games Awaiting Approval and that Add to Adventure Log produces the intended entry and rewards exactly once.</dd>
              <dt>Errors and cancellation</dt>
              <dd>Proposed: Correct a draft or unawarded record in place where the app supports it. For an already awarded record, escalate to an administrator with the game ID, affected player, incorrect value, and requested correction. Check redeemed chests or claimed rewards before adjusting anything. For cancellation, stop new signups, update the listing, notify confirmed players, and send paid orders to the designated refund owner.</dd>
              <dt>Verify in the app</dt>
              <dd>Capture the real navigation and button labels, who can publish or cancel, when rewards are created, who can correct them, and what happens after a player claims them. Record one free game and one paid test flow. Capture screenshots at access, game form, player listing, roster, DM closeout, and player approval. Use test data and obscure personal and payment details.</dd>
            </dl>
            <h3>Discord setup</h3>
            <dl>
              <dt>Current setup</dt>
              <dd>The guide calls for a mustering channel, a game-specific thread, and a voice channel on SPELLBOOK Discord. Players receive the mustering link after a confirmed ticket purchase or RSVP.</dd>
              <dt>Proposed ownership</dt>
              <dd>A server administrator provisions a DM’s dedicated text and voice spaces and assigns role permissions. The DM creates the thread for each session and maintains its details. Where the app or bot creates threads automatically, designate that automation as the creator and have the DM verify the result.</dd>
              <dt>Proposed naming</dt>
              <dd>Use dm-[handle]-muster and dm-[handle]-voice for persistent channels, and YYYY-MM-DD | QUEST title | Session # for threads. Use the session’s advertised local date and put the start time, time zone, table link, and backup joining instructions in the first post.</dd>
              <dt>Proposed permissions</dt>
              <dd>DMs can create and manage their own session threads. Confirmed players can read, post, and join the correct voice channel. Staff can troubleshoot and moderate. Give WEAVER only the permissions it needs for the verified setup. Test access as a player without staff roles, including any thread membership or visibility rules.</dd>
              <dt>Links and archive</dt>
              <dd>Put the direct thread link in the notification workflow and test that a registered player can open it. Keep the thread available until attendance, log corrections, and any ticket issues are resolved. Archive it after that. Agree on a retention period and who may reopen a thread.</dd>
            </dl>
            <h3>WEAVER attendance</h3>
            <p>Verify WEAVER’s required channel setup, commands, permissions, and correction procedure before publishing operational instructions.</p>
            <dl>
              <dt>Current rule</dt>
              <dd>Chest eligibility and the number of codes are based on each player’s gameplay time as recorded by WEAVER in a single SPELLBOOK Discord session. Time does not carry over between sessions.</dd>
              <dt>Counting gameplay time</dt>
              <dd>Breaks of up to 15 minutes count as gameplay time. Use WEAVER’s recorded time per player: one code at 180 minutes, two at 360 minutes, three at 540 minutes, and one more for each additional full 180 minutes.</dd>
              <dt>Proposed failure procedure</dt>
              <dd>If tracking is incomplete, the DM records session start and end, breaks, join or leave times, and the reason for the discrepancy. Compare the bot record with the DM’s notes. Send unresolved corrections to an administrator. Record the original and corrected minutes, reason, approver, and any reward adjustment in the same session record. Hold disputed rewards pending review. Use the existing session record for corrections.</dd>
              <dt>Verify with WEAVER</dt>
              <dd>Document exactly what starts and stops tracking, whether it uses a game ID or voice channel, the literal commands if any, who may run them, bot permissions, where the report appears, and whether manual overrides are supported. Test a late join, reconnection, break, channel move, bot outage, and a correction after a reward was claimed.</dd>
            </dl>
            <h3>Rewards and downtime</h3>
            <dl>
              <dt>Additional chest codes</dt>
              <dd>Use the time WEAVER records for each player. A player with 5 hours and 59 minutes recorded earns one code. A player with six hours recorded earns two. A player with less than three hours earns none. A six-hour session that includes a 15-minute break earns two codes for a player whose WEAVER record shows the full six hours. Keep chest rarity tied to adventure tier.</dd>
              <dt>Evidence gold — proposed</dt>
              <dd>Keep bonus coin discretionary. Record what was surrendered, why it mattered, how much was awarded, and who received it. Publish suggested tier ranges or caps only if you want consistent limits. Decide whether one evidence item earns a party amount or a per-character amount. Count each piece of evidence once. Keep it separate from chest gold.</dd>
              <dt>Trade downtime</dt>
              <dd>Each completed trade costs 5 Downtime Days. Verify how the cost applies to each participating character, what happens when a character has too little downtime, and how cancellations are handled. Check that the same rule applies to trades between a player’s own characters.</dd>
              <dt>Automatic downtime</dt>
              <dd>Each participating character earns 10 Downtime Days for a completed, logged single-session QUEST. In a multi-session QUEST, they earn 10 for each session they play and log, including sessions logged while the QUEST is ongoing. The app defaults to 10 days in the Adventure Log unless another amount is recorded.</dd>
            </dl>
            <h3>Campaign advancement</h3>
            <dl>
              <dt>Current rule</dt>
              <dd>Standard qualifying QUESTBOARD sessions grant one Advancement Notch. Campaigns may use an agreed alternate plan.</dd>
              <dt>Proposed procedure</dt>
              <dd>Record the campaign’s advancement method before publishing its first session and tell players how it affects characters they bring to other tables. At closeout, identify each session as standard or alternate. Under the alternate plan, record the milestone once and suppress the standard notch for that same session. Preserve previously earned notches until a level-up, when the count resets under the existing rule. Keep attendance, chest, and achievement eligibility separate from advancement.</dd>
              <dt>Verify in the app</dt>
              <dd>Check whether the DM can select an advancement mode or suppress a notch. If there is no supported control, agree on an administrator-managed correction before using the alternative plan. Test that closing or editing the same session twice does not add a second reward, and that a milestone level-up syncs correctly from D&amp;D Beyond.</dd>
            </dl>
            <h3>Table boundaries</h3>
            <dl>
              <dt>Seats — proposed pilot</dt>
              <dd>Start with 3–6 players for a standard table. Let organizers approve exceptions for small-group games, special events, or adventures that need a different size. List the cap and any minimum needed to run so players know the cancellation threshold.</dd>
              <dt>Mixed tiers — proposed</dt>
              <dd>Default to the advertised tier. Permit a mixed-tier table only when the listing says so and the organizer approves the intended level range and reward tier before registration. Keep chest rarity tied to the published adventure tier for the entire session.</dd>
              <dt>Encounter adjustments — proposed</dt>
              <dd>Allow DMs to adjust enemy numbers, tactics, terrain, pacing, or objectives to fit the table while keeping the adventure’s stakes and announced reward tier. Do not treat the AL guide’s restrictions as QUESTS policy. For special events, follow any organizer instructions in the event brief.</dd>
              <dt>Optional rules and restrictions</dt>
              <dd>List optional rules or campaign-specific character restrictions before signups. Apply the Source List, Banned List, Code of Conduct, and existing safety rules across all tables. Take unusual restrictions or permanent character changes to staff before promising them.</dd>
            </dl>
            <h3>Recovery and spellcasting services</h3>
            <dl>
              <dt>Current rule</dt>
              <dd>If the necessary remains were preserved, ORDO resurrection between adventures costs 300 gp and 10 Downtime Days. Characters keep earned rewards. Consumed items stay expended and the adventure’s outcome stands.</dd>
              <dt>Missing remains — proposed</dt>
              <dd>If the standard recovery route is unavailable, refer the case to staff. Possible outcomes include an in-story recovery of the remains, another method already permitted by the campaign, or voluntary retirement. Do not promise an exception or assume it applies outside the campaign.</dd>
              <dt>Unable to pay — proposed</dt>
              <dd>Record the shortfall and refer it to staff. Decide whether to allow another character to contribute gold, whether downtime must be paid by the affected character, and whether a recovery QUEST can substitute for some cost. Until those options are adopted, the standard price stands. Offer the player the option of bringing another eligible character while the case is unresolved.</dd>
              <dt>Other services — decision</dt>
              <dd>Decide whether SPELLBOOK will offer a shared service list for curses, conditions, and restoration between games. If adopted, publish each service’s effect, price, downtime, and where it is available. The AL service-price table is not part of QUESTS.</dd>
            </dl>
            <h3>Table operations and support</h3>
            <p>Document the escalation and attendance-correction process.</p>
            <dl>
              <dt>Late arrivals and no-shows — proposed</dt>
              <dd>Publish a check-in time and seat-release window, such as 15 minutes after the advertised start. Ask late players to message in the mustering thread. Admit them at a natural break if the seat is still available. Use the time WEAVER records to determine rewards. Keep seat release separate from refund eligibility.</dd>
              <dt>Cancellation or reschedule — proposed</dt>
              <dd>The DM updates the app and mustering thread and tells the designated event administrator. Confirm who contacts registered players and how any replacement date is offered. Ask the administrator to reconcile the roster and ticket status before reopening registration.</dd>
              <dt>Refunds — decision</dt>
              <dd>Publish separate treatment for organizer cancellation, rescheduling, player cancellation, no-show, and an interrupted session. A practical starting point is a full refund for organizer cancellation and a choice of transfer or refund when a player cannot attend the replacement date. Set the player-cancellation cutoff, processing window, and whether fees and Grim Tidings are adjusted. Confirm payment processor behaviour before promising those details.</dd>
              <dt>Payouts — decision</dt>
              <dd>Confirm the roster split and the basis for it: gross ticket sales or a defined net amount after refunds, fees, and any taxes. If you intend to retain the earlier 85% roster share, verify it against the current roster agreement before publishing it. Specify payout timing, method, statement detail, and who reconciles refunds or disputes. Keep paid-game payout separate from DM service rewards.</dd>
              <dt>Contacts — fill before publication</dt>
              <dd>Name a primary and backup for event operations, refunds and payouts, app or WEAVER corrections, and conduct concerns. The current guide points DMs to Rules Chat for rules discussions, Ask Us Anything for eligibility questions, and Report a Bug for app issues. Add direct channel links and a private staff contact for sensitive concerns.</dd>
            </dl>
            <h3>DM service and Bookmarks</h3>
            <dl>
              <dt>Proposed earning rule</dt>
              <dd>Pilot one Bookmark per qualifying completed session the DM runs and logs, regardless of the number of players or chests. Decide whether free, paid, event, and campaign sessions all qualify, how to handle co-DMs, and whether event duties such as mentoring or onboarding earn separate recognition. Keep player feedback and end-of-season recognition separate from automatic earning.</dd>
              <dt>Awards — decision</dt>
              <dd>Publish a reward catalog with Bookmark prices, eligibility, limits, and availability. Possible categories include recognition badges, event perks, or merchandise where available. Set the award thresholds after estimating how many sessions active DMs will run and what the reward budget supports.</dd>
              <dt>Redemption — proposed</dt>
              <dd>DM checks balance, selects an available reward, and submits a redemption request. The designated staff member verifies eligibility, deducts the cost once, and confirms fulfillment. Decide whether Bookmarks expire or carry over between seasons and how reversals are handled. Verify the real app flow before naming any controls.</dd>
            </dl>
          </details>
        </section>

        <p><a href="#quests-guides-top">Back to top</a></p>
      </article>
    </QuestsGuideShell>
  );
}
