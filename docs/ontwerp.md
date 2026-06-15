# Morning Report — Levend Ontwerpdocument

> Status: brainstorm / ontwerp. Nog niet in bouw.
> Dit is een **levend document**: we blijven het aanvullen per ronde. Onderaan staat een lijst met open vragen en wat de volgende rondes worden.

---

## 1. Wat we bouwen

Een persoonlijk **ochtendrapport** dat elke dag rond 08:00 (lokale tijd, Nederland) klaarstaat als web-app. Het bundelt nieuws, releases, een vooruitkijkende kalender, het weer en meer, gefilterd op jouw interesses. Het is dynamisch (interesses toevoegen, feedback geven), blijft zo lokaal/goedkoop mogelijk, en draait beschikbaar op laptop én telefoon zonder dat jij een PC hoeft aan te hebben staan.

Het rapport heeft een eigen redactionele AI-persoonlijkheid (**Sol / "Daily Paper"**) die over tijd evolueert, verbanden legt en context onthoudt.

### Kernprincipes
- **Breed aan de voorkant, goedkoop in de diepte.** Eerst een goedkope brede scan van alles, daarna alleen een dure deep-dive op wat ertoe doet.
- **Up to date, geen oud nieuws — maar wél cross-references.** Het systeem onthoudt alles (voor verwijzingen en continuïteit), maar toont alleen wat nieuw/recent is.
- **Geen reclame.** Gesponsorde berichten en advertorials komen niet in het rapport.
- **Eén werkende versie.** Geen v1 → v2 → v3-herschrijvingen. Modulair bouwen zodat we er eindeloos op kunnen doorbouwen.
- **Lokaal waar het kan, cloud waar het moet.** Welk profiel je bent staat lokaal; wat je volgt staat centraal.

---

## 2. Technische architectuur

| Onderdeel | Keuze |
|---|---|
| Hosting | **Vercel** (Hobby/gratis tier), als **PWA** — installeerbaar op laptop én telefoon |
| Database | **Supabase** (gratis tier) — centrale opslag van profielen, interesses, archief, Sol's geheugen |
| Scheduler | **Externe gratis scheduler** (bijv. cron-job.org) die het Vercel-endpoint rond **08:00 Europe/Amsterdam** aanroept |
| AI | Gedeelde **Claude API-key** (jouw bestaande toegang) |
| Login | **Geen login.** Profielen zonder wachtwoord; welk profiel je bent wordt lokaal in de browser onthouden |

### Belangrijke randvoorwaarden (uit de techniekronde)
- **Vercel-cron op Hobby is UTC-only en draait max. dagelijks.** Daarom een externe scheduler die zomertijd/wintertijd zelf corrigeert (Vercel-cron zou een uur verschuiven tussen seizoenen).
- **Een Vercel-functie op Hobby mag max. ~10 seconden draaien.** Daarom wordt de generatie **opgesplitst in korte stappen** (per sectie/onderwerp), elk ruim binnen de 10s. Geen enkele "maak het hele rapport"-call.
- **Kostenplafond: ~€0,30 per rapport.** 30 ochtenden ≈ €9/maand, binnen je grens van ~€10. Bewaakt via de stapsgewijze aanpak (alleen deep-diven wat door de filter komt) en geheugencompactie voor Sol.
- Gratis tiers zijn ruim voldoende voor 2 gebruikers (bandbreedte, functie-invocaties, database).

### Modulaire opzet
Het systeem wordt opgebouwd uit losse modules zodat we kunnen blijven uitbreiden zonder herschrijven:
- **Ingestie** — brede scan van bronnen, in twee modi: *feed-gebaseerd* (RSS/API + subreddits) en *query-gebaseerd* (vrije eigen onderwerpen → dagelijkse web-search). Filtert gesponsorde/advertorial content er meteen uit.
- **Ranking/interessemotor** — bepaalt belang & wat deep-dive verdient
- **Deep-dive/generatie** — samenvatten & duiden (opgesplitst i.v.m. 10s-limiet)
- **Archief/geheugen** — gesectioneerde opslag, dedupe, cross-refs
- **Sol** — redactionele persoonlijkheid & synthese
- **Roadmap/kalender** — vooruitkijkende eventstore
- **Presentatie** — PWA, voorpagina, secties
- **Invoer** — iOS Shortcut + web-app

---

## 3. Gebruikers & profielen

- v1 voor **jou + één vriend**.
- **Iedereen z'n eigen profiel** met eigen interesses, feedback en Sol-context.
- **Geen login**; profielkeuze wordt lokaal onthouden. API-key mag gedeeld worden (vertrouwd).

---

## 4. Onderwerpen

De lijst blijft bewust **breed**. De concrete bronnen per categorie staan in sectie 5 (Bronnen).

### Tech
- CPU/GPU-releases & prijsontwikkeling
- Smartphones, wearables, brain interfaces & onderliggende tech (aankondigingen + geruchten)
- AI-nieuws: modellen, controverses, bedrijfsverschuivingen, "meta"-werkwijzen, dagrelevantie
- Grote tech-bedrijven: acquisities, rechtszaken, ontslagen, kwartaalcijfers
- Gaming-hardware, -industrie & -software (DLSS e.d.)
- Overheidsregulering & privacy rond tech
- Consumentendrones
- Wapensystemen
- Auto's
- Raketten & ruimte
- OS-level / creative software / emulators / AI-workflows
- Af en toe een "weird/fun" item
- Halfgeleider-toeleveringsketen: TSMC, **ASML** (NL), chip-exportcontroles
- Developer-tooling & framework-releases (Node/Deno/Bun, TypeScript, React/Next.js, Flutter)
- Open-source, self-hosting & homelab
- Cybersecurity: breaches, ransomware, kritieke CVE's
- Robotica & humanoïde robots
- AR/VR/XR-hardware
- Opslag- & displaytech, incl. SSD/RAM-prijzen
- Connectiviteit & standaarden: Matter/Thread, Wi-Fi, 5G/6G, USB/Thunderbolt
- Batterij- & energieopslagtech

### Wereldtoneel
- Klimaat
- Mensenrechten
- Conflict & terreurorganisaties
- Thema's & onderhandelingen tussen landen
- Centrale banken (ECB, Fed) — rentebesluiten
- Macro-indicatoren: inflatie/CPI, werkgelegenheid, GDP
- Verkiezingen & politieke transities (kalender)
- Handel & tarieven
- Energiemarkten & grondstoffen (olie/gas)
- Volksgezondheid/uitbraken (WHO)
- Toeleverketens & scheepvaart-knelpunten
- Natuurrampen & extreem weer (koppelt aan klimaat + weermodule)

### Financieel / Portfolio (eigen spoor)
- Wereldwijd → continentaal → Nederlands
- Opgeslagen portfolio-instrumenten: earningscalls + generale ontwikkelingen
- Wetgeving rond portfolio-relevante bedrijven/organisaties
- Dividenddata, ex-dividend, aandelensplitsingen
- Analist-upgrades/downgrades & koersdoelaanpassingen
- Short-specifieke signalen: short-interest, borrow-beschikbaarheid, squeeze-risico, short-sale-verboden
- Sector-/indexbewegingen & sentiment (bijv. VIX)
- IPO's & grote beursintroducties

### Games
- Tech die ontwikkeld wordt
- Upcoming releases
- Grote updates
- Review-scores (OpenCritic/Metacritic) voor releases die je volgt
- Game-engine nieuws (Unreal, Unity, Godot)
- Emulatie- & game-preservation rechtszaken

### Wetenschap
- Baanbrekend uit Nature e.d., versimpeld
- Domeingewichten: ruimte/astro, biotech/geneeskunde, fusie/energie, materialen, neurowetenschap, klimaatwetenschap
- arXiv-preprints voor frontier (sneller, ruwer) naast Nature
- Meta-wetenschap: replicatiecrises, retracties, Nobelprijzen

### Frontier (eigen categorie — breder dan tech)
**Energie & materie:** fusie-energie · next-gen kernenergie (SMR's, thorium, gesmolten-zout) · vastestofbatterijen & grid-storage · groene waterstof & synthetische brandstoffen · kamertemperatuur-supergeleiding (claims + debunks) · metamaterialen & 2D-materialen

**Quantum & fundamenteel:** quantumcomputing (qubits, foutcorrectie, advantage) · quantumsensing & -internet · deeltjesfysica & kosmologie (LHC, donkere materie/energie, Hubble-spanning)

**Ruimte:** maan-economie & bases (Artemis) · exoplaneten & biosignaturen (JWST) · asteroïde-mijnbouw · ruimte-zonne-energie

**Bio & leven:** genbewerking (CRISPR, prime/base editing) · longevity & verouderingsonderzoek · synthetische biologie · lab-gekweekte organen & xenotransplantatie · brain-computer interfaces (frontier-laag) · de-extinctie

**AI & compute frontier:** AGI-richtingen, scaling laws, nieuwe architecturen · AI-interpreteerbaarheid · AI-for-science · neuromorfisch/fotonisch/analoog computing · DNA-dataopslag

**Aarde & klimaat frontier:** geo-engineering (SRM, oceaanbemesting) · direct air capture op schaal

**Frontier-meta:** frontier-governance (wie reguleert de rand) · big-science & financiering (waar clusteren doorbraken) · hype-vs-realiteit-tracker

---

## 5. Bronnen

Bronnen worden ingedeeld naar **toegangsmethode**, want dat bepaalt de kosten: **open RSS** (gratis, ideaal voor de brede scan), **gratis API** (finance, weer, arXiv) of **query-gebaseerd** (vrije onderwerpen zonder feed → dagelijkse web-search).

### Brede wereldlaag (de wire-sweep)
Reuters, AP, AFP, BBC, The Guardian, Al Jazeera. Allemaal RSS. Basis voor klimaat, mensenrechten, conflict en geopolitiek.

### Tech — breed & hardware
The Verge, Ars Technica, Engadget, TechCrunch, Wired · Tom's Hardware, VideoCardz, Igor's Lab, GamersNexus · Windows Central, Android Central, 9to5Mac, MacRumors · The Register, Hexus · fabrikant-persberichten (Nvidia, AMD, Intel, Apple, Microsoft, Google). Vrijwel allemaal RSS.

### AI
MarkTechPost, OpenAI News, Anthropic News, Hugging Face Blog, MIT Technology Review AI, The Gradient, Last Week in AI, VentureBeat AI. Meta/research: arXiv cs.AI + wekelijkse duiding via Import AI of Interconnects. Allemaal RSS.

### Wetenschap & frontier
Quanta Magazine, Nature (nieuws-sectie), Science (nieuws), New Scientist, ScienceDaily, Phys.org, arXiv (per vakgebied, bijv. quant-ph). Ruimte: SpaceNews, Space.com, Universe Today, NASASpaceflight.

### Games
Game Developer (industrie + engines; voorheen Gamasutra), Polygon, Eurogamer, Rock Paper Shotgun, GamesIndustry.biz (deze drie sinds 2026 IGN-eigendom), Game World Observer. RSS.

### Financieel / Portfolio
- *Nieuws:* Reuters, CNBC, MarketWatch, Yahoo Finance; NL: NOS economie, IEX.nl, BNR Nieuwsradio, Beursduivel.
- *Data-API's (gratis tiers):* Financial Modeling Prep + Finnhub (earnings-kalender, dividend/split/IPO, analist-ratings, transcripts), Alpha Vantage (markt-nieuws + sentiment), ORTEX / FINRA (short-interest). Voeden tegelijk het portfolio-spoor én de roadmap/kalender.

### Tech-verticals
- *Ruimte/raketten:* SpaceNews, Space.com, NASASpaceflight, Ars Technica.
- *Auto/EV:* Electrek, InsideEVs, The Drive.
- *Drones:* DroneDJ, sUAS News.
- *Cybersecurity:* BleepingComputer, Krebs on Security, The Hacker News.

### Lokaal NL & weer
- *NL-nieuws:* NOS, NU.nl, NRC, de Volkskrant; Engelstalig NL: NL Times, DutchNews. Arnhem/Gelderland: De Gelderlander, Omroep Gelderland.
- *NL-tech:* Tweakers, Bright, Computable, Silicon Canals.
- *Weer (gratis API's):* Open-Meteo (geen key nodig), KNMI Open Data (waarschuwingen), Buienradar (NL-neerslag).

### Subreddits
Elke subreddit heeft een open RSS-feed (`reddit.com/r/<naam>/.rss`, sorteerbaar met bijv. `/top/.rss`). Per onderwerp koppelbaar. Reddit's officiële API werd in 2023 duurder, maar de RSS-feeds volstaan ruim voor deze schaal.

### Eigen / super-specifieke onderwerpen (query-gebaseerd)
Vrije-tekst-onderwerpen die je in de app of via de iOS Shortcut toevoegt en waar geen feed voor bestaat, worden 's ochtends actief opgezocht via web-search. Dit is de tweede ingestie-modus naast de feeds.

### Paywalls (voorlopig geparkeerd)
We bouwen **geen** paywall-omzeiling. Paywall-bronnen (Bloomberg, FT, WSJ, FD) gebruiken we hooguit op kop-niveau via hun RSS; voor volledige dekking leunen we op gratis equivalenten die dezelfde verhalen brengen. Eventueel later: je eigen betaalde toegang of bibliotheek-toegang.

### Filtering: geen reclame in het rapport
Gesponsorde berichten, advertorials en affiliate-gedreven "deals"-content worden geweerd. Detectie tijdens de goedkope scan via feed-tags (sponsored / partner content), bekende patronen en een lichte AI-classificatie. **Onderscheid:** officiële fabrikant-persberichten (Nvidia/Apple e.d.) zijn legitieme aankondigingen en blijven; betaalde redactionele plaatsingen niet.

---

## 6. Features & subsystemen

### Subsysteem 1 — Interesse-/rankingmotor
E�n model dat per onderwerp een interessescore bijhoudt en daarmee de volgorde, de voorpagina en de deep-dive-keuze stuurt.

- **Hoofdgebaar: een gegradeerde rating.** Per item geef je een rating op een schaal (de "sterretjes"; icoon en vormgeving komen later in een design-ronde). De hoge kant = "meer hiervan" (boost), de lage kant = "minder hiervan" en opent de per-geval-keuze hieronder. Eén gebaar dekt zo de hele meer/minder-as.
- **Gescheiden hiervan: de volg-markering.** Een apart, eigen icoon waarmee je een onderwerp/categorie markeert als "actief volgen" — dit trekt ook Sol's aandacht. Bewust losgekoppeld van de rating, zodat "goed item" en "wil ik blijven volgen" niet door elkaar lopen.
- **Hiërarchische scores met overerving.** Feedback kan op vier niveaus: item, onderwerp, categorie en bron. Een item erft de score van zijn onderwerp, dat erft van zijn categorie; expliciete feedback op een niveau overschrijft dat niveau. Zo spreken niveaus elkaar niet tegen. **Bron** staat hier dwars op (een item heeft zowel onderwerp als bron) en werkt als aparte vermenigvuldiger — handig om een zwakke/clickbaiterige bron structureel te dempen, naast de reclamefilter.
- **Negatieve feedback: per geval, maar licht.** Een lage rating doet standaard iets mils (lager in volgorde). Eén tik om te escaleren: *lager / tijdelijk minder / helemaal niet meer*, met een scope-keuze (*dit item / dit onderwerp / deze categorie / deze bron*) waarbij het onderwerp al voorgeselecteerd staat. Volledig dempen is dus altijd een bewuste keuze; het ontdekkingsblok beschermt ondertussen je breedte.
- **Waarom-feedback: tags + vrije tekst.** Bij een rating verschijnen een paar context-afhankelijke snelle redenen (tikbaar, bijv. "te veel bedrijfs-PR", "wil meer diepgang", "verkeerd subonderwerp") plus een optioneel vrij tekstveld. De tags sturen direct de subonderwerp-gewichten; de vrije tekst wordt door Sol onthouden en geduid.
- **Impliciete signalen: alleen tiebreaker.** Wat je opent/leest verschuift géén scores; het ordent alleen items die qua expliciete prioriteit gelijk staan.
- **Verval & cold-start.** Scores vervagen licht over tijd zodat het rapport met je meegroeit; de volg-markering vervaagt niet (staande instructie). Nieuwe onderwerpen/profielen starten neutraal.
- **Zichtbaar & bijstelbaar.** Alle scores zijn in de app in te zien en handmatig te tunen — geen black box.

**Score → actie (de kostenpoort).** Interesse-score × de **algemene belang-ranking** geeft een prioriteit, verdeeld in banden: topband krijgt een dure deep-dive + Sol-commentaar, middenband een korte samenvatting, onderkant wordt ingeklapt of overgeslagen. Hier zit de kostenbeheersing. De belang-ranking gaat elke ochtend de hele onderwerpenlijst langs en sorteert op actuele relevantie; die sortering stuurt ook de voorpagina en de volgorde van het rapport.

### Subsysteem 2 — Archief / geheugen
E�n persistente, **in secties opgedeelde** store (per categorie/onderwerp) die meerdere functies tegelijk draagt:
- **Editie-historie** — oude edities terugvinden in de app.
- **Gesectioneerd** — zo is in één oogopslag te zien of iets eerder gerapporteerd is.
- **Dedupe / "geen oud nieuws"** — nieuwe items worden tegen de juiste sectie gecheckt.
- **Cross-reference-bron** — verwijzingen naar eerdere onderwerpen (gemarkeerd als verwijzing) putten hieruit.
- **Sol's geheugen** — context die Sol onthoudt.
- **Export** — bewaren naar **Google Drive** (connector aanwezig) en/of een lokale map.

### Subsysteem 3 — Sol / "Daily Paper" (naam nog niet definitief)
De redactionele persoonlijkheid en synthese-laag.
- **Zelf-ontwikkelend karakter.** Sol bedenkt zelf wie hij is en evolueert over tijd, bijgewerkt met wat hij heeft "meegemaakt", wat jij interessant vindt, en onthouden onderwerpen.
- **Toon:** meestal **neutraal**, met **af en toe een uitschieter** naar sassy / vrolijk / speels. De ene editie meer een uitgesproken stijl dan de andere.
- **Verbanden leggen.** Zoekt actief naar verbanden tussen onderwerpen, inclusief cross-references naar **oude** onderwerpen (gemarkeerd als verwijzing) — en onthoudt de context gewoon.
- **Plek in het rapport:** een **eigen blok** + een **notitiebelletje** bij losse onderwerpen of hele categorieën, waar Sol zijn gedachten kwijt kan bij een select aantal items.
- **Aandachtspunten (techniek):** geheugencompactie (rollend samengevat geheugen i.v.m. tokens/kosten) en karakterconsistentie (meegroeien maar herkenbaar Sol blijven).

### Pilaar A — Roadmap & kalender (vooruitkijkend)
Een date-geprikte eventstore met aankomende **announcements, events, earningscalls, releases**, met de juiste data. Twee weergaven:
- **Roadmap** — narratieve tijdlijn van wat eraan komt.
- **Kalender** — alles op datum geprikt, incl. verwachte/geruchten-events met een zekerheidsindicatie.

### Pilaar B — Voorpagina
De cover/hero van elke editie: de redactionele toplaag die "wat verdient vandaag je aandacht" beantwoordt. Bewoners: **Top-N van de dag** (uit de belang-ranking), **Sol's intro**, en een **teaser van het ontdekkingsblok**. Toont interessante snippets van die editie.

### Pilaar C — Ontdekkingsblok (exploration)
Een apart blok waarin het systeem **bewust buiten je gevestigde interesses** graaft, zodat je niet in een filterbubbel belandt en het rapport breed blijft. Tegenhanger van de op-voorkeur-gefilterde rest, en de structurele bescherming van je breedte tegen (volledig) dempen.

### Pilaar D — Trivia
Zoekt een **nu-relevant** onderwerp (waar op dat moment iets over te vinden is) en haalt er een trivia-feitje uit. Maakt gebruik van de belang-ranking om het onderwerp te kiezen.

### Pilaar E — Invoer
- **iOS Shortcut** waarmee je onderweg ideeën en onderwerpen kunt toevoegen die Sol moet gaan volgen. Stuurt naar een licht capture-endpoint.
- **Dezelfde functie in de web-app**, zodat invoer via beide kanalen kan.
- **Bron toevoegen** — je kunt ook concrete feeds of subreddits opgeven om te volgen.
- **Super-specifieke onderwerpen** (vrije tekst zonder feed) stromen door naar de *query-gebaseerde* ingestie-modus en naar de interessemotor.

### Het weer
Dagelijkse weermodule via gratis API's (Open-Meteo / KNMI / Buienradar), met mogelijke uitbreidingen: KNMI-waarschuwingen, luchtkwaliteit, aurora-forecast.

### Overige cross-cutting elementen
- **Vervolg-tracking:** verhalen die je eerder markeerde en die zich ontwikkelen (continuïteit tussen dagen).
- **Lokaal NL/Arnhem-nieuws** als hyperlokale laag.
- **"On this day"** / verjaardagen als goedkoop fun-item.

---

## 7. Open vragen & volgende rondes

**Nog te beslissen:**
- Definitieve **naam** voor Sol (werknaam "Daily Paper" / D.P.).
- **Cadans per onderwerp**: altijd / wekelijks / alleen bij groot nieuws (sommige items zijn "af en toe", zoals fun/trivia).
- **Portfolio-instrumenten**: jouw daadwerkelijke instrumenten zijn nodig om het portfolio-spoor (earnings/dividend/short-interest) te koppelen.
- **Vormgeving** (design-ronde): iconen/schaal voor de rating en de volg-markering, en de look van voorpagina, secties en Sol's blok.

**Voorgestelde volgende ronde:** Sol's mechaniek in detail — hoe zijn geheugen werkt en gecomprimeerd wordt, hoe hij kiest waar hij commentaar op geeft, hoe hij verbanden legt, en hoe zijn karakter evolueert maar herkenbaar blijft. (Of, als je liever iets kleins afrondt: de cadans per onderwerp.)

---

## 8. Beslissingen-log (zodat we de draad houden)

- **Techniek:** Vercel + Supabase, PWA, geen login, externe scheduler ~08:00, generatie opgesplitst i.v.m. 10s-limiet, ~€0,30/rapport-plafond.
- **Gebruikers:** jij + één vriend, eigen profielen.
- **Onderwerpen:** brede lijst incl. eigen Frontier-categorie; verwijderd: game-deals, game-patchnotes, abonnementsdrops.
- **Bronnen:** ingedeeld naar toegangsmethode (RSS / gratis API / query-gebaseerd); brede lijst per categorie vastgelegd in sectie 5.
- **Subreddits:** toegestaan als bron via hun open RSS-feeds.
- **Ingestie:** twee modi — feed-gebaseerd (RSS/API + subreddits) en query-gebaseerd (vrije onderwerpen → web-search).
- **Finance/weer:** via gratis API's (FMP/Finnhub/Alpha Vantage/ORTEX; Open-Meteo/KNMI/Buienradar).
- **Paywalls:** geen omzeiling; voorlopig geparkeerd. Gratis equivalenten + eventueel eigen/bibliotheek-toegang later.
- **Reclame:** gesponsorde berichten en advertorials worden uit het rapport gefilterd; officiële fabrikant-persberichten blijven.
- **Feedbackloop:** gegradeerde rating als hoofdgebaar (icoon later); volg-markering apart; hiërarchische scores (item ← onderwerp ← categorie) + bron als aparte vermenigvuldiger; negatieve feedback per geval (mild default, één tik escaleren) met scope-keuze; waarom-feedback via tags + vrije tekst; leesgedrag alleen als tiebreaker; lichte verval, volg-markering vervalt niet; neutrale cold-start; scores zichtbaar & bijstelbaar.
- **Kostenpoort:** interesse-score × belang-ranking → prioriteitsbanden (deep-dive + Sol / korte samenvatting / ingeklapt-overgeslagen).
- **Sol:** zelf-ontwikkelend, meestal neutraal met af en toe een uitschieter; eigen blok + notitiebelletje op onderwerpen/categorieën.
- **Archief:** gesectioneerd, draagt historie + dedupe + cross-refs + Sol-geheugen + export.
- **Invoer:** iOS Shortcut + web-app, incl. bron- en onderwerp-toevoeging.
- **Bouwprincipe:** één modulaire versie, geen v2/v3.
- **Voorpagina-dashboard (schets 11 juni 2026):** telefoon-eerst layout — kopstrook met weer- en stats-blok plus een puntenrij van afgelopen edities (tik = editie openen), grote "Daily paper"-kaart naar de volledige editie (/editie/[datum]), en "Sol's selectie": artikelkaarten met afbeelding (uit de feed: media:content/thumbnail/enclosure/inline img), categorie, titel, beschrijving en **Sol's match-percentage** (de select-prioriteit, geclampt 0..1, opgeslagen als `edition_items.match_score`), gerangschikt op match. Rating-gebaar in de UI: **−2…+2** (intern blijft de 1–5-schaal, UI-waarde +3).
- **Accountvoorkeuren (12 juni 2026):** voorkeuren zijn het startpunt van de interessemotor — geen aparte laag. Onboarding (nieuw profiel → /onboarding) + bewerkbaar onder Instellingen, met dezelfde kiezer. Per topic: volgen/niet + relevantie −2…+2; relevantie ×0.3 → beginscore in topic_scores (−0.6…+0.6, ruimte voor leren tot ±1 via ratings); niet-volgen = demping (−0.6), groot nieuws breekt door (geen harde filter). Standaard-voorselectie: tech, financieel, wereld, wetenschap én nieuwe categorie goed-nieuws (Good News Network + Positive News als bronnen, migratie 0005). Eigen topics — hoe specifiek ook (bv. één bedrijf) — kunnen erbij, evt. in een eigen categorie en met zoektekst (query_mode, fase 3 zoekt actief). De scan-stap wijst sindsdien per item het best passende topic toe (topic_index in de batch-call), zodat topic-relevantie daadwerkelijk doorwerkt in priority() → match-%.
- **Topic ↔ bron-koppeling (12 juni 2026):** een topic kan optioneel aan één vaste bron hangen (`topics.source_id`, migratie 0006). Gekoppeld: items uit die bron krijgen het topic direct bij de ingestie en de scan-stap overschrijft dat niet (bron-koppeling wint van de AI-gok). Niet gekoppeld (default): de normale zoekweg — AI-topic-toewijzing over alle feeds, later aangevuld met de query-zoekweg (fase 3).
- **Developer-modus + thema's (12 juni 2026):** Instellingen → Developer: quick pipeline test (tick-lus vanuit de UI met live log — zelfde stappenmachine als productie), oude test-edities seeden (modules/dev; complete edities op oude datums, dev-guid-voorvoegsel, gratis) en testdata opruimen. Kleurthema's met stip-knoppen in de koptekst (Krant/Sepia/Mint/Nacht): CSS-variabelen per data-theme, donker class-based (custom variant) met anti-flits-script; keuze in localStorage, volgt OS als er niets gekozen is.
- **Scan-cost lever (15 June 2026):** scan_rank was ~76% of an edition's cost — driven by volume (the 71-source scale-up + the 6→12 round cap), not the redaction. Added a pre-scan gate in `modules/rank`: candidates are ranked by `source_weight × recency × interest` (no LLM) and only the top batch per round is LLM-scanned; topics the reader follows are always scanned. The cost dial is `batchSize × maxRounds` (≈280 items, config in `modules/shared/config.ts`). Measured live: ~600 → 280 items scanned, scan_rank €0.119 → ~€0.05 per edition, data 100% same-day. Media intake also capped to the newest few per podcast/video feed (stops backcatalog floods).
- **Redactie zonder personages (15 June 2026):** removed the 5 desk-editor personas and Sol's character voice. The "Daily Paper" + per-desk summaries are replaced by **one neutral, topic-driven cross-reference synthesis** ("De rode draad") in `modules/redactie`: it covers only the topics that have news that day, leads with the reader's followed topics, and draws explicit connections between threads — plain editorial prose, no persona. Deep research (`generate` deep-dives) is unchanged; that is what matters. One deep call (~€0,002/editie). `FrontPage.desks` dropped; `front_page.intro` (calendar lead) is now derived from the synthesis's first sentence, so there is no separate intro call. The persona prompt files (`modules/redactie/prompts/*`, `modules/sol/prompts/karakter.md`) are deleted.
