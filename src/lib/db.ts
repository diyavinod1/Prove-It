import type { Db } from './types';
import { makeLocalDb } from './localDb';
import { makeSupabaseDb, supabaseConfigured } from './supabaseDb';

/** Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set, otherwise a local-only demo store. */
export const db: Db = supabaseConfigured ? makeSupabaseDb() : makeLocalDb();
