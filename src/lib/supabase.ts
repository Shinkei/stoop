import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

/*
  Cliente de Supabase.

  IMPORTANTE: Las variables VITE_* son públicas (se exponen al browser).
  Solo usa la anon key aquí — nunca la service_role key.

  Para operaciones server-only (sin exposición al cliente), usa server functions:
    async function serverAction() {
      "use server";
      // Aquí puedes usar process.env.SUPABASE_SERVICE_ROLE_KEY
    }
*/
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno. Copia .env.example a .env.local y completa los valores.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
