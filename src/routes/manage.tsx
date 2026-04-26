import { Title } from "@solidjs/meta";
import { type Component } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Manage Items — /manage

  TODO: Implementar con:
  - Stats cards: Activos / Ofertas / Ganado
  - Filter pills: Todos / Activos / Reservados / Borrador / Vendidos
  - Lista de items con thumbnail, estado y métricas (views, offers)
  - Acciones inline: editar, marcar como vendido, eliminar
*/

const Manage: Component = () => {
  return (
    <MobileShell>
      <Title>Stoop — Mis items</Title>
      <div class="flex h-full flex-col">
        <div class="flex flex-1 items-center justify-center text-stoop-muted">
          <p class="text-xs">— manage items por implementar —</p>
        </div>
        <TabBar active="profile" />
      </div>
    </MobileShell>
  );
};

export default Manage;
