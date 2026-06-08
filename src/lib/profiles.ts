import { query, revalidate } from "@solidjs/router";
import { supabase } from "./supabase";
import type { Tables } from "~/types/database";

/*
  Lectura y mutación del perfil del usuario.

  - getProfile envuelto en query() para poder invalidarlo tras un upsert
    (editar nombre, neighborhood, etc.) sin tener que refrescar la ruta.
*/

export const getProfile = query(
  async (userId: string | undefined): Promise<Tables<"profiles"> | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },
  "profile:by-id",
);

export type ProfileEdit = {
  full_name: string;
  username: string;
  neighborhood?: string | null;
};

/** Crea o actualiza el perfil del usuario actual.
 *
 *  Se usa para:
 *  - Completar el perfil tras un signup donde no se creó la fila en `profiles`.
 *  - Editar nombre / usuario / barrio desde la pantalla de perfil.
 */
export async function upsertProfile(
  userId: string,
  edit: ProfileEdit,
): Promise<Tables<"profiles">> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      full_name: edit.full_name,
      username: edit.username,
      neighborhood: edit.neighborhood ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await revalidate(getProfile.key);
  return data;
}
