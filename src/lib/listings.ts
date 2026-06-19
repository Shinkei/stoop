import { query, revalidate } from "@solidjs/router";
import { supabase } from "./supabase";
import type { Tables, TablesInsert } from "~/types/database";

/*
  Queries y mutaciones de listings.

  Cómo conviven con SolidStart:
  - Estas funciones devuelven Promises. Se las pasamos a createAsync() en los
    componentes y SolidJS se encarga del Suspense y la reactividad.
  - Las claves del cliente Supabase (URL + anon key) son públicas. Lo que
    protege los datos son las policies de RLS, no el secret de la clave.
  - Para mutaciones que requieren bypass de RLS o no quieres exponer (cron jobs,
    triggers), usa "use server" + service_role key. Aquí leemos como anon,
    así que RLS aplica automáticamente.
  - Las queries que se mutan (myListings) se envuelven en `query()` para poder
    revalidarlas tras un insert/update con `revalidate(key)`.
*/

export type ListingRow = Tables<"listings">;

export type ListingWithSeller = ListingRow & {
  seller: Tables<"profiles">;
};

export type OfferStub = { id: string; status: string };
export type ManagedListing = ListingRow & { offers: OfferStub[] };

const LIST_LIMIT = 50;

/** Listings activos, más recientes primero. Opcionalmente filtra por categoría
 *  con ilike (búsqueda parcial, case-insensitive). Pasar undefined o "Todo"
 *  desactiva el filtro. */
export async function getListings(category?: string): Promise<ListingRow[]> {
  let q = supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (category && category !== "Todo") {
    q = q.ilike("category", `%${category}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Búsqueda por título — ilike es un LIKE case-insensitive. Para corpus
 *  grandes querrías textSearch() con un índice tsvector; ilike es suficiente
 *  para 1K listings. */
export async function searchListings(term: string): Promise<ListingRow[]> {
  const t = term.trim();
  if (!t) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .ilike("title", `%${t}%`)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) throw error;
  return data ?? [];
}

/** Detalle de un listing — incluye datos del vendedor vía join.
 *
 *  Sintaxis del join en supabase-js:
 *    select("*, seller:profiles!seller_id(*)")
 *  - "seller" es el alias del campo en el resultado.
 *  - "profiles" es la tabla a la que apunta el FK.
 *  - "!seller_id" indica el FK específico (necesario si hay múltiples FKs
 *    entre las dos tablas; aquí es redundante pero explícito).
 */
export async function getListing(id: string): Promise<ListingWithSeller | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from("listings")
    .select("*, seller:profiles!seller_id(*)")
    .eq("id", id)
    .single();

  if (error) {
    // PGRST116 = "no rows" — no es un error real, devolvemos null.
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ListingWithSeller;
}

/** Listings del vendedor — todos los status (active, reserved, draft, sold)
 *  con sus ofertas embebidas para contar pendientes en el dashboard.
 *
 *  Envuelto en query() para poder revalidar tras crear/actualizar un listing.
 *
 *  RLS: la policy "listings: select active" permite leer cualquier listing
 *  propio (seller_id = auth.uid()) sin importar el status, así que aquí
 *  el .eq("seller_id", ...) filtra el set completo.
 */
export const getMyListings = query(
  async (sellerId: string | undefined): Promise<ManagedListing[]> => {
    if (!sellerId) return [];
    const { data, error } = await supabase
      .from("listings")
      .select("*, offers(id, status)")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ManagedListing[];
  },
  "listings:mine",
);

export type NewListing = Omit<TablesInsert<"listings">, "seller_id" | "id">;

/** Crea un listing en la DB. El seller_id se pasa aparte para que el caller
 *  no tenga que conocer el shape interno de la fila. */
export async function createListing(
  sellerId: string,
  input: NewListing,
): Promise<ListingRow> {
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...input, seller_id: sellerId })
    .select()
    .single();
  if (error) throw error;
  await revalidate(getMyListings.key);
  return data;
}

/** Cambia el estado de un listing (active → reserved → sold, etc.). */
export async function setListingStatus(
  id: string,
  status: "active" | "reserved" | "sold" | "draft",
): Promise<void> {
  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  await revalidate(getMyListings.key);
}

const PHOTO_BUCKET = "listing-photos";
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);

/** Sube una foto al bucket `listing-photos` y devuelve su URL pública.
 *
 *  Convención de path: `{user_id}/{uuid}.{ext}`.
 *  - El primer segmento (carpeta = user id) lo usa la policy de Storage
 *    para garantizar que cada usuario solo escribe en su carpeta:
 *      (storage.foldername(name))[1] = auth.uid()::text
 *  - El bucket se crea como público, así que getPublicUrl(path) devuelve
 *    una URL accesible sin firmar.
 */
export async function uploadListingPhoto(file: File, userId: string): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const safeExt = ALLOWED_EXT.has(ext) ? ext : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type || `image/${safeExt}`,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Elimina una foto del bucket. Recibe la URL pública y deriva el path
 *  interno haciendo split por el segmento del bucket. */
export async function deleteListingPhoto(publicUrl: string): Promise<void> {
  const marker = `/${PHOTO_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  // Ignoramos errores: si el objeto ya no existe, no merece la pena bloquear UX.
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

/** Hue determinístico desde el id para placeholders de imagen.
 *  Mientras no haya fotos reales, esto da una variedad visual estable
 *  (el mismo id siempre produce el mismo color). */
export function hueFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h + id.charCodeAt(i) * 7) % 360;
  }
  return h;
}
