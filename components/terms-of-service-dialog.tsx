"use client";

import { Fragment, useRef } from "react";
import { renderGrimoireGatheringText } from "@/components/grimoire-gathering-text";
import {
  RainbowSpellbook,
  renderRainbowSpellbookText,
} from "@/components/rainbow-spellbook";

const TERMS_OF_SERVICE_TEXT = `SPELLBOOK League Terms of Service and Community Agreement

Last Updated: [Insert Date]
Organization: SPELLBOOK Publishing / SPELLBOOK Adventurers League
Contact: [Insert Contact Email]

By creating an account, registering a character, joining a game, attending an event, purchasing a ticket, applying to become a Dungeon Master, or participating in any SPELLBOOK program, you agree to these Terms of Service and Community Agreement.

If you do not agree to these terms, you may not create an account, register a character, attend SPELLBOOK events, participate in SPELLBOOK games, or use SPELLBOOK league services.

1. Purpose of SPELLBOOK

SPELLBOOK operates organized tabletop roleplaying games, online play programs, convention events, seasonal play tracks, community games, and paid professional Dungeon Master tables.

Creating a SPELLBOOK account and registering characters is free. Some events, conventions, special programs, and professional tables may require paid tickets or registration fees.

SPELLBOOK convention events, including events such as Grimoire Gathering, may run monthly during an active season. Players may join the current season at any point, subject to available seats, event capacity, eligibility rules, and these Terms.

2. Account Creation and Character Registration

Players may create a SPELLBOOK account and register characters free of charge.

You agree that all information you provide during registration must be accurate, current, and not misleading. You are responsible for maintaining the security of your account and for all activity connected to your account.

SPELLBOOK may refuse, suspend, restrict, or terminate an account if we believe the account is false, abusive, disruptive, duplicative, used to evade discipline, or otherwise harmful to the league.

Character registration does not guarantee seating at any specific game, table, convention, event, DM, adventure, or time slot.

3. Seasonal Participation

SPELLBOOK seasons generally last approximately three-quarters of a year. Season length, structure, rewards, eligibility, reporting requirements, and prize distribution may vary by season.

Participation in every event is not mandatory. However, players and DMs may progress further in the current season by participating in and properly logging eligible games.

Seasonal awards, prizes, recognition, and other benefits are distributed at the final convention of the season or at another time designated by SPELLBOOK.

SPELLBOOK reserves the right to correct errors, adjust eligibility, investigate suspicious reporting, reject invalid game logs, and modify season structures where necessary to preserve fairness and league integrity.

4. Free Games and Ticketed Events

SPELLBOOK may offer free weekly one-shots, community games, learn-to-play games, playtests, and other non-ticketed events.

SPELLBOOK may also offer ticketed games, convention tables, premium events, charity events, professional DM tables, or other paid opportunities.

A free account does not guarantee access to paid events. A purchased ticket does not remove the requirement to follow these Terms, the Code of Conduct, venue rules, safety rules, and instructions from SPELLBOOK staff.

5. Code of Conduct

All players, DMs, staff, volunteers, guests, vendors, and attendees are expected to help maintain a safe, welcoming, respectful, and enjoyable gaming environment.

You agree not to engage in conduct that SPELLBOOK determines, in its sole discretion, to be disruptive, abusive, unsafe, dishonest, exploitative, harassing, discriminatory, threatening, or harmful to the community.

Prohibited conduct includes, but is not limited to:

Harassment, intimidation, bullying, stalking, threats, or targeted hostility.
Discrimination or hateful conduct based on protected characteristics or personal identity.
Sexual harassment, unwanted sexual comments, or inappropriate conduct toward other participants.
Physical aggression, threats of violence, or unsafe behaviour.
Repeatedly interrupting games, undermining DMs, derailing tables, or refusing to follow table expectations.
Cheating, falsifying character records, falsifying game logs, or manipulating rewards.
Impersonating staff, DMs, players, organizers, or other community members.
Evading bans, suspensions, or account restrictions.
Sharing private information about another participant without permission.
Recording, streaming, photographing, or publishing another participant without required permission.
Abusing reporting tools or making knowingly false reports.
Violating venue rules, platform rules, Discord rules, Roll20 rules, convention rules, or applicable law.

SPELLBOOK may determine what qualifies as disruptive or harmful conduct based on context, pattern of behaviour, severity, impact on others, and the needs of the league.

6. Authority of SPELLBOOK Staff

SPELLBOOK has final authority over its accounts, games, events, Discord spaces, convention tables, DM rosters, seasonal records, prizes, and community programs.

SPELLBOOK may, at any time and in its sole discretion:

Warn a participant.
Remove a participant from a table.
Remove a participant from an event or convention space.
Restrict account access.
Suspend or terminate an account.
Remove or invalidate character records, rewards, logs, or seasonal progress.
Remove a participant from the current season.
Ban a participant from future SPELLBOOK events.
Remove a DM from the SPELLBOOK DM roster.
Decline to seat a player with a specific DM or group.
Refuse service or participation where necessary to protect the league.

SPELLBOOK is not required to provide repeated warnings before taking action. Serious misconduct may result in immediate removal, suspension, ban, or termination.

7. Dungeon Masters and the SPELLBOOK DM Roster

Players and community members may apply to become part of the official SPELLBOOK DM roster.

Acceptance onto the DM roster is not automatic. SPELLBOOK may consider reliability, communication, rules knowledge, table management, professionalism, player feedback, safety conduct, event availability, and the needs of the league.

SPELLBOOK DMs may be invited to run professional convention tables, including ticketed games where players purchase seats and DMs are paid for their time. Paid DM opportunities are not guaranteed.

Unless a separate written agreement says otherwise, being listed on the SPELLBOOK DM roster does not create an employment relationship, partnership, agency relationship, or guarantee of paid work.

SPELLBOOK may remove, suspend, demote, or decline to schedule any DM if SPELLBOOK determines that the DM’s conduct, reliability, communication, rulings, table behaviour, safety practices, or professionalism are inconsistent with league expectations.

DMs must follow SPELLBOOK procedures for safety tools, game reporting, player conduct, event timing, adventure rules, payment procedures, and convention expectations.

8. Table Safety and Game Content

Tabletop roleplaying games may include fantasy violence, frightening themes, moral conflict, monsters, magic, and other fictional content.

SPELLBOOK may use safety tools, content warnings, table expectations, age ratings, or other safety procedures. Participants agree to respect these tools and the boundaries of other players.

A player or DM who repeatedly ignores table boundaries, pressures others, mocks safety tools, or introduces inappropriate content may be removed from the table or league.

SPELLBOOK may stop, pause, modify, or cancel a game if staff or the DM believe it is necessary for safety, comfort, legal compliance, or event management.

9. Minors and Parent or Guardian Consent

Participants under the age of majority may be required to have permission from a parent or legal guardian to create an account, attend events, purchase tickets, receive prizes, or participate in certain programs.

SPELLBOOK may restrict certain games, events, programs, Discord spaces, or convention tables by age rating, maturity level, venue requirement, or safety need.

Parents and guardians are responsible for determining whether a game, event, or program is appropriate for a minor participant.

SPELLBOOK may require additional forms, consent, emergency contact information, or guardian attendance for minors at certain events.

10. Reporting Concerns

Participants may report misconduct, safety concerns, harassment, cheating, or disruptive conduct to SPELLBOOK staff through the designated reporting process.

SPELLBOOK may review reports, speak with involved parties, examine game logs or platform records, consider witness statements, and take action it considers appropriate.

SPELLBOOK does not guarantee confidentiality in all situations, but will attempt to handle reports with discretion.

Retaliation against a person who makes a good-faith report is prohibited and may result in disciplinary action.

11. Tickets, Refunds, and Removal from Events

Ticketed events may have their own refund deadlines, transfer rules, and cancellation policies.

Unless otherwise stated in writing, SPELLBOOK may deny a refund when a participant is removed from an event, table, convention, or league program because of a violation of these Terms, the Code of Conduct, venue rules, safety rules, or staff instructions.

If SPELLBOOK cancels an event, SPELLBOOK may provide a refund, credit, transfer, replacement game, or other remedy at its discretion, subject to the event’s posted policy.

SPELLBOOK is not responsible for travel costs, hotel costs, parking, meals, missed work, third-party fees, or other expenses connected to cancelled, changed, or missed events.

12. Prizes, Awards, and Recognition

Seasonal awards, prizes, and recognition are discretionary and subject to eligibility requirements.

SPELLBOOK may withhold, substitute, correct, or revoke prizes if a participant violates these Terms, falsifies records, is removed from the league, becomes ineligible, or if a prize becomes unavailable.

Prizes have no cash value unless SPELLBOOK expressly says otherwise.

13. Online Platforms and Third-Party Services

SPELLBOOK may use third-party platforms such as Discord, Roll20, D&D Beyond, StartPlaying, Google Forms, payment processors, ticketing platforms, convention systems, or other services.

Participants are responsible for following the rules and terms of those third-party platforms.

SPELLBOOK is not responsible for outages, bans, account issues, payment errors, lost messages, platform moderation, technical problems, or data practices controlled by third-party services.

14. Intellectual Property and Player Content

SPELLBOOK owns or controls its logos, branding, original publications, league documents, event names, season structures, adventure materials, website content, graphics, and other intellectual property.

Participants may not copy, sell, publish, distribute, or use SPELLBOOK materials without permission, except as allowed for personal participation in SPELLBOOK games.

Players and DMs retain ownership of their own original characters, backstories, notes, and personal creative contributions, subject to any separate agreement.

By submitting character names, game reports, testimonials, photos, recordings, comments, or other content to SPELLBOOK, you grant SPELLBOOK permission to use that content for league administration, community records, promotion, moderation, event documentation, and seasonal tracking.

SPELLBOOK will not intentionally publish private personal information without permission, except where necessary for safety, legal compliance, dispute resolution, or event administration.

15. Photos, Video, Streaming, and Public Events

Some SPELLBOOK events may be photographed, recorded, streamed, or promoted.

Where required, SPELLBOOK will provide notice or obtain consent before recording or publishing identifiable participants.

Participants may not record, photograph, livestream, or publish another participant without permission from SPELLBOOK and, where appropriate, the individuals involved.

SPELLBOOK may remove any participant who records or publishes others in violation of this section.

16. Privacy and Personal Information

SPELLBOOK may collect personal information needed to create accounts, register characters, manage games, sell tickets, process payments, distribute prizes, communicate with participants, manage safety reports, and administer the league.

This may include names, usernames, contact information, character records, event registrations, attendance records, game logs, payment status, safety reports, and communication records.

SPELLBOOK will use reasonable efforts to protect personal information and will only collect, use, or disclose personal information for reasonable league-related purposes, legal compliance, safety, administration, or as otherwise described in SPELLBOOK’s Privacy Policy.

SPELLBOOK should maintain a separate Privacy Policy that explains what information is collected, why it is collected, how it is used, who it may be shared with, how long it is retained, and how participants may request access or correction.

17. Assumption of Risk

Participation in SPELLBOOK games and events may involve ordinary risks associated with online communities, public events, conventions, group activities, travel, gaming spaces, and interactions with other participants.

You agree to follow staff instructions, venue rules, event rules, safety procedures, and applicable laws.

To the maximum extent permitted by law, you agree that SPELLBOOK is not responsible for injury, loss, damage, conflict, disappointment, technical failure, third-party conduct, or other harm except where liability cannot legally be excluded.

18. Limitation of Liability

To the maximum extent permitted by law, SPELLBOOK, its owners, staff, DMs, contractors, volunteers, partners, sponsors, and representatives are not liable for indirect, incidental, special, consequential, punitive, or exemplary damages, including lost profits, lost opportunities, emotional distress, reputational harm, loss of data, or loss of access to events.

To the maximum extent permitted by law, SPELLBOOK’s total liability for any claim connected to a paid event will not exceed the amount you paid directly to SPELLBOOK for that specific event.

Nothing in these Terms limits liability that cannot legally be limited.

19. Indemnity

You agree to indemnify and hold harmless SPELLBOOK, its owners, staff, DMs, contractors, volunteers, partners, sponsors, and representatives from claims, damages, losses, liabilities, costs, and expenses arising from your breach of these Terms, your misconduct, your violation of law, your infringement of another person’s rights, or your misuse of SPELLBOOK services.

20. Changes to These Terms

SPELLBOOK may update these Terms from time to time.

When material changes are made, SPELLBOOK should provide reasonable notice through the website, account system, email, Discord, event page, or another reasonable method.

Continued use of SPELLBOOK services after updated Terms become effective means you accept the updated Terms.

21. Governing Law

These Terms are governed by the laws of the Province of Alberta and the applicable laws of Canada.

Any dispute will be handled in the courts or dispute-resolution forum legally available in Alberta, unless applicable law requires otherwise.

22. Severability

If any part of these Terms is found invalid or unenforceable, the remaining sections remain in effect.

23. Entire Agreement

These Terms, together with any posted event rules, refund policies, privacy policies, DM agreements, safety policies, and league rules, form the agreement between you and SPELLBOOK regarding participation in SPELLBOOK services.

24. Acceptance

By clicking “I Agree,” creating an account, registering a character, joining a game, purchasing a ticket, applying to DM, or participating in a SPELLBOOK event, you confirm that:

You have read and understood these Terms.
You agree to follow the SPELLBOOK Code of Conduct.
You understand that SPELLBOOK may remove disruptive players or DMs.
You understand that account creation and character registration are free, but some events require paid tickets.
You understand that violation of these Terms may result in removal, suspension, loss of seasonal progress, loss of prizes, or a ban from future SPELLBOOK events.`;

export function TermsOfServiceDialog() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const renderBrandText = (paragraph: string) =>
    renderGrimoireGatheringText(paragraph).map((segment, index) => (
      <Fragment key={`brand-segment-${index}`}>
        {typeof segment === "string" ? renderRainbowSpellbookText(segment) : segment}
      </Fragment>
    ));

  return (
    <>
      <button
        className="button button-secondary"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        View Terms of Service
      </button>

      <dialog className="terms-dialog" ref={dialogRef}>
        <div className="terms-dialog-card stack">
          <div className="inline-actions" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>
              <RainbowSpellbook /> Terms of Service
            </h2>
            <button
              className="button button-secondary"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="terms-dialog-content">
            {TERMS_OF_SERVICE_TEXT.split("\n\n").map((paragraph, index) => (
              <p key={`tos-paragraph-${index}`} style={{ margin: 0 }}>
                {renderBrandText(paragraph)}
              </p>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
