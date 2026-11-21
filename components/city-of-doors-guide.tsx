import Link from "next/link";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { SigilMapViewer } from "@/components/sigil-map-viewer";
import { HomepageSigilArt } from "@/components/homepage-sigil-art";
import { SigilSpireArt } from "@/components/sigil-spire-art";

const wards = [
  {
    name: "Clerks’ Ward",
    description: "Scribes, officials, records, and respectable entertainment. The Hall of Information is a good first stop for visitors. The Hall of Records is the Fated’s seat, while the Civic Festhall is the public face of the Society of Sensation.",
  },
  {
    name: "Hive Ward",
    description: "Crowded streets, cheap rooms, outcasts, and people making do beyond the reach of wealthier wards. The Gatehouse, Mortuary, and Smoldering Corpse Bar are among its best-known landmarks.",
  },
  {
    name: "Lady’s Ward",
    description: "Noble estates and the city’s machinery of justice. The High Courts, Barracks, Prison, and Armory put judges, patrols, jailers, and weaponsmiths within a few streets of one another.",
  },
  {
    name: "Lower Ward",
    description: "Foundries, workshops, smoke, and a concentration of portals to the Lower Planes. Visit the Great Foundry, the Shattered Temple, or the Ditch, a polluted waterway with its own history of planar traffic.",
  },
  {
    name: "Market Ward",
    description: "The Great Bazaar, portal-key dealers, trade houses, and artisans in the former Guildhall district. The Great Gymnasium is headquarters of the Transcendent Order.",
  },
  {
    name: "Undersigil",
    description: "Tunnels, ruins, and buried passages under the streets. Criminals, monsters, and factions that have lost their place above gather here. Nowhere is one of their meeting grounds.",
  },
];

const factions = [
  {
    name: "Athar · Defiers",
    belief: "The beings called gods have power, and the Athar dispute their claim to divinity.",
    headquarters: "Shattered Temple",
  },
  {
    name: "Bleak Cabal · Bleakers",
    belief: "The multiverse offers no inherent meaning. People must make their own.",
    headquarters: "Gatehouse",
  },
  {
    name: "Doomguard · Sinkers",
    belief: "Entropy is inevitable and has a rightful place in existence.",
    headquarters: "Armory",
  },
  {
    name: "Fated · Takers",
    belief: "People earn what they have through their own effort and willingness to claim it.",
    headquarters: "Hall of Records",
  },
  {
    name: "Fraternity of Order · Guvners",
    belief: "Reality follows laws. Discover those laws and you can use them.",
    headquarters: "High Courts",
  },
  {
    name: "Hands of Havoc · Wreakers",
    belief: "Entrenched institutions suppress freedom. Upheaval makes change possible.",
    headquarters: "Various warehouses",
  },
  {
    name: "Harmonium · Hardheads",
    belief: "A shared order brings peace, and force can be used to establish it.",
    headquarters: "Barracks",
  },
  {
    name: "Heralds of Dust · Dusters",
    belief: "Ordinary existence is already a kind of death. True Death lies beyond it.",
    headquarters: "Mortuary",
  },
  {
    name: "Mercykillers · Jailers",
    belief: "Justice requires punishment for wrongdoing.",
    headquarters: "Prison",
  },
  {
    name: "Mind’s Eye · Seekers",
    belief: "Growth, discovery, and craft can lead an individual toward divinity.",
    headquarters: "Great Foundry",
  },
  {
    name: "Society of Sensation · Sensates",
    belief: "Direct experience is the path to understanding reality.",
    headquarters: "Civic Festhall",
  },
  {
    name: "Transcendent Order · Ciphers",
    belief: "Train mind and body together until right action comes without hesitation.",
    headquarters: "Great Gymnasium",
  },
];

export function CityOfDoorsGuide() {
  return (
    <div className="stack quests-guide-page city-of-doors-guide" id="city-of-doors-top">
      <header className="panel stack quests-guide-header city-of-doors-header">
        <p className="eyebrow"><RainbowSpellbook /> Lore Guides</p>
        <h1 className="lore-guide-icon city-of-doors-logo">
          <img
            alt="Sigil, the City of Doors"
            className="lore-guide-icon-light"
            src="/sigil-logo-black-large.png"
            width="1698"
            height="926"
          />
          <img
            alt="Sigil, the City of Doors"
            className="lore-guide-icon-dark"
            src="/sigil-logo-white-large.png"
            width="1698"
            height="926"
          />
        </h1>
        <Link className="button button-secondary button-small" href="/#lore-guides">
          Back to SPELLBOOK Lore Guides
        </Link>
        <p>Sigil is pronounced SIG-uhl, with a hard g.</p>
      </header>

      <article className="panel quests-guide-copy">
        <section id="city-at-the-center" className="city-of-doors-introduction">
          <h2>The City at the Center</h2>
          <SigilSpireArt />
          <p>Sigil is a city built along the inside of a vast ring suspended above the Spire at the center of the Outlands. Its doors lead across the multiverse. A tavern cellar might open into the Feywild, a warehouse arch might admit cargo from another plane, and a doorway you used yesterday might lead somewhere else today. The people who live here call themselves Cagers. They call the city the Cage because leaving depends on finding a door that opens where you need to go.</p>
          <p>The Outlands sit at the center of the Outer Planes in the Great Wheel cosmology. Sixteen gate-towns around the Outlands connect to those planes, and each takes on something of the character of its destination. At the center rises the Spire, with Sigil suspended above it. The city’s own portals make it a crossroads for travelers from well beyond the Outlands.</p>
          <p>Streets and buildings cling to the ring’s inner surface. From a clear vantage point, a Cager can look up across the hollow and see districts curving overhead. There is no visible sun. The ambient light swells toward peak, the city’s equivalent of noon, and fades toward antipeak, its midnight. Smoke and haze often hide the far side of the ring. In the Lower Ward, the foundries and nearby planar portals make the air hotter and dirtier.</p>
          <p>Sigil’s neutrality makes room for neighbors who would rarely share a street anywhere else. Celestials, fiends, gith, modrons, and travelers from the Material Plane meet as merchants, diplomats, rivals, and customers. An angel and a devil can sit down to negotiate, and the clerk who records their agreement might have more influence over the outcome than either of them expects.</p>
        </section>

        <section id="portals-and-keys">
          <h2>Portals and Keys</h2>
          <p>A Sigil portal can occupy any bounded opening, from a doorframe to an arch under a bridge. Inactive portals usually look ordinary, even to Detect Magic. Some routes are dependable, some open briefly, and others change destinations on a schedule or in patterns that scarcely anyone understands. The Fraternity of Order has spent generations keeping records of portals and looking for the rules behind them.</p>
          <p>A portal key is whatever triggers that particular crossing. It could be a coin, a spoken phrase, a gesture, or even a thought. Some crossings depend on timing or who is attempting to pass. Knowing where a portal is, when it opens, and what activates it are three pieces of information that a broker can sell separately.</p>
          <p>For play, ordinary Plane Shift cannot take a traveler into or out of Sigil. Local movement magic such as Misty Step can still work inside the city. The 2023 setting also treats permanent teleportation circles as a specific exception under its portal rules, and spells such as Gate and Banishment interact with the city’s boundary differently than they do elsewhere. This is why a reliable return portal is worth arranging before a party leaves.</p>
        </section>

        <section id="lady-and-dabus" className="city-of-doors-dabus">
          <h2>The Lady of Pain and the Dabus</h2>
          <p>The Lady of Pain, known to Cagers as Her Serenity, is Sigil’s ultimate authority. Her origin and motives remain a mystery. She drifts through the city in robes, her face surrounded by blades. She controls access to Sigil and bars deities from entering. Day-to-day affairs are handled by factions and civic officials, while the Lady intervenes when something threatens the city or challenges her authority. Those who draw her attention risk death beneath her shadow or imprisonment in one of her Mazes, extradimensional prisons fashioned for their occupants. Worshipping her is itself dangerous.</p>
          <p>The dabus are Sigil’s floating custodians. They repair streets and buildings, tend the city, and sometimes carry the Lady’s decrees. They communicate through rebuses: images that appear in the air and combine to convey words or ideas. A string of pictures might need to be read for its sound as much as for what each picture depicts.</p>
          <p>Fell is their best-known exception. He pledged himself to Aoskar, the god of portals, fell out of the Lady’s service, and lost the ability to hover. He now walks the streets and runs a tattoo shop behind the Smoldering Corpse Bar. His knowledge of portals makes him worth visiting even if you have no intention of getting inked. The Lady destroyed Aoskar, and his former shrine survives as the Shattered Temple, now headquarters of the Athar.</p>
          <HomepageSigilArt />
        </section>

        <section id="wards-and-factions">
          <h2>The Wards of Sigil</h2>
          <p>Classic AD&amp;D maps show six surface wards, including the Guildhall Ward. The 2023 Sigil and the Outlands folds Guildhall into the Market Ward and gives Undersigil the sixth entry in its gazetteer. An older map can therefore still be useful if a Cager tells you to look for a workshop in Guildhall.</p>
          <SigilMapViewer />
          <div className="table-wrap" tabIndex={0} role="region" aria-label="The wards of Sigil">
            <table className="city-of-doors-table">
              <caption>The wards of Sigil</caption>
              <colgroup>
                <col className="city-of-doors-table-name" />
                <col />
              </colgroup>
              <thead>
                <tr><th scope="col">Ward</th><th scope="col">What you’ll find there</th></tr>
              </thead>
              <tbody>
                {wards.map((ward) => (
                  <tr key={ward.name}>
                    <th scope="row">{ward.name}</th>
                    <td>{ward.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>The 2023 gazetteer and the classic In the Cage: A Guide to Sigil describe these neighborhoods at different points in the setting’s publication history.</p>
        </section>

        <section id="factions-and-government">
          <h2>Factions and Government</h2>
          <p>In Sigil, a philosophy can get you a job, put you in charge of a civic institution, or make you enemies before you’ve said a word. Factions organize around beliefs about how the multiverse works and what people should do about it. Their leaders are called factols. The Harmonium patrols the streets, the Fraternity of Order operates the courts, and the Mercykillers run the prison. They can all call themselves defenders of order and still quarrel over how to handle the same case.</p>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="The twelve ascendant factions in fifth edition">
            <table className="city-of-doors-table">
              <caption>The twelve ascendant factions in fifth edition</caption>
              <colgroup>
                <col className="city-of-doors-table-name" />
                <col />
                <col className="city-of-doors-table-name" />
              </colgroup>
              <thead>
                <tr><th scope="col">Faction</th><th scope="col">Belief</th><th scope="col">Headquarters</th></tr>
              </thead>
              <tbody>
                {factions.map((faction) => (
                  <tr key={faction.name}>
                    <th scope="row">{faction.name}</th>
                    <td>{faction.belief}</td>
                    <td>{faction.headquarters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>The fifth-edition gazetteer also names six minor factions: the Free League, Incanterium, Ring Givers, Revolutionary League, Coterie of Cakes, and Undivided. A faction can matter in a neighborhood or among a particular trade without holding one of the city’s major institutions.</p>
        </section>

        <section id="city-history">
          <h2>Stories from Sigil’s History</h2>
          <ul>
            <li><strong>The fall of Aoskar.</strong> The worship of the god of portals rose within Sigil until the Lady destroyed him and shattered his temple. Fell’s survival gives the city a living witness to that history.</li>
            <li><strong>The Great Upheaval.</strong> When roughly fifty factions descended into open conflict, the Lady gave them a fortnight to reduce their number to fifteen. Groups fled, dissolved, or consolidated. Those that survived went on to dominate civic life, continuing their struggle for influence in the rivalry known as the kriegstanz.</li>
            <li><strong>The Faction War.</strong> In the late AD&amp;D adventure, Duke Rowan Darkwood of the Fated made a bid to seize control of Sigil. The struggle shattered the old faction order. The 2023 setting presents twelve ascendant factions with a different political lineup. It also features figures such as Darkwood and Hashkar again, so the fifth-edition roster is best read on its own terms when choosing a campaign era.</li>
            <li><strong>The Arcane Remains.</strong> In Of Sigil and the Sea, an Arcane galleon entered through Seafarer’s Arch, blocked the Ditch, and was destroyed by the Lady of Pain. The wreck is associated with the old reputation that the Arcane, now called the Mercane, are unwelcome in Sigil. A local legend identifies the Knife in the River as a blade torn from the Lady’s halo during the encounter.</li>
          </ul>
        </section>

        <section id="life-in-sigil">
          <h2>Life in Sigil</h2>
          <p>The city runs on workaday uses of extraordinary magic. A merchant makes a living because the portal in their storeroom opens somewhere spices are cheap. A guide, or tout, earns their fee by knowing which streets and doors lead where. A mimir, a magical device that stores and relays information, can tell a traveler what they’re looking at, though the account it gives depends on what was recorded. At the Civic Festhall, sensory stones let visitors experience preserved sensations and memories. In the Cage, information can be bought, carried, experienced, and withheld.</p>
          <p>Cagers have a vocabulary of their own. Chant means news, gossip, or useful information. Jink is money. A cutter is someone worth taking seriously, a berk is a fool, and a prime comes from the Material Plane. A shopkeeper asking whether you’ve got the chant on a door wants to know what you’ve heard about it. The price comes after.</p>
          <img
            className="city-of-doors-life-art"
            src="/sigil-art-city.png"
            alt="The city of Sigil"
            width="1774"
            height="887"
            loading="lazy"
          />
        </section>

        <section id="ordo-and-the-keep">
          <div className="inline-actions" style={{ justifyContent: "space-between" }}>
            <h2>The ORDO and the Keep</h2>
            <Link className="button button-secondary button-small" href="/lore/ordo-guide">
              ORDO Guide
            </Link>
          </div>
          <p>The Keep, the ORDO’s demiplane fortress, gives agents a home base accessed through Sigil and a way into the wider planes. A squad can take a bounty at the Keep, hire a tout to find the right doorway, and secure a key in the Great Bazaar. On the return trip, the same door may demand a different key, or the prime witness may insist on entering through a gate the squad has never used.</p>
        </section>

        <section id="sigil-and-union">
          <h2>Sigil and Union</h2>
          <p>Sigil and Union are linked by trade. The Epic Level Handbook already describes commercial ties between some businesses in Mercane-governed Union and merchants in Sigil. In SPELLBOOK QUESTS, that link runs through local brokers, factors, and portal couriers. Sigil’s Great Bazaar takes commissions and brings in buyers. Union’s Mercane trading houses supply spelljamming helms, magical antiquities, and specialized Arc-Tec components. Routine goods cross by courier. For a rare artifact, a disputed sale, or a valuable commission, the trading house expects the buyer in Union. The wreck in the Ditch gives the Mercane a reason to leave their visible dealings in Sigil to local brokers.</p>
          <p>That relationship gives the ORDO work on both sides of the door. A Union house can post a bounty when a shipment vanishes, while a Sigilian broker can hire agents to trace a stolen relic. If both parties produce receipts bearing the same Mercane seal, the squad has a reason to visit Union and find out who signed twice.</p>
        </section>

        <p><a href="#city-of-doors-top">Back to top</a></p>
      </article>
    </div>
  );
}
