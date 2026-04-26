import { Title } from "@solidjs/meta";
import { type Component } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Offers Inbox — /offers

  TODO: Implementar con:
  - Tarjeta destacada "Best offer" en verde
  - Tabs: Recibidas / Enviadas / Aceptadas
  - Lista de ofertas con avatar, item y monto
  - Realtime de Supabase para actualizaciones en vivo:
      supabase
        .channel("offers")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "offers" }, handler)
        .subscribe();
*/

const Offers: Component = () => {
  return (
    <MobileShell>
      <Title>Stoop — Ofertas</Title>
      <div class="flex h-full flex-col">
        <div class="flex flex-1 items-center justify-center text-stoop-muted">
          <p class="text-xs">— offers inbox por implementar —</p>
        </div>
        <TabBar active="offers" />
      </div>
    </MobileShell>
  );
};

export default Offers;
