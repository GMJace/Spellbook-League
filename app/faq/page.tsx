import { RainbowSpellbook } from "@/components/rainbow-spellbook";

const faqEntries = [
  {
    question: "What is SPELLBOOK League?",
    answers: [
      "SPELLBOOK League is an organized play community for Dungeons & Dragons Adventurers' League players and Dungeon Masters.",
      "Players can create characters, join games, track progress through the SPELLBOOK app, earn achievements, and participate in a nine-month seasonal campaign structure.",
    ],
  },
  {
    question: "Is it free to join SPELLBOOK League?",
    answers: [
      "Yes. Creating an account, registering characters, and participating in the seasonal league is free.",
      "Some games and convention events may require badges and tickets, but many weekly one-shots and community games are free to play.",
    ],
  },
  {
    question: "What are Grimoire Gatherings?",
    answers: [
      "Grimoire Gatherings are SPELLBOOK's seasonal monthly online convention events.",
      "They feature multiple games run by our roster of SPELLBOOK Dungeon Masters and may include free games, ticketed games, special events, playtests, and seasonal activities.",
    ],
  },
  {
    question: "Do I have to join at the beginning of the season?",
    answers: [
      "No. You can sign up for the season at any point.",
      "The more games you play and log during the season, the further your character can progress, but players are welcome to join even after the season has already started.",
    ],
  },
  {
    question: "How long is a SPELLBOOK season?",
    answers: [
      "A SPELLBOOK season runs for approximately nine months, from September through May.",
      "At the end of the season, awards, prizes, and community recognition are distributed during the final convention event of the season.",
    ],
  },
  {
    question: "What is the SBAL Character Log?",
    answers: [
      "The SBAL Character Log is the official record of your character's Adventurers' League adventures.",
      "It tracks games played, rewards earned, achievements unlocked, gold, magic items, downtime, story progress, and other important character details.",
      "Adventures played anywhere in the Adventurers' League can be recorded, not only games hosted by SPELLBOOK.",
      "For convenience, a DM on the official SPELLBOOK roster can log a game for all participating players. When playing with a DM who is not on the SPELLBOOK roster, each player can add the game to their own Character Log.",
    ],
  },
  {
    question: "Why do I need to use the Character Log?",
    answers: [
      "There is no requirement to use the Character Log. It is completely optional.",
      "However, it offers so many benefits that our goal is for it to become widely accepted as the standard throughout the Adventurers League community.",
      "The Character Log helps keep organized play fair, organized, and consistent. Transparency is our policy.",
      "Because players may join games run by many different DMs, the log provides a clear record of a character's progress and makes it easier for DMs to review relevant character details before a game.",
    ],
  },
  {
    question: "Can I play more than one character?",
    answers: [
      "Yes. Players may register multiple characters, but each character should have their own separate Character Log.",
      "Progress, rewards, and achievements are tracked per character unless the event rules state otherwise.",
    ],
  },
  {
    question: "Are SPELLBOOK games Adventurers League legal?",
    answers: [
      "All SPELLBOOK League games are played with Adventurers League-legal modules and rules.",
      "However, there may be games played within the SPELLBOOK server that are not compatible with AL. SPELLBOOK playtests or special events may use different rules, and these games will be clearly marked as such.",
    ],
  },
  {
    question: "Do I need to use DnDBeyond to play?",
    answers: [
      "No, you do not need to use DnDBeyond. However, DnDBeyond or the Roll20 character sheet is strongly recommended, as both make character creation and management much easier.",
      "DnDBeyond, when paired with Beyond20, Discord, and Roll20, provides a smooth and convenient online play experience.",
      "Some DMs may allow other character sheet formats. However, for ease of use, compatibility, and access to SPELLBOOK content, we strongly prefer DnDBeyond or Roll20 character sheets. Ultimately, the choice is yours.",
    ],
  },
  {
    question: "What tools do I need to play online?",
    answers: [
      "Our online games use Discord for voice and community communication and Roll20 for the virtual tabletop.",
      "Past that, nothing is mandatory. We strongly recommend using DnDBeyond for character sheets, and Beyond20 to connect rolls between DnDBeyond and Roll20.",
    ],
  },
  {
    question: "Do I need a webcam?",
    answers: [
      "Usually, no. Most SPELLBOOK online games require Discord voice chat, but webcams are usually optional unless a specific event or DM says otherwise.",
    ],
  },
  {
    question: "Are new players welcome?",
    answers: [
      "Yes. SPELLBOOK League is designed to be welcoming to new players. Many of our games are beginner-friendly, and the Player Creation Guide can help you build your first league character.",
      "We also rely on our outstanding player community to maintain that welcoming reputation. Our veteran players are excellent at helping newer players who are looking for advice, guidance, or support.",
    ],
  },
  {
    question: "How do I sign up for a game?",
    answers: [
      "First, you will need a Discord account and a Roll20 account.",
      "Next, create a SPELLBOOK account and register your character.",
      "Once your character is registered, you can browse the available games and sign up for an open seat.",
      "Some games are free, while others may require the purchase of a ticket, badge, or token.",
    ],
  },
  {
    question: "What is the difference between free games and ticketed games?",
    answers: [
      "Free games are community-run sessions that do not require payment to join. Ticketed games are paid sessions, often offered during conventions, special events, or by professional DMs on the SPELLBOOK roster.",
      "All ticketed games are run by approved SPELLBOOK DMs whose quality and professionalism we stand behind. These DMs have public profiles and ratings that players can review before booking a seat.",
      "Free games may be run for a variety of reasons, including playtesting new material, community events, or giving developing DMs an opportunity to gain experience.",
      "Any DM may create and promote a free game on the SPELLBOOK server. While many of these games are excellent, SPELLBOOK cannot guarantee that every free game will meet the same professional standard as our ticketed sessions.",
    ],
  },
  {
    question: "Do I need a badge to buy game tickets?",
    answers: [
      "For certain SPELLBOOK convention events, most notably our monthly Grimoire Gatherings, a badge may be required before purchasing game tickets.",
      "One badge allows a player to purchase tickets for available games during that event. Each player needs their own badge unless otherwise stated.",
    ],
  },
  {
    question: "Can I cancel or transfer a ticket?",
    answers: [
      "Cancellation, refund, and transfer rules may vary by event. Check the event pack or ticket policy before purchasing.",
      "The Grimoire Gathering events have a 72-hour before the event refund policy.",
      "If you are removed from a game or event for violating league rules, you may not be eligible for a refund.",
    ],
  },
  {
    question: "What happens if I have to miss a game?",
    answers: [
      "If you are unable to attend a game, notify the DM or event organizer as soon as possible.",
      "We understand that life happens; however, repeated no-shows may affect your ability to register for future games, particularly ticketed events or sessions with limited seating.",
    ],
  },
  {
    question: "What happens if a DM cancels a game?",
    answers: [
      "If a DM must cancel a game, SPELLBOOK may reschedule the session, assign a replacement DM, transfer players to another table, issue account credit, or provide a refund in accordance with the event's posted refund policy.",
      "We will work with affected players to find a suitable solution as quickly as possible.",
    ],
  },
  {
    question: "How do achievements work?",
    answers: [
      "Achievements are special accomplishments earned through play.",
      "They may reward memorable moments, heroic actions, seasonal progress, character milestones, or unusual feats completed during games. Achievements help show your character's story and progress throughout the season.",
      "Our achievements only pertain to SBAL games hosted in the SPELLBOOK server.",
    ],
  },
  {
    question: "Do achievements affect my character mechanically?",
    answers: [
      "Some achievements are awarded purely for recognition, while others may contribute to seasonal progress, awards, or special league benefits.",
      "Each season will explain how achievements are used. Any special rewards, benefits, or recognition connected to an achievement will be clearly stated in the achievement's description.",
    ],
  },
  {
    question: "What are seasonal awards?",
    answers: [
      "Seasonal awards are prizes, recognition, or special benefits distributed at the end of each season.",
      "They may recognize player participation, character progression, DM contributions, achievement completion, community support, or other notable accomplishments throughout the season.",
      "Seasonal prizes are made possible through the support of our sponsors. As a result, occasional sponsor acknowledgements or advertisements may appear on the SPELLBOOK server.",
    ],
  },
  {
    question: "Do I have to play every month?",
    answers: [
      "No. Participation is flexible, and you can play as often as your schedule allows.",
      "We understand that life is busy, so we try to accommodate players by offering games across multiple time zones and at various times throughout the day.",
      "The more SPELLBOOK Adventurers League games you play and log, the further you may progress during the season and the more opportunities you may have to unlock achievements or qualify for our seasonal awards.",
    ],
  },
  {
    question: "Can I become a SPELLBOOK Dungeon Master?",
    answers: [
      "Yes, absolutely. Prospective DMs may apply to join the official SPELLBOOK DM roster.",
      "The application process includes a short questionnaire followed by a scheduled game attended by a SPELLBOOK administrator, who will participate as a player and evaluate the table experience.",
      "Once approved, DMs may create and run ticketed games on the SPELLBOOK server.",
      "Rostered DMs are expected to read the SBAL DM Guide, follow league procedures, use the game-logging system, support table safety, and help maintain a welcoming, professional, and inclusive play environment.",
      "Approved DMs also gain access to our private DM channels, which include adventures, tools, tips, guides, and other resources designed to help them improve their skills and become better Dungeon Masters.",
    ],
  },
  {
    question: "Can DMs run paid games?",
    answers: [
      "Yes, but only approved members of the SPELLBOOK DM roster may run ticketed games.",
      "SPELLBOOK DMs may choose to offer free community games or paid ticketed games, depending on the event, table type, and league guidelines.",
      "DMs running paid games are held to additional standards for reliability, preparation, communication, and professionalism.",
    ],
  },
  {
    question: "Do new DMs get training?",
    answers: [
      "Yes. New and aspiring DMs may be offered tutorials and support for the SPELLBOOK app, Roll20, DnDBeyond, Discord, Beyond20, game setup, and league logging procedures.",
    ],
  },
  {
    question: "What is expected of SPELLBOOK DMs?",
    answers: [
      "SPELLBOOK DMs are expected to be reliable, fair, prepared, welcoming, and respectful.",
      "They should follow the DM Guide, use safety tools, log games properly, communicate clearly, and help create a fun table experience.",
    ],
  },
  {
    question: "Can a player or DM be removed from the league?",
    answers: [
      "Yes. SPELLBOOK reserves the right to remove players or DMs who are disruptive, abusive, unsafe, dishonest, unreliable, or otherwise harmful to the community.",
      "This helps protect the league and maintain a positive play environment.",
    ],
  },
  {
    question: "What should I do if there is a problem at a table?",
    answers: [
      "Contact the DM first if it is safe and appropriate to do so.",
      "If the issue involves safety, harassment, cheating, misconduct, or a serious concern, contact SPELLBOOK admin through the official reporting process.",
      "If it is an event emergency, please contact GMJace or DMTitanNorth on Discord directly.",
    ],
  },
  {
    question: "Are safety tools used?",
    answers: [
      "Yes. SPELLBOOK supports table safety tools and expects players and DMs to respect boundaries, content warnings, and safety procedures.",
      "Players should never be mocked or pressured for using a safety tool. If this is an issue, please contact GMJace or DMTitanNorth on Discord directly.",
    ],
  },
  {
    question: "Can I stream or record my game?",
    answers: [
      "Only with permission. Players and DMs should not record, stream, photograph, or publish other participants without approval from all players at the table.",
      "If DMs wish to stream and have the table's permission, contact GMJace and we can provide SPELLBOOK resources for your stream.",
    ],
  },
  {
    question: "Where does the community gather?",
    answers: [
      "The SPELLBOOK community is primarily organized through Discord, with games supported through tools such as Roll20, DnDBeyond, and Beyond20.",
    ],
  },
  {
    question: "Who do I contact for help?",
    answers: [
      "For account issues, character logging questions, event support, DM applications, or community concerns, contact SPELLBOOK staff through their listed emails, an official support channel, or our contact form.",
    ],
  },
] as const;

const adminContacts = [
  {
    title: "League / Grimoire Gathering Support",
    description:
      "For campaign, schedule and event questions or issues please reach out directly:",
    href: "mailto:trevor@spellbookrpg.games",
    label: "trevor@spellbookrpg.games",
  },
  {
    title: "SPELLBOOK Account or Store Support",
    description:
      "For Store, App or SPELLBOOK account help, please reach out directly:",
    href: "mailto:jace@spellbookpublishing.com",
    label: "jace@spellbookpublishing.com",
  },
  {
    title: "AL or LoG Rules Support",
    description:
      "For Adventurers' League or Legends of Greyhawk Support please reach out directly:",
    href: "mailto:Admin@spellbookrpg.games",
    label: "Admin@spellbookrpg.games",
  },
];

export default function FaqPage() {
  return (
    <main className="page-shell">
      <section className="stack" style={{ textAlign: "center" }}>
        <div className="list-card stack">
          <div>
            <p className="eyebrow">Help</p>
            <h1 style={{ margin: "0.35rem 0 0" }}>FAQ / Contact</h1>
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              Reach the right <RainbowSpellbook /> admin quickly for account,
              league, event, and rules support.
            </p>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Contact divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading" style={{ justifyContent: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>Contact A Specific Admin</h2>
            </div>
          </div>

          <div className="stack">
            {adminContacts.map((contact) => (
              <div
                key={contact.title}
                className="list-card stack"
                style={{ gap: "0.5rem" }}
              >
                <h3 style={{ margin: 0 }}>{contact.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {contact.description}
                </p>
                <div
                  className="inline-actions"
                  style={{ flexWrap: "wrap", justifyContent: "center" }}
                >
                  <a
                    className="button secondary"
                    href={contact.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {contact.label}
                  </a>
                </div>
              </div>
            ))}

            <div className="list-card stack" style={{ gap: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>D&amp;D 5.5E Rules Support</h3>
              <p className="muted" style={{ margin: 0 }}>
                For any D&amp;D rules inquiries visit our Discord channel:
              </p>
              <div
                className="inline-actions"
                style={{ flexWrap: "wrap", justifyContent: "center" }}
              >
                <a
                  className="button secondary"
                  href="https://discord.com/channels/744348925414080592/1482842640104816770"
                  rel="noreferrer"
                  target="_blank"
                >
                  Rules Layer Channel
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="FAQ divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div className="section-heading" style={{ justifyContent: "center" }}>
            <div>
              <h2 style={{ margin: 0 }}>FAQ</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Quick answers about the league, logging, events, Dungeon Masters,
                tickets, and community expectations.
              </p>
            </div>
          </div>

          <div className="stack">
            {faqEntries.map((entry) => (
              <div
                key={entry.question}
                className="list-card stack"
                style={{ gap: "0.5rem" }}
              >
                <h3 style={{ margin: 0 }}>{entry.question}</h3>
                <div className="stack" style={{ gap: "0.6rem" }}>
                  {entry.answers.map((answer) => (
                    <p key={answer} className="muted" style={{ margin: 0 }}>
                      {answer}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
