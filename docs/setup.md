# Setup — van nul naar je eerste editie

Vier stappen: Supabase, lokaal draaien, Vercel, scheduler. Daarna optioneel
de iOS Shortcut.

---

## 1. Supabase

1. Maak een gratis project aan op [supabase.com](https://supabase.com)
   (regio: bij voorkeur `eu-central-1`, Frankfurt).
2. Open **SQL Editor** in het dashboard en draai de twee migraties, in volgorde:
   - plak de inhoud van `supabase/migrations/0001_init.sql` → Run
   - plak de inhoud van `supabase/migrations/0002_seed.sql` → Run
3. Ga naar **Project Settings → API** en noteer:
   - de **Project URL** → `SUPABASE_URL`
   - de **service_role key** (onder "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

> De service-role key blijft server-side; er is bewust geen anon-toegang
> (geen login-model — zie docs/ontwerp.md §3).

## 2. Lokaal draaien

```bash
cp .env.example .env.local
# vul in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
# genereer geheimen: openssl rand -hex 24  (voor CRON_SECRET en CAPTURE_SECRET)

npm install
npm run dev          # → http://localhost:3000 — maak hier je profiel aan
npm run pipeline     # draait de volledige ochtend-pipeline lokaal
```

Na `npm run pipeline` staat de editie van vandaag op de voorpagina.

## 3. Vercel

1. Push deze repo naar GitHub (`git push -u origin main`).
2. [vercel.com](https://vercel.com) → **Add New Project** → importeer de repo.
   Framework-preset: Next.js, geen aanpassingen nodig.
3. Zet onder **Settings → Environment Variables** dezelfde variabelen als in
   `.env.local` (alle omgevingen).
4. Deploy. Elke push naar `main` deployt daarna vanzelf.

## 4. Scheduler (cron-job.org)

### Waarom een externe scheduler, en geen Vercel-cron?

Bewuste ontwerpkeuze (docs/ontwerp.md §2). De pipeline is een stappenmachine:
hij heeft veel korte ticks nodig, verspreid over de ochtend. Vercel-cron kan
dat op de gratis Hobby-tier niet:

| Wat we nodig hebben | Vercel-cron (Hobby) | cron-job.org |
|---|---|---|
| Elke ~2 min in een ochtendvenster | Max **1× per dag** | ✅ tot elke minuut |
| Europe/Amsterdam (zomer/wintertijd) | Alleen **UTC** (schuift een uur) | ✅ per job instelbaar |
| Kosten | — | Gratis |

Daarom zit er **geen** `vercel.json` met cron-config in het project. Dat hoort
zo. De Vercel-deploy serveert alleen de app + het `/api/pipeline/tick`-endpoint;
cron-job.org tikt dat endpoint aan.

### Stap voor stap (exacte velden)

1. Maak een gratis account op [cron-job.org](https://cron-job.org) → **Create cronjob**.

2. **Common**
   - **Title:** `Morning Report tick`
   - **Address (URL):** `https://JOUW-APP.vercel.app/api/pipeline/tick`
     (vervang door je Vercel-URL)

3. **Schedule** — kies **Custom** en zet:
   - **Days of month:** elke (`*`)
   - **Months:** elke (`*`)
   - **Days of week:** elke (`*`)
   - **Hours:** `6`, `7`, `8` aanvinken (of cron-expressie `6-8`)
   - **Minutes:** elke 2 minuten — `*/2` (of vink de even minuten aan)
   - **Timezone:** **Europe/Amsterdam** ← dit is precies waarvoor we deze
     scheduler gebruiken; cron-job.org rekent dan zelf de zomer/wintertijd om.

   > Het venster 06:30–08:15 hoeft niet exact: van 06:00 tot 08:58 elke 2 min
   > tikken kan geen kwaad. Zodra de editie van die dag klaar is, doet elke
   > volgende tick niets meer (idempotent, zie hieronder). Wil je het strak:
   > op cron-job.org kun je onder *Minutes* per uur de minuten kiezen, dus
   > voor uur 6 alleen 30–58 en voor uur 8 alleen 0–14.

4. **Advanced → Request method:** zet op **POST** (standaard is GET — dit is
   belangrijk, het endpoint accepteert alleen POST).

5. **Advanced → Headers:** voeg één header toe:
   - **Key:** `Authorization`
   - **Value:** `Bearer JOUW_CRON_SECRET`
     (de waarde van `CRON_SECRET` uit je `.env.local` / Vercel-env-vars,
     met `Bearer ` ervoor)

6. **Save**. Klaar.

### Testen of het werkt

- Zonder de juiste header hoort het endpoint **401** te geven; mét de header
  draait een tick. Je kunt het los testen:
  ```bash
  # 401 verwacht (geen geheim):
  curl -X POST https://JOUW-APP.vercel.app/api/pipeline/tick -i | head -1
  # 200 + JSON verwacht (mét geheim):
  curl -X POST https://JOUW-APP.vercel.app/api/pipeline/tick \
    -H "Authorization: Bearer JOUW_CRON_SECRET"
  ```
- Op cron-job.org zelf: open de job → **History** om te zien of de aanroepen
  een 200 teruggeven.

Elke tick voert één brok werk uit (ruim <60s); rond 07:00 staat het rapport er
doorgaans al, uiterlijk rond 08:15. De tick is **idempotent**: dubbel aanroepen
kan geen kwaad, een tick op een al-afgeronde editie doet niets, en na een fout
pakt de volgende tick de draad gewoon weer op.

## 5. iOS Shortcut (optioneel)

Nieuwe Shortcut → actie **"Inhoud van URL ophalen"**:

- **URL:** `https://JOUW-APP.vercel.app/api/capture`
- **Methode:** POST
- **Headers:** `Authorization: Bearer JOUW_CAPTURE_SECRET` en
  `Content-Type: application/json`
- **Body (JSON):**
  ```json
  { "text": "Gevraagde tekst", "kind": "onderwerp" }
  ```
  met een "Vraag om invoer"-actie als bron voor `text`.
  `kind` mag ook `bron` (feed-URL) of `notitie` (voor Sol) zijn.

Zet hem op je beginscherm of in de widget — onderweg een onderwerp roepen en
Sol pikt het op.

## Problemen oplossen

| Symptoom | Oorzaak / oplossing |
|---|---|
| Voorpagina toont setupscherm | `.env.local` mist Supabase-variabelen |
| `claim_next_step`-fout | Migratie 0001 niet (volledig) gedraaid |
| Editie blijft op "running" hangen | Check `pipeline_steps` op `skipped` met een `error`; los de oorzaak op en zet de stap terug op `pending` |
| Bron geeft ⚠ in Instellingen | Feed-URL kapot of tijdelijk onbereikbaar — de rest van de editie gaat gewoon door |
| Kosten lopen op | Check `usage_log`; de budget-guard stopt sowieso op `BUDGET_EDITION_EUR` |
