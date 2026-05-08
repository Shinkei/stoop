import { Title } from "@solidjs/meta";
import { type Component } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";

/*
  Sell (New Listing) — /sell

  TODO: Implementar wizard de 4 pasos:
  1. Fotos (upload a Supabase Storage)
  2. Detalles (título, categoría, precio, condición)
  3. Descripción + toggle "acepta ofertas"
  4. Confirmación y publicación

  Server function de ejemplo para crear listing:
    async function createListing(data: ListingInsert) {
      "use server";
      const { data: listing } = await supabase
        .from("listings")
        .insert(data)
        .select()
        .single();
      return listing;
    }

  Nota: "use server" convierte la función en un RPC seguro —
  solo se ejecuta en el servidor, nunca se envía al cliente.
  Es el equivalente a una Server Action de Next.js.
*/

const Sell: Component = () => {
  return (
    <MobileShell>
      <Title>Stoop — Vender</Title>
      <div class="flex h-full items-center justify-center text-muted">
        <p class="text-xs">— nuevo listing por implementar —</p>
      </div>
    </MobileShell>
  );
};

export default Sell;
