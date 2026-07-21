# Design brief — redesign the Morning Report "krant" reading page

You are designing for **Morning Report**, a personal daily newspaper (a PWA). Each
day the app generates one edition, personalised to the reader's followed topics.
This page is the **full krant** — the deepest reading layer, reached by tapping
"Lees de krant" on the day dashboard. I want **2–3 distinct visual directions**
for a redesign of this page, rendered against the **real content** included
below.

Read this whole brief before designing. The content is fixed; the design is what
changes.

---

## 1. What I want back

- **2–3 separate directions**, each as its own self-contained HTML mockup I can
  open and compare. Use the real content from §5 — no lorem ipsum, no invented
  articles. Dutch UI copy stays Dutch.
- Each direction should render the **same page** (masthead → day-synthesis →
  lead story → category sections) so I'm comparing *design*, not *content*.
- Give each direction a one-line name + a 2-sentence rationale: what it optimises
  for and how it attacks the problems in §4.
- Light mode is enough for the mockups; just keep the palette dark-mode-friendly
  (it ships with 4 themes).

## 2. The hard constraint: keep the content space

The output (the journalism) matters more than the chrome. **Do not drop, merge,
or shorten any content slot.** Every direction must still hold, per edition:

- a **masthead** (title + date + "ochtendeditie"),
- a **weather strip**,
- **Sol's day-synthesis** — one blue "vandaag in het kort" paragraph (the
  editor's voice),
- one **lead story** ("Hoofdverhaal"): headline + multi-paragraph lead + up to 5
  "ripples" (labelled consequences) + an optional **Vooruitblik** forecast box +
  a **Verhaallijn · deel N** storyline label + source + a −2…+2 rating control,
- **category sections** — each with: a section title, a one-line Sol caption, a
  short section summary, then a **depth mix**: *featured* deep articles (lead +
  ripples + optional Vooruitblik + Verhaallijn label), *summary* cards (headline +
  2-line body), and a brief **"Ook in het nieuws"** headline list.

You may restyle, re-rank, regroup and re-lay-out all of this freely. You may not
remove a slot. Text lengths in §5 are real — design for them, not for ideal short
strings. Note the slots are **unevenly filled**: some sections have 2 featured
articles, some 0; brief lists run from 0 to 17 headlines. A good design handles a
fat section and a thin one without looking broken.

## 3. Stay mostly within "Atlas" (slight experimentation welcome)

Atlas is the committed design system. Keep its DNA; you may push layout, rhythm
and hierarchy, and experiment lightly — but the result should still read as Atlas.

**Tokens**
- Accent: **`#2f6df0`** (blue) — interaction, the editor "Sol", follows, "today".
- Base palette: Tailwind **`stone`** (warm grey). Cards `bg-white` on a `stone-50`
  ground. Borders `stone-200`.
- Status colours: **amber** for "in progress"/"verwacht"; **emerald** for
  "bevestigd" / market up; **rose** for market down.
- Fonts: **Archivo** (extrabold, tight tracking) for headings; **Space Grotesk**
  for body; **Space Mono** for labels, metadata, dates, percentages.
- Tiles: `rounded-2xl border` cards. Full-width shell; reading content keeps a
  calm, readable column.
- A signature device is a blue left-border / blue chip for editorial captions and
  the "Sol" voice.

## 4. What's wrong with the current page (the problems to solve)

The current krant is an all-type section-newspaper. Four things bug me — a strong
direction visibly fixes several:

1. **Too text-heavy / flat.** It's a wall of type; the hierarchy between lead,
   featured, summary and brief is too weak — everything has similar weight.
2. **Sections feel monotonous.** Every section uses the identical rhythm
   (title → caption → 2-col body → sidebar). Nothing makes a *big* story feel
   big or a quiet section feel quiet.
3. **No imagery / visual interest.** Almost no images or graphic devices, so it
   reads grey. Most deep + featured articles **do** carry an image (noted per
   article in §5) — they're just not used. Lean on them, and on graphic devices
   (numerals, pull-quotes, the match-%, the storyline "deel N"). The edition also
   has **markets + regions data** in store (8 indices, per-continent article
   counts — listed at the end of §5) that the page does **not** currently render
   but could, as a data tile.
4. **The forecast + storyline are buried.** The **Vooruitblik** (a source-grounded
   prediction with a target date + a certainty chip: *bevestigd / verwacht /
   gerucht*) and the **Verhaallijn · deel N** label (this story is instalment N of
   an ongoing thread — the paper *builds on itself*) are the product's signature.
   Today they're tiny inline labels. Make them feel like a feature.

## 5. Real content to render (Morning Report, zaterdag 28 juni 2026)

This is the actual rendered edition (profile "Siem"), pulled live from the
database on 28 June 2026. Use it verbatim. The reader follows no category today,
so sections appear in natural order: Tech → Wereldtoneel → Financieel → Games →
Wetenschap → Frontier → Lokaal NL → Goed nieuws.

**Masthead:** `Morning Report` · `zaterdag 28 juni 2026 · ochtendeditie`

**Weather strip (Arnhem):** 24° · Half bewolkt · 23° / 29° · 47% neerslag ·
14 km/u

**Sol — vandaag in het kort (blue day-synthesis):**
> Geopolitieke spanningen in het Midden-Oosten en verschuivingen in de
> technologiesector bepalen het nieuwsbeeld van vandaag. SpaceX voert een
> omvangrijke herpositionering door in de hardwaremarkt, terwijl de VS de
> aanvallen op Iran voortzet en diplomatieke ontwikkelingen rond Libanon en
> Hezbollah zich ontvouwen. Opvallend zijn ook temperatuurrecords in delen van
> Europa en nieuwe AI-lanceringen die bestaande modellen uitdagen. Verder melden
> wetenschappers mogelijke supernova-restanten nabij het Melkweg-zwart gat en
> blijkt een tuinornament een waardevol historisch object.

---

### LEAD STORY — "Hoofdverhaal" · 100% match · Tech · bron r/technology · [has image]

**AI is creating America's next underclass**
*Verhaallijn · Ford rehired 350 engineers na AI-fouten in voertuigkwaliteit ·
deel 2* — (no Vooruitblik on this story)

> Ford heeft 350 ervaren engineers opnieuw in dienst genomen nadat AI-systemen de
> kwaliteit van voertuigen ondermijnden. Het bedrijf had gedacht dat AI en
> aangepaste ontwerpvereisten voldoende zouden zijn voor hoogwaardige producten,
> maar miste de kennisoverdracht van vertrekkende experts. Dit herstel hielp Ford
> de toppositie te behalen in de JD Power 2026 U.S. Initial Quality Study, voor
> het eerst in 16 jaar. VP vehicle hardware engineering Charles Poon benadrukte
> dat AI slechts zo goed is als de trainingsdata. Het bedrijf voegde meer dan
> 100.000 nieuwe AI-gestuurde tests toe om edge cases te identificeren.

Ripples (2):
- **Kwaliteitsherstel via menselijke expertise** — De terugkeer van engineers
  corrigeerde AI-missers en leidde direct tot de hoogste ranking in 16 jaar, wat
  aantoont dat hybride mens-AI-aanpak kwaliteit borgt.
- **Waarschuwing voor AI in productie** — Andere fabrikanten zien nu dat
  onvoldoende kennisoverdracht tot terugroepacties en kwaliteitsverlies leidt,
  wat bredere adoptie van AI in engineering remt.

---

### Section: Tech
*Caption:* AI-ontwikkelingen en exportbeperkingen hertekenen de mondiale
techmarkt.
*Summary:* AI creëert nieuwe maatschappelijke kloven in de VS. Aziatische
startups lanceren alternatieven voor beperkte modellen, terwijl Oekraïne meldt
dat Russische inlichtingendiensten inloggegevens stelen via nepberichten.

**Featured deep article** · 94% · bron TechCrunch · [no image] ·
*Verhaallijn · Sakana AI en 360 Security lanceren Fugu en Tulongfeng als
Mythos-alternatieven · deel 1* · **Vooruitblik → 15 jul 2026 · verwacht:** "Het
exportverbod blijft nog minstens enkele weken van kracht zonder resolutie."

> **Asian AI startups launch Mythos-like models as Anthropic's export ban drags
> on** — Vandaag lanceerden twee Aziatische AI-bedrijven concrete alternatieven
> voor de geblokkeerde modellen van Anthropic. Sakana AI uit Tokio bracht Fugu
> uit, een orkestratiemodel dat volgens de ontwikkelaar op belangrijke benchmarks
> gelijkwaardig presteert aan Fable 5. Tegelijkertijd introduceerde het Chinese
> cybersecuritybedrijf 360 Security Tulongfeng, een tool voor
> kwetsbaarheidsdetectie die Mythos zou evenaren.
>
> Beide lanceringen vinden plaats terwijl het Amerikaanse exportverbod op
> Anthropics meest geavanceerde modellen al drie weken van kracht is zonder zicht
> op oplossing. Eerdere berichtgeving meldde dat het verbod al de derde maand
> aanhoudt en dat Amerikaanse labs daardoor mogelijk permanent marktaandeel
> verliezen in Azië. De nieuwe modellen beloven Mythos-achtige capaciteiten
> zonder exportbeperkingen.
>
> De berichtgeving benadrukt dat Aziatische startups nu de leegte opvullen die
> door de ban is ontstaan.

> Ripple — **Aziatische labs vullen Mythos-vacuüm sneller dan verwacht:** De
> lanceringen tonen dat lokale alternatieven direct inspelen op de afwezigheid
> van Amerikaanse frontier-modellen, waardoor de verschuiving van AI-ontwikkeling
> naar Azië verder versnelt.

Summary cards (6):
- **Ukraine Says Russian Intelligence Used Fake Support Texts to Steal Messaging
  Credentials** (The Hacker News) — Oekraïne meldt dat Russische
  inlichtingendiensten nep-sms'jes met steunbetuigingen hebben gebruikt om
  inloggegevens van messaging-apps te stelen; de SSU en de FBI legden een
  langlopende campagne tegen functionarissen, militairen en activisten bloot.
- **Apple is reportedly looking to buy chips from a US-blacklisted Chinese
  company** (Engadget) — Apple zoekt toestemming van de Trump-regering om chips
  te kopen bij een Chinees bedrijf dat op de zwarte lijst staat vanwege banden
  met het Chinese leger.
- **Here's your daily reminder that you don't own digital content** (Engadget) —
  Europese gebruikers verliezen binnenkort toegang tot Studio Canal-films die ze
  via de PlayStation Store hadden gekocht — opnieuw bewijs dat digitale aankopen
  geen eigendom opleveren.
- **Tesla settles lawsuit over fatal pedestrian crash involving Full
  Self-Driving** (Engadget) — Tesla schikt een rechtszaak over een dodelijk
  voetgangersongeval in Arizona (2023) waarbij Full Self-Driving betrokken was.
- **Apple wants permission to buy memory from a blacklisted Chinese supplier**
  (The Verge) — Apple vraagt een uitzondering om RAM te kopen bij het
  geblacklistede CXMT, om druk op de toeleveringsketen en RAM-prijzen te
  verlichten.
- **'It's not going away': The Stanford economist who called the AI entry-level
  jobs crisis early has the receipts** (r/technology) — Een Stanford-econoom die
  vroeg waarschuwde voor een AI-crisis op de startersarbeidsmarkt zegt dat het
  precies zo uitpakt als voorspeld en niet verdwijnt.

*Ook in het nieuws (16 koppen, o.a.):* "Uber expands US driver background checks
after sexual assault lawsuits" · "Security News This Week: LastPass Users Had
Their Data Stolen—Again" · "NASA tests AI medic for astronauts too far from Earth
to call a doctor" · "Meta's Astryx Brings a CLI and MCP Server to an Open-Source
React Design System".

### Section: Wereldtoneel
*Caption:* Escalatie in het Midden-Oosten houdt aan na nieuwe Amerikaanse acties.
*Summary:* Netanyahu verwelkomt een akkoord met Libanon, maar Hezbollah wijst dit
af. De VS voeren nieuwe aanvallen uit op Iran na een drone-incident, terwijl
Israël troepen voorbereidt op een langer verblijf in Libanon.

**Featured deep article #1** · 100% · bron France 24 · [has image] ·
*Verhaallijn · Netanyahu prijst Libanon-deal als klap voor Iran terwijl Hezbollah
akkoord afwijst en Israël toeslaat · deel 4* · **Vooruitblik → 29 jun 2026 ·
verwacht:** "Israëlische troepen bereiden zich voor op een langdurig verblijf in
zuidelijk Libanon zonder terugtrekking."

> **Netanyahu hails Lebanon deal as Hezbollah rejects agreement** — Op zaterdag
> prees de Israëlische premier Benjamin Netanyahu een door de VS bemiddeld
> akkoord met Libanon als een klap voor Iran en Hezbollah. De leider van de
> militante groep, Naim Qassem, wees het framework af als 'null and void' en
> stelde dat de bepalingen van het Iraans-Amerikaanse memorandum moeten worden
> uitgevoerd. Israël, Libanon en de VS hebben een trilateraal raamwerk
> ondertekend na vijf rondes van gesprekken in Washington, met een proefplan voor
> Libanese soldaten om twee door Israël bezette gebieden over te nemen. Stakingen
> in zuidelijk Libanon hebben minstens één persoon gedood, melden staatsmedia een
> dag na de ondertekening.

> Ripples — **Far-right veroordeelt akkoord als onbetrouwbaar** (Ben Gvir en
> anderen verwerpen de deal omdat Libanon Hezbollah niet ontwapent, wat de steun
> voor Netanyahu thuis onder druk zet) · **Netanyahu kondigt langdurige
> aanwezigheid aan** (troepen blijven in zuidelijk Libanon tot Hezbollah volledig
> ontwapend is).

**Featured deep article #2** · 100% · bron Al Jazeera · [no image] ·
*Verhaallijn · Nieuwe aanvallen in Straat van Hormuz testen wapenstilstand na
IRGC-afwijzing hotline · deel 2* — (no Vooruitblik on this story)

> **US launches second night of strikes against Iran after ship struck by drone**
> — De Verenigde Staten hebben op 26 juni een tweede nacht van aanvallen
> uitgevoerd op Iraanse doelen in de Straat van Hormuz, na een Iraanse
> drone-aanval op 25 juni op het Singaporese vrachtschip M/V Ever Lovely.
> President Trump noemde de drone-aanval een schending van het staakt-het-vuren;
> CENTCOM beschreef de reactie als krachtige vergelding. Iran meldde dat een
> projectiel insloeg bij een pier in Sirik. Ongeveer 11.000 bemanningsleden
> zitten vast op schepen; Iran adviseert evacuatie via Larak Island, de VS geeft
> tegengesteld advies. Analisten waarschuwen dat de confrontaties de MoU in
> gevaar brengen.

> Ripples — **Vredesonderhandelingen onder druk door aanhoudende aanvallen** (de
> strikes vergroten het risico dat de MoU-onderhandelingen mislukken) ·
> **Evacuatie van 11.000 bemanningsleden bemoeilijkt door tegenstrijdige
> adviezen** (de impasse rond de 'Guardian Angel'-route houdt schepen en
> bemanningen gevangen tussen twee strijdende partijen).

Summary cards (6): **Israel orders troops to prepare for 'extended stay' in
Lebanon** (Al Jazeera) · **A cargo ship in the Strait of Hormuz targeted by Iran**
(France 24) · **Heatwave breaks records in Germany, Denmark and Czech Republic**
(BBC World — ~150 mln Europeanen boven 35°) · **Why is Crimea critical to the
Russia–Ukraine war?** (Al Jazeera) · **Two killed, dozens injured in Israeli
strike on displacement tents in Gaza** (Al Jazeera) · **Venezuela twin quakes
death toll tops 1,400** (France 24).

*Ook in het nieuws (16 koppen, o.a.):* "Heatwave shatters records across Europe" ·
"Three killed as Ukraine and Russia trade attacks overnight" · "New
US-Lebanon-Israel agreement signed" · "Could Israel's coming election see an end
to Netanyahu's political career?".

### Section: Financieel
*Caption:* Grote techdeals en uitgestelde beursgangen domineren het financiële
landschap.
*Summary:* SpaceX zoekt financiering met voorwaarden rond een mogelijke overname
in de softwaremarkt. OpenAI stelt een beursgang uit tot mogelijk 2027, terwijl
Apple zijn chipstrategie verschuift naar AI-toepassingen.

**Featured deep article** · 100% · bron MarketWatch Top · [has image] ·
*Verhaallijn · SpaceX versneld naar Nasdaq-100 na $11 miljard pivot · deel 4* ·
**Vooruitblik → 20 aug 2026 · verwacht:** "SpaceX publiceert de eerste
kwartaalcijfers na de beursgang."

> **SpaceX's new $11 billion 'saving grace' comes with a big catch** — SpaceX
> introduceert een $11 miljard 'saving grace' waarbij het hardwaretoegang
> aanbiedt aan rivalen. Dit kan de eigen AI-ambities van het bedrijf schaden.
> Tegelijkertijd zet SpaceX in op een $60 miljard deal voor Cursor om de
> enterprise coding markt te domineren.
>
> De pivot komt voort uit eerdere volatiliteit rond SpaceX en bouwt voort op de
> $11 miljard reddingspoging. Wat nieuw is, is de expliciete waarschuwing dat de
> hardware-toegang de AI-doelen kan belemmeren.

> Ripple — **Hardware-toegang aan rivalen kan AI-ambities SpaceX ondergraven:**
> door hardware open te stellen voor concurrenten loopt SpaceX het risico dat
> eigen AI-ontwikkeling vertraagt.

Summary cards (6): **SpaceX Looks to Reshuffle the Enterprise Coding Market With
Its $60 Billion Deal for Cursor** (Yahoo Finance) · **Microsoft-Backed OpenAI May
Wait Until 2027 for IPO** (Yahoo Finance) · **Apple Plans Mac Chip Roadmap Shift
Toward AI-Focused M7** (Yahoo Finance) · **Older Americans will soon have Medicare
access to GLP-1s for weight loss** (MarketWatch Top) · **Germany is considering
raising its retirement age to 70** (MarketWatch Top) · **Social Security COLAs Are
Poised to Disappear, Possibly Forever** (Yahoo Finance).

*Ook in het nieuws (17 koppen, o.a.):* "This disease is more expensive than cancer
and heart disease combined" · "A new bill would cap Medicare enrollees' annual
expenses at $5,000" · "Americans' 401(k) balances hit record levels last year" ·
"AbbVie to Acquire Apogee Therapeutics".

### Section: Games
*Caption:* Digitale rechten en personeelsproblemen zetten de sector onder druk.
*Summary:* PlayStation verwijdert eerder gekochte films uit bibliotheken.
Ontwikkelaars van Star Wars Eclipse staken vanwege onderbezetting, terwijl
RAM-prijzen structureel hoger dreigen te blijven.

**Featured deep article** · 87% · bron Eurogamer · [has image] ·
*Verhaallijn · PlayStation verwijdert per 1 september StudioCanal-content uit
bibliotheken · deel 1* · **Vooruitblik → 1 sep 2026 · bevestigd:** "De
StudioCanal-content wordt verwijderd uit de bibliotheken."

> **PlayStation is pulling "previously purchased" digital movies from users'
> libraries** — Sony heeft PlayStation-gebruikers schriftelijk geïnformeerd dat
> meer dan 550 StudioCanal-titels later dit jaar uit hun videobibliotheken
> verdwijnen, per 1 september 2026, vanwege aflopende licenties. In het VK,
> Duitsland en Oostenrijk verliezen klanten de toegang; van terugbetaling is geen
> sprake. Sony stopte al in 2021 met het aanbieden van film- en tv-aankopen via
> de store.

(no ripples on this story)

Summary cards (6): **Lenovo says high RAM prices may be the new normal** (Rock
Paper Shotgun) · **Star Wars Eclipse "literally cannot be finished" without more
staff** (Eurogamer) · **Mario Kart 64 transformed the series from an oddity into
an institution** (Polygon) · **Xbox responds to GTA6 PlayStation pre-orders
claim** (Polygon) · **Viral hide-and-seek hit Meccha Chameleon sells 10m copies
in 16 days** (Eurogamer) · **Deltarune Chapter 5's weird route scenes are
terrifying** (Polygon).

*Ook in het nieuws (4 koppen):* "Joy Malignant is a photobashed, dice-based RPG" ·
"Bloodwoven is a survival immersive sim" · "9 best anime on HBO Max" · "The Critic
is still an underrated animated masterpiece".

### Section: Wetenschap
*Caption:* Recordhitte en deeltjesonderzoek werpen licht op klimaat en
fundamentele fysica.
*Summary:* De grootste deeltjesversneller stopt voor upgrades om donkere materie
beter te kunnen opsporen. Europa noteert meerdere hitterecords, terwijl
verontreiniging na bosbranden in Los Angeles nieuwe risico's blootlegt.

**Featured deep article** · 100% · bron Phys.org · [has image] ·
*Verhaallijn · LHC stopt maandag vier jaar voor upgrade om jacht op donkere
materie te versterken · deel 1* — (no Vooruitblik, no ripples)

> **World's largest particle smasher halts for upgrade to boost hunt for dark
> matter** — De grootste deeltjesversneller ter wereld, de LHC bij CERN, stopt
> maandag met operaties voor vier jaar renovaties. Dit moet de botsingscapaciteit
> fors verhogen en de kans vergroten om donkere materie te ontrafelen. Run-3
> loopt door tot medio 2026, waarna de verbouwing start voor intensere bundels.
> Maandag om 06:00 uur precies gaat de versneller dicht.

Summary cards (6): **Germany sees hottest temperature on record of 41.3C**
(Phys.org) · **Burned-home soils showed uneven lead, arsenic contamination after
LA wildfires** (Phys.org) · **UK sets new June temperature record for third day in
a row** (Phys.org) · **Farmers fear drought as Italy's longest river runs dry**
(Phys.org) · **Peptide alternative to antibiotics could combat antimicrobial
resistance** (Phys.org) · **Scientists discover what triggers belly fat as we
age** (ScienceDaily).

*Ook in het nieuws (10 koppen, o.a.):* "Music listening habits can predict general
cognitive ability" · "A large, harmless asteroid will zip past Earth this
weekend" · "Two humpback whales set records swimming between Australia and Brazil".

### Section: Frontier
*Caption:* Kosmosobservaties en klassieke sciencefiction vieren hun relevantie.
*Summary:* Astronomen ontdekken mogelijke supernova-resten nabij het galactische
centrum. Een mysterieuze boogstructuur wijst op een kosmische schokgolf, terwijl
de film Logan's Run vijftig jaar na dato wordt herdacht.

**Featured deep article** · 65% · bron Universe Today · [has image] ·
*Verhaallijn · Astronomen spotten mogelijk supernova-restant nabij superzwaar
zwart gat in Melkweg · deel 1* — (no Vooruitblik, no ripples)

> **Astronomers Spot a Possible Supernova Remnant Near the Milky Way's
> Supermassive Black Hole** — NASA's Chandra en ESA's XMM-Newton vonden
> aanwijzingen voor een supernova-restant nabij het supermassieve zwarte gat in
> het centrum van de Melkweg. Indien bevestigd zou dit een van de dichtstbijzijnde
> restanten ooit zijn, op ~26.000 lichtjaar. Het materiaal beweegt met ~twee
> miljoen mijl per uur en is circa 1.700 jaar oud. De waarneming komt uit een
> samengestelde afbeelding van Chandra/XMM-Newton (röntgen), MeerKAT (radio) en
> Pan-STARRS (optisch).

Summary cards (2): **Strange glowing 'bow-and-arrow' structure may be a giant
cosmic shock wave** (Space.com) · **'Logan's Run' at 50: Remembering this
disco-age sci-fi classic** (Space.com).

*Ook in het nieuws:* — (geen; deze sectie heeft geen kortekoppen — design must
survive an empty brief list)

### Section: Lokaal NL
*Caption:* Europese hitterecords en AI-beperkingen vragen om beleidsaanpassingen.
*Summary:* Anthropic mag AI-tools toch leveren aan Amerikaanse instanties.
Hitterecords in buurlanden onderstrepen de regionale klimaatdruk, terwijl
Servische politieke verschuivingen mogelijke verkiezingen inluiden.

**Featured deep article** · 100% · bron NOS Algemeen · [has image] ·
*Verhaallijn · Anthropic mag Mythos toch delen met selecte Amerikaanse
overheidsinstanties · deel 1* · **Vooruitblik → 28 jul 2026 · verwacht:** "De VS
behoudt 30 dagen exclusieve overheidstoegang tot nieuwe AI-modellen voordat
bredere release."

> **Anthropic mag nieuwe AI-tool toch delen met Amerikaanse overheidsinstanties**
> — AI-bedrijf Anthropic mag zijn nieuwste AI-model alsnog beschikbaar stellen
> aan bepaalde overheidsinstanties. Eerder mocht Anthropic zijn programma Fable
> niet buiten de VS aanbieden; omdat het de nationaliteit van klanten niet altijd
> kent, maakte het Fable wereldwijd ontoegankelijk. Bepaalde instanties krijgen
> nu toegang tot Mythos, een variant van Fable, om software op beveiligingslekken
> te controleren. Anthropic zegt te blijven samenwerken met de overheid om Fable
> weer voor iedereen toegankelijk te maken.

> Ripples — **Overheid krijgt exclusieve vroege toegang tot Mythos** (de regering
> versterkt haar greep op geavanceerde AI-modellen) · **OpenAI onder dezelfde
> druk van de overheid** (ook OpenAI beperkt de toegang tot zijn nieuwste model).

Summary cards (6): **Zaterdag was de heetste dag ooit gemeten in Duitsland,
Tsjechië en Denemarken** (NU.nl) · **Servische president Vučić treedt vroegtijdig
af en kondigt vervroegde verkiezingen aan** (NOS) · **Servische president zegt te
zullen opstappen** (NU.nl) · **Nederlands reddingsteam geland in Venezuela, tijd
dringt** (NOS) · **Onbegrip voor afgelaste festivals, maar ambulancezorg al 'zwaar
onder druk'** (NOS) · **Marrit Steenbergen verbetert negen jaar oud wereldrecord
op 100 meter vrije slag** (NU.nl).

*Ook in het nieuws (17 koppen, o.a.):* "Reddingswerkers halen in Venezuela baby
onder puin" · "Live F1 | Verstappen heeft geen verklaring voor crash" · "Waarom
'silent killer' hitte dodelijker is dan de cijfers laten zien" · "Wout Weghorst
verruilt Ajax voor FC Twente".

### Section: Goed nieuws
*Caption:* Onverwachte vondsten en zorginnovaties bieden positieve verhalen.
*Summary:* Tuinornamenten blijken waardevolle marmeren bustes te zijn. Een
ziekenhuis opent een daktuin voor intensivecarepatiënten, terwijl wekelijkse
astrologie een lichte noot toevoegt.

**Featured deep article** · 44% · bron Good News Network · [no image] ·
*Verhaallijn · Tuinornamenten in Kent blijken zeldzame 18e-eeuwse Italiaanse
marmeren bustes · deel 1* — (no Vooruitblik, no ripples)

> **Two Garden Ornaments Thought to be 'Worthless Concrete' Turn Out to be Italian
> Marble Busts Worth Thousands** — Twee tuinbeelden die de eigenaar voor
> waardeloze betonnen ornamenten hield, blijken zeldzame 18e-eeuwse Italiaanse
> marmeren meesterwerken. Een expert zag de beschadigde bustes in het struikgewas
> bij een ontruimd huis in Kent, Engeland; na verkoop leverden ze een aardige som
> op.

Summary cards (2): **Hospital Opens Roof Garden Where Critical Care Patients Can
Enjoy the Outdoors** (Good News Network) · **Your Weekly Horoscope – 'Free Will
Astrology' by Rob Brezsny** (Good News Network).

*Ook in het nieuws:* — (geen)

---

### Bonus data (not currently rendered — candidate for a data tile, see §4.3)

**Markets (8 indices):** S&P 500 −1.95% · STOXX 600 −0.53% · MOEX −0.19% ·
Tadawul −0.67% · Nikkei 225 −4.14% · Nifty 50 −0.19% · JSE All-Share −2.22% ·
Bovespa +2.80%

**Regions (article counts):** Noord-Amerika 40 · Europa 29 · Midden-Oosten 11 ·
Zuid-Amerika 8 · Rusland 5 · Azië-Pacific 4 · Afrika 1

## 6. Notes / things to honour

- **"Ook in het nieuws"** is a brief headline list per section (headline + source).
  Counts swing hard (Tech 16, Wereldtoneel 16, Financieel 17, Lokaal NL 17,
  Wetenschap 10, Games 4, Frontier/Goed nieuws 0). Keep the quick-scan slot; make
  a 0-item list disappear cleanly.
- **Vooruitblik is not on every featured article.** Today only 4 of the 9 deep
  stories carry one (Tech/Asian AI, Wereldtoneel/Netanyahu, Financieel/SpaceX,
  Games/PlayStation, Lokaal NL/Anthropic). The lead (Ford), the Iran-strikes
  story, LHC, supernova and the marble busts have **no** forecast — design the
  featured block so it looks complete without one.
- **Followed sections lead.** The reader can follow categories; their sections
  sort to the top (none today, so natural order). A direction may signal "you
  follow this" with a blue marker — but don't make unfollowed sections feel like
  an afterthought.
- **Rating control.** Each lead + featured article carries a small −2…+2 rating
  control; keep a slot for it.
- **Images can be missing.** Several deep/featured articles have no image (flagged
  `[no image]` above: Tech/Asian AI, Wereldtoneel/Iran-strikes, Goed nieuws/busts).
  Design a graceful no-image treatment (Atlas uses a 135° stone/white diagonal-
  hatch placeholder) — a missing image must not break the rhythm.
- **Vooruitblik certainty has 3 states** — *bevestigd* (emerald), *verwacht*
  (amber), *gerucht* (stone) — give the chip a clear visual language.
- This is a **mobile-first PWA** but renders full-width on desktop; show how the
  direction breathes at both widths if you can.

Deliver the 2–3 directions now.
