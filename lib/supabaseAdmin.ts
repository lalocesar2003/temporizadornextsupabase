// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!; // <- tu secret key

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error("Faltan variables de entorno de Supabase");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
