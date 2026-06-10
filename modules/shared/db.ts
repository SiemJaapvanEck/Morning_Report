// Server-side Supabase-client. Eén service-role-client voor de hele app:
// er is geen login (zie ontwerp), dus alle toegang loopt via de server.
//
// Lazy geïnitialiseerd zodat `next build` slaagt zonder env-variabelen.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function hasDbConfig(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY ontbreken — zie docs/setup.md",
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return client;
}

/** Gooit een nette fout als een Supabase-call faalde. */
export function unwrap<T>(result: {
  data: T;
  error: { message: string } | null;
}): NonNullable<T> {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`);
  if (result.data == null) throw new Error("Supabase: lege respons");
  return result.data;
}
