import { Title } from "@solidjs/meta";
import { type Component, createSignal, For, Show } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Search — /search

  Nuevos conceptos de SolidJS que aparecen aquí:

  1. Controlled input (input controlado)
     - value={query()} y onInput={(e) => setQuery(...)} conectan el
       <input> a la señal en ambas direcciones.
     - Solid usa onInput, NO onChange.
       En React, onChange dispara en cada tecla (comportamiento custom).
       En Solid (y el DOM nativo), onChange solo dispara al perder foco,
       y onInput es el que dispara en cada tecla. Solid sigue el DOM.
     - e.currentTarget está bien tipado a HTMLInputElement sin casting:
       Solid no envuelve los eventos en SyntheticEvent como React.

  2. Componentes con props reactivas
     - SearchIcon recibe `active`. CRÍTICO: nunca destructurar props
       (`const { active } = props`) — pierde la reactividad porque
       captura el valor en el momento de la llamada.
     - Acceder via props.active mantiene el getter reactivo que el
       compilador de Solid genera para cada prop.

  TODO: Conectar con Supabase
  - supabase.from("listings").textSearch("title", query()) para resultados
  - Filtrar categorías por count si hay query activa
*/

const RECENT_SEARCHES = [
  "silla mid-century",
  "sartén de hierro",
  "monstera",
  "bici de niño",
];

type Category = { name: string; count: number; hue: number };

const CATEGORIES: Category[] = [
  { name: "Muebles", count: 284, hue: 40 },
  { name: "Ropa", count: 512, hue: 340 },
  { name: "Libros y media", count: 167, hue: 80 },
  { name: "Cocina", count: 201, hue: 200 },
  { name: "Niños", count: 98, hue: 300 },
  { name: "Electrónica", count: 143, hue: 220 },
  { name: "Jardín", count: 76, hue: 140 },
  { name: "Arte y deco", count: 189, hue: 20 },
];

const Search: Component = () => {
  const [query, setQuery] = createSignal("");

  return (
    <MobileShell>
      <Title>Stoop — Buscar</Title>
      <div class="flex h-full flex-col">
        <main class="flex-1 overflow-y-auto pb-4">
          {/* Header + input */}
          <div class="px-5 pt-14 pb-5">
            <h1 class="mb-4 font-display text-[34px] leading-none tracking-tight">Buscar</h1>
            <div class="flex h-12 items-center gap-3 rounded-lg bg-card px-4">
              <SearchIcon active={query().length > 0} />
              <input
                type="text"
                placeholder="Busca en tu barrio…"
                spellcheck={false}
                autocapitalize="off"
                autocomplete="off"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
                class="flex-1 bg-transparent text-sm text-cream outline-none placeholder:text-muted"
              />
              <Show when={query().length > 0}>
                <button
                  onClick={() => setQuery("")}
                  class="flex h-5 w-5 items-center justify-center text-muted"
                  aria-label="Borrar búsqueda"
                >
                  <ClearIcon />
                </button>
              </Show>
            </div>
          </div>

          {/* Recientes */}
          <section class="px-5 pb-6">
            <div class="mb-3 flex items-baseline justify-between">
              <p class="text-[11px] font-semibold tracking-wider text-muted uppercase">
                Recientes
              </p>
              <button class="text-[11px] text-muted">Borrar</button>
            </div>
            <div class="flex flex-wrap gap-2">
              <For each={RECENT_SEARCHES}>
                {(term) => (
                  <button class="flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-[13px] text-cream">
                    <ClockIcon />
                    {term}
                  </button>
                )}
              </For>
            </div>
          </section>

          {/* Categorías */}
          <section class="px-5 pb-4">
            <p class="mb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
              Explora por categoría
            </p>
            <div class="grid grid-cols-2 gap-2.5">
              <For each={CATEGORIES}>
                {(cat) => (
                  <button class="relative h-[100px] overflow-hidden rounded-md text-left">
                    <div
                      class="absolute inset-0"
                      style={{ background: `oklch(0.45 0.08 ${cat.hue})` }}
                    />
                    <div class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/85 to-ink/10 px-3 py-2.5">
                      <p class="text-sm font-semibold text-cream">{cat.name}</p>
                      <p class="text-[11px] text-cream/70">{cat.count} ítems</p>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </section>
        </main>

        <TabBar active="search" />
      </div>
    </MobileShell>
  );
};

const SearchIcon: Component<{ active?: boolean }> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.active ? "var(--color-lime)" : "var(--color-muted)"}
    stroke-width="1.8"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

const ClearIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </svg>
);

const ClockIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color-muted)"
    stroke-width="2"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export default Search;
