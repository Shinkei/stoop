import { Title } from "@solidjs/meta";
import { type Component } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Search — /search

  TODO: Implementar con:
  - Input de búsqueda activo con cursor
  - Chips de búsquedas recientes
  - Grid 2x4 de categorías con imagen de fondo
  - Integrar búsqueda full-text de Supabase:
    supabase.from("listings").select().textSearch("title", query)
*/

const Search: Component = () => {
  return (
    <MobileShell>
      <Title>Stoop — Buscar</Title>
      <div class="flex h-full flex-col">
        <div class="flex flex-1 items-center justify-center text-stoop-muted">
          <p class="text-xs">— search por implementar —</p>
        </div>
        <TabBar active="search" />
      </div>
    </MobileShell>
  );
};

export default Search;
