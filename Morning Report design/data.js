/* Shared mock news data for the Morning Report prototype.
   All content is illustrative placeholder copy for design purposes. */
(function () {
  // ── Full timelines for the three featured micro-topics ──────────────
  const iran = {
    id: 'iran',
    title: 'Iran–Israel Escalation',
    short: 'Iran–Israel',
    category: 'Geopolitics',
    region: 'Middle East',
    hue: 6,                       // red-leaning accent
    status: 'LIVE',
    summary: 'A consulate strike in April spiraled into the most direct Iran–Israel exchange in years. Diplomacy in Geneva is now racing against renewed border clashes.',
    metric: { label: 'Regional risk', value: 'Severe' },
    sources: 128,
    updated: '2h ago',
    confidence: 0.82,
    spark: [12, 18, 16, 28, 40, 33, 52, 47, 61, 58, 74, 96],
    events: [
      { date: '2026-04-14', d: 'APR 14', title: 'Consulate strike kills senior commanders', tag: 'Military', desc: 'An airstrike on a diplomatic compound in Damascus kills two senior IRGC officers, drawing vows of retaliation.', sources: 41 },
      { date: '2026-04-28', d: 'APR 28', title: 'Retaliatory drone & missile barrage', tag: 'Military', desc: 'Over 300 drones and missiles are launched overnight; most are intercepted, limiting casualties but raising the stakes.', sources: 67 },
      { date: '2026-05-12', d: 'MAY 12', title: 'UN Security Council emergency session', tag: 'Diplomacy', desc: 'An emergency session ends without a binding resolution as permanent members split on attribution.', sources: 38 },
      { date: '2026-05-30', d: 'MAY 30', title: 'Back-channel ceasefire talks open in Geneva', tag: 'Diplomacy', desc: 'Mediated by Oman and Switzerland, indirect talks begin on de-escalation and prisoner files.', sources: 52 },
      { date: '2026-06-06', d: 'JUN 6', title: 'Talks stall amid fresh border clashes', tag: 'Military', desc: 'Exchanges of fire along the northern border threaten to collapse the nascent negotiation track.', sources: 44 },
      { date: '2026-06-10', d: 'JUN 10', title: 'New diplomatic push as oil ticks up', tag: 'Markets', desc: 'A renewed mediation proposal lands today; Brent crude rises 3% on supply-route fears.', sources: 31, now: true },
    ],
  };

  const ukraine = {
    id: 'ukraine',
    title: 'Ukraine — Eastern Front',
    short: 'Ukraine War',
    category: 'Geopolitics',
    region: 'Eastern Europe',
    hue: 250,                     // blue accent
    status: 'LIVE',
    summary: 'After a grinding winter, the line is shifting again near Kharkiv. A new aid package and a major prisoner exchange reframe the summer outlook.',
    metric: { label: 'Aid pledged', value: '$61B' },
    sources: 204,
    updated: '40m ago',
    confidence: 0.78,
    spark: [40, 38, 44, 41, 50, 62, 55, 60, 58, 66, 72, 70],
    events: [
      { date: '2026-03-03', d: 'MAR 3', title: 'Winter offensive grinds to stalemate', tag: 'Military', desc: 'Months of attritional fighting yield minimal territorial change across the eastern axis.', sources: 71 },
      { date: '2026-04-09', d: 'APR 9', title: 'Coordinated strikes on energy grid', tag: 'Infrastructure', desc: 'A large-scale strike campaign targets power generation ahead of repairs, straining the grid.', sources: 49 },
      { date: '2026-05-05', d: 'MAY 5', title: 'Counteroffensive probes near Kharkiv', tag: 'Military', desc: 'Localized advances retake several villages, the first momentum shift in months.', sources: 63 },
      { date: '2026-05-25', d: 'MAY 25', title: '$61B aid package clears final vote', tag: 'Diplomacy', desc: 'A long-stalled support package passes, unlocking air-defense interceptors and artillery.', sources: 88 },
      { date: '2026-06-02', d: 'JUN 2', title: 'Largest prisoner exchange of the year', tag: 'Diplomacy', desc: 'Hundreds are exchanged in a mediated swap, briefly easing tensions.', sources: 57 },
      { date: '2026-06-09', d: 'JUN 9', title: 'Frontline shifts as interceptors arrive', tag: 'Military', desc: 'New air defenses blunt overnight strikes; analysts revise the summer forecast.', sources: 42, now: true },
    ],
  };

  const nvidia = {
    id: 'nvidia',
    title: 'Nvidia — AI Supercycle',
    short: 'Nvidia Stock',
    category: 'Markets',
    region: 'Technology',
    hue: 150,                     // green accent
    status: 'MARKETS',
    summary: 'Record datacenter demand and the Rubin architecture reveal pushed Nvidia to a fresh all-time high — even as export controls and a sharp April pullback test the rally.',
    metric: { label: 'Last price', value: '$184.20', delta: '+4.1%' },
    sources: 96,
    updated: '5m ago',
    confidence: 0.71,
    price: 184.20,
    delta: 4.1,
    spark: [118, 122, 131, 129, 142, 121, 138, 150, 161, 168, 176, 184],
    events: [
      { date: '2026-01-22', d: 'JAN 22', title: 'Q4 earnings smash estimates', tag: 'Earnings', desc: 'Datacenter revenue jumps 78% YoY; guidance lifts the entire AI hardware complex.', sources: 72, price: 122 },
      { date: '2026-02-18', d: 'FEB 18', title: 'Rubin architecture unveiled at GTC', tag: 'Product', desc: 'The next-gen platform promises a 3x leap in training throughput, locking in roadmap demand.', sources: 64, price: 142 },
      { date: '2026-03-11', d: 'MAR 11', title: 'Tightened export controls announced', tag: 'Policy', desc: 'New rules restrict top-tier chip sales to several markets, denting near-term forecasts.', sources: 58, price: 129 },
      { date: '2026-04-07', d: 'APR 7', title: 'Sharp pullback on rate fears', tag: 'Markets', desc: 'A broad tech selloff erases gains as yields spike; the stock falls 14% in a week.', sources: 47, price: 121 },
      { date: '2026-05-20', d: 'MAY 20', title: 'Hyperscaler capex guidance surges', tag: 'Demand', desc: 'Cloud giants raise AI spending plans, reigniting the rally and order backlog.', sources: 69, price: 168 },
      { date: '2026-06-10', d: 'JUN 10', title: 'Fresh all-time high at $184', tag: 'Markets', desc: 'Shares set a record intraday as supply constraints ease and demand stays red-hot.', sources: 38, price: 184, now: true },
    ],
  };

  // ── Additional micro-topics (each a full timeline) ──────────────────
  const fed = {
    id: 'fed', title: 'US Fed Rate Path', short: 'Fed Rate Path', category: 'Markets', region: 'United States',
    hue: 150, status: 'MARKETS', delta: -0.6, updated: '3h ago', sources: 84, confidence: 0.69,
    summary: 'Sticky inflation has pushed the first rate cut deeper into the year. Markets now price a July hold as the dot-plot tightens.',
    metric: { label: 'Implied cuts (2026)', value: '1.4' }, spark: [60, 58, 55, 52, 50, 53, 49, 47, 45, 44, 46, 43],
    events: [
      { date: '2026-01-31', d: 'JAN 31', title: 'Fed holds, signals patience', tag: 'Policy', desc: 'Rates left unchanged; the chair stresses a data-dependent path with no rush to ease.', sources: 51 },
      { date: '2026-03-19', d: 'MAR 19', title: 'Dot-plot trimmed to two cuts', tag: 'Policy', desc: 'Updated projections pare expected 2026 easing as core inflation stays elevated.', sources: 44 },
      { date: '2026-04-22', d: 'APR 22', title: 'Core inflation reaccelerates', tag: 'Data', desc: 'A hotter-than-expected print revives bets that cuts could slip to autumn.', sources: 38 },
      { date: '2026-05-07', d: 'MAY 7', title: 'Officials split on timing', tag: 'Policy', desc: 'Speeches reveal a widening divide between patient and dovish camps.', sources: 33 },
      { date: '2026-06-04', d: 'JUN 4', title: 'Jobs cool, July hold priced in', tag: 'Markets', desc: 'A softer labor report nudges odds toward a hold at the next meeting.', sources: 29, now: true },
    ],
  };
  const euai = {
    id: 'euai', title: 'EU AI Act Enforcement', short: 'EU AI Act', category: 'Policy', region: 'European Union',
    hue: 250, status: 'POLICY', delta: 1.4, updated: '6h ago', sources: 61, confidence: 0.74,
    summary: 'The first binding obligations are live and regulators have opened their first probes — with initial fines now on the table for general-purpose models.',
    metric: { label: 'Open probes', value: '7' }, spark: [10, 12, 14, 13, 16, 18, 17, 20, 22, 21, 24, 26],
    events: [
      { date: '2026-02-02', d: 'FEB 2', title: 'First obligations take effect', tag: 'Policy', desc: 'Bans on prohibited AI practices become enforceable across member states.', sources: 40 },
      { date: '2026-03-15', d: 'MAR 15', title: 'Guidance issued for GPAI models', tag: 'Policy', desc: 'The AI Office publishes transparency duties for general-purpose model providers.', sources: 31 },
      { date: '2026-04-28', d: 'APR 28', title: 'First compliance probes opened', tag: 'Enforcement', desc: 'Regulators request documentation from several large model providers.', sources: 28 },
      { date: '2026-06-01', d: 'JUN 1', title: 'Initial fines proposed', tag: 'Enforcement', desc: 'Draft penalties target gaps in transparency and training-data disclosure.', sources: 24, now: true },
    ],
  };
  const starship = {
    id: 'starship', title: 'SpaceX Starship Flight 12', short: 'Starship F12', category: 'Science', region: 'Spaceflight',
    hue: 250, status: 'LIVE', delta: 2.1, updated: '1d ago', sources: 47, confidence: 0.66,
    summary: 'Hardware is stacked and the wet dress is done. The launch window for the twelfth integrated flight opens this week.',
    metric: { label: 'Launch window', value: 'JUN 12' }, spark: [20, 22, 26, 30, 28, 34, 40, 44, 50, 56, 60, 66],
    events: [
      { date: '2026-03-10', d: 'MAR 10', title: 'Booster static fire complete', tag: 'Test', desc: 'A full-duration static fire clears the booster for flight integration.', sources: 29 },
      { date: '2026-04-18', d: 'APR 18', title: 'Full stack assembled', tag: 'Ops', desc: 'Ship and booster are mated on the orbital launch mount.', sources: 22 },
      { date: '2026-05-20', d: 'MAY 20', title: 'Wet dress rehearsal passes', tag: 'Test', desc: 'Propellant loading and countdown rehearsal complete without scrubs.', sources: 26 },
      { date: '2026-06-07', d: 'JUN 7', title: 'Launch window opens', tag: 'Ops', desc: 'Regulators clear the flight; weather is the remaining variable.', sources: 19, now: true },
    ],
  };
  const tsmc = {
    id: 'tsmc', title: 'Taiwan Chip Export Curbs', short: 'Chip Curbs', category: 'Markets', region: 'Asia-Pacific',
    hue: 150, status: 'MARKETS', delta: 0.9, updated: '8h ago', sources: 58, confidence: 0.7,
    summary: 'A new licensing regime for advanced chip exports has been finalized and is now in force, reshaping supply chains across the region.',
    metric: { label: 'Index impact', value: '+0.9%' }, spark: [50, 48, 52, 49, 55, 58, 54, 60, 57, 62, 64, 61],
    events: [
      { date: '2026-02-12', d: 'FEB 12', title: 'New licensing regime announced', tag: 'Policy', desc: 'Authorities outline export controls on the most advanced process nodes.', sources: 33 },
      { date: '2026-04-03', d: 'APR 3', title: 'Industry pushback intensifies', tag: 'Markets', desc: 'Manufacturers warn of order disruption and lobby for carve-outs.', sources: 27 },
      { date: '2026-05-19', d: 'MAY 19', title: 'Rules finalized with carve-outs', tag: 'Policy', desc: 'The final framework softens some thresholds after consultation.', sources: 24 },
      { date: '2026-06-05', d: 'JUN 5', title: 'Curbs take effect', tag: 'Markets', desc: 'Licensing requirements go live; suppliers adjust forward guidance.', sources: 21, now: true },
    ],
  };
  const opec = {
    id: 'opec', title: 'OPEC+ Output Decision', short: 'OPEC+ Output', category: 'Markets', region: 'Energy',
    hue: 6, status: 'MARKETS', delta: 3.2, updated: '1h ago', sources: 53, confidence: 0.72,
    summary: 'A surprise deeper cut has tightened supply just as Middle East risk premiums climb, sending Brent sharply higher.',
    metric: { label: 'Brent crude', value: '$88.40', delta: '+3.0%' }, spark: [70, 72, 71, 74, 73, 76, 78, 80, 79, 83, 86, 88],
    events: [
      { date: '2026-03-03', d: 'MAR 3', title: 'Voluntary cuts extended', tag: 'Supply', desc: 'The alliance rolls existing curbs forward through the next quarter.', sources: 30 },
      { date: '2026-04-30', d: 'APR 30', title: 'Compliance debate flares', tag: 'Policy', desc: 'Overproduction by some members tests the group\u2019s cohesion.', sources: 25 },
      { date: '2026-06-01', d: 'JUN 1', title: 'Surprise deeper cut agreed', tag: 'Supply', desc: 'An unexpected reduction tightens the balance into the summer.', sources: 22 },
      { date: '2026-06-09', d: 'JUN 9', title: 'Brent jumps on risk premium', tag: 'Markets', desc: 'Prices spike as supply-route fears compound the output cut.', sources: 18, now: true },
    ],
  };
  const primaries = {
    id: 'primaries', title: 'US Primaries — The Race', short: 'US Primaries', category: 'Politics', region: 'United States',
    hue: 250, status: 'POLITICS', delta: 1.1, updated: '12h ago', sources: 112, confidence: 0.8,
    summary: 'From the first caucuses to the presumptive nominees, the delegate math has reshaped the field over five months of contests.',
    metric: { label: 'Delegates set', value: '92%' }, spark: [30, 45, 40, 70, 65, 80, 78, 85, 82, 88, 90, 92],
    events: [
      { date: '2026-01-15', d: 'JAN 15', title: 'Iowa caucuses open the race', tag: 'Election', desc: 'The first contest sets early momentum and winnows the field.', sources: 48 },
      { date: '2026-02-24', d: 'FEB 24', title: 'Early states split verdicts', tag: 'Election', desc: 'A mixed run of results keeps multiple candidates viable.', sources: 39 },
      { date: '2026-03-05', d: 'MAR 5', title: 'Super Tuesday reshapes math', tag: 'Election', desc: 'The largest delegate haul of the cycle clarifies the front-runners.', sources: 61 },
      { date: '2026-04-02', d: 'APR 2', title: 'Trailing campaigns suspend', tag: 'Election', desc: 'Underperformers exit, consolidating support behind the leaders.', sources: 35 },
      { date: '2026-05-28', d: 'MAY 28', title: 'Presumptive nominees emerge', tag: 'Election', desc: 'Both fields effectively settle ahead of the summer conventions.', sources: 44, now: true },
    ],
  };

  const topics = { iran, ukraine, nvidia, fed, euai, starship, tsmc, opec, primaries };

  // Full news feed — every tracked story, most-recently-updated first.
  const feed = [iran, opec, nvidia, ukraine, starship, euai, fed, tsmc, primaries];

  // ── Derived trending / saved lists ──────────────────────────────────
  const trending = [opec, euai, starship, tsmc, fed, primaries].map((t) => ({
    id: t.id, title: t.title, category: t.category, events: t.events.length, delta: t.delta, hue: t.hue,
  }));

  // Bookmarked timelines the user follows
  const saved = [
    { id: 'iran', title: 'Iran–Israel Escalation', category: 'Geopolitics', events: iran.events.length, updated: '2h ago', hue: 6, unread: 3 },
    { id: 'nvidia', title: 'Nvidia — AI Supercycle', category: 'Markets', events: nvidia.events.length, updated: '5m ago', hue: 150, unread: 1 },
    { id: 'starship', title: 'SpaceX Starship', category: 'Science', events: starship.events.length, updated: '1d ago', hue: 250, unread: 0 },
    { id: 'euai', title: 'EU AI Act', category: 'Policy', events: euai.events.length, updated: '6h ago', hue: 250, unread: 2 },
  ];

  // Calendar activity: events-per-day for the current month (June 2026)
  // index 0 == June 1. Higher = busier news day.
  const calendar = {
    month: 'June', year: 2026, today: 10, startDow: 1, /* Mon */
    activity: [2,1,0,3,4,2,1, 5,3,2,4,6,3,1, 8,4,3,5,7,4,2, 9,5,4,6,8,5,3, 7,4],
  };

  window.NEWS = { topics, list: [iran, ukraine, nvidia], feed, trending, saved, calendar };
})();
