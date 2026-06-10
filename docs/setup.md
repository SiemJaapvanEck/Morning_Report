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

Vercel's eigen cron is op de Hobby-tier UTC-only en maximaal dagelijks; een
externe scheduler corrigeert zomertijd zelf (zie docs/ontwerp.md §2).

1. Maak een gratis account op [cron-job.org](https://cron-job.org).
2. Nieuwe cronjob:
   - **URL:** `https://JOUW-APP.vercel.app/api/pipeline/tick`
   - **Methode:** POST
   - **Header:** `Authorization: Bearer JOUW_CRON_SECRET`
   - **Schema:** elke 2 minuten tussen 06:30 en 08:15, tijdzone
     **Europe/Amsterdam** (instelbaar per job — dat is precies waarom we deze
     scheduler gebruiken)
3. Klaar. Elke tick voert één brok werk uit (<10s); rond 07:00 staat het
   rapport er doorgaans al, uiterlijk 08:15.

De tick is idempotent: dubbel aanroepen kan geen kwaad, en na een fout pakt
de volgende tick de draad weer op.

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
