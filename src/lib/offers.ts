import { query, revalidate } from "@solidjs/router";
import { supabase } from "./supabase";
import type { Tables } from "~/types/database";

/*
  Queries y mutaciones de offers.

  Patrón SolidStart aquí:
  - `query(fn, key)` envuelve una función async para que createAsync() la
    cachee por su key + argumentos. Distinto de createResource: query es
    a nivel de módulo y permite invalidación con `revalidate(key)`.
  - Esto importa cuando hacemos mutaciones (aceptar una oferta): después de
    la mutación llamamos `revalidate(getInbox.key)` para re-fetch el inbox.

  Joins anidados:
    select("*, buyer:profiles!buyer_id(*), listing:listings!listing_id(*, seller:profiles!seller_id(*)))")
  - cada listing trae su seller embebido — necesario para distinguir entre
    "ofertas que recibo" (yo soy seller del listing) vs "ofertas que hago"
    (yo soy buyer).
*/

export type OfferRow = Tables<"offers">;

export type OfferWithRels = OfferRow & {
  buyer: Tables<"profiles">;
  listing: Tables<"listings"> & { seller: Tables<"profiles"> };
};

/** Inbox completo: cualquier offer en la que el usuario está involucrado
 *  (como buyer o como seller del listing). RLS ya restringe a estas filas,
 *  pero el filtro explícito por buyer_id/seller es lo que permite a la UI
 *  categorizarlas en pestañas. */
export const getInbox = query(
  async (userId: string | undefined): Promise<OfferWithRels[]> => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("offers")
      .select(
        "*, buyer:profiles!buyer_id(*), listing:listings!listing_id(*, seller:profiles!seller_id(*))",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as OfferWithRels[];
  },
  "offers:inbox",
);

/** Cambia el status de una oferta. La policy "offers: update involved"
 *  permite que tanto buyer como seller actualicen, pero típicamente solo
 *  el seller acepta/rechaza. */
export async function setOfferStatus(
  offerId: string,
  status: "accepted" | "rejected" | "pending",
): Promise<void> {
  const { error } = await supabase
    .from("offers")
    .update({ status })
    .eq("id", offerId);
  if (error) throw error;
  await revalidate(getInbox.key);
}

/** Crea una oferta nueva en un listing. */
export async function createOffer(input: {
  listingId: string;
  buyerId: string;
  amount: number;
  message?: string;
}): Promise<OfferRow> {
  const { data, error } = await supabase
    .from("offers")
    .insert({
      listing_id: input.listingId,
      buyer_id: input.buyerId,
      amount: input.amount,
      message: input.message ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await revalidate(getInbox.key);
  return data;
}
