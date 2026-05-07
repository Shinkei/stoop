import { Title } from "@solidjs/meta";
import { type Component, createSignal, For } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Home — Pantalla principal del marketplace.

  Conceptos de SolidJS que aparecen aquí:
  - createSignal: equivalente a useState, pero sin re-renders.
    Solo actualiza el nodo del DOM que leyó la señal.
  - <For>: equivalente a .map() en React. Más eficiente porque
    hace diff de la lista y solo re-crea los items que cambian.
    Funciona igual para scroll horizontal y grid vertical —
    el layout lo define CSS, no el componente.
  - Acceso a señales: selectedCategory() con paréntesis (es una función).
    En React sería solo `selectedCategory`.

  TODO: Conectar con Supabase
  - Reemplazar FEATURED y LISTINGS con createAsync(() => getListings())
  - createAsync es el equivalente a useQuery/fetch en SolidStart
*/

const CATEGORIES = ["Todo", "Muebles", "Ropa", "Libros", "Cocina", "Niños"] as const;

// Primeros 3 ítems en el strip horizontal de "Recién publicados"
const FEATURED = [
  { id: "1", title: "Mesa lateral de nogal", price: 45, distance: "2 cuadras", hue: 40 },
  { id: "2", title: "Chaqueta denim Levi's", price: 28, distance: "5 cuadras", hue: 220 },
  { id: "3", title: "Set Pyrex vintage", price: 34, distance: "0.3 km", hue: 180 },
];

const LISTINGS = [
  { id: "1", title: "Mesa lateral de nogal", price: 45, distance: "2 cuadras", hue: 40, imgHeight: 160 },
  { id: "2", title: "Chaqueta denim Levi's", price: 28, distance: "5 cuadras", hue: 220, imgHeight: 128 },
  { id: "3", title: "Set Pyrex vintage", price: 34, distance: "0.3 km", hue: 180, imgHeight: 144 },
  { id: "4", title: "Silla estilo Eames", price: 120, distance: "1 cuadra", hue: 30, imgHeight: 176 },
  { id: "5", title: "Colección de vinilos (28)", price: 85, distance: "0.5 km", hue: 280, imgHeight: 136 },
  { id: "6", title: "Bolso Filson", price: 60, distance: "3 cuadras", hue: 80, imgHeight: 152 },
];

const Home: Component = () => {
  const [selectedCategory, setSelectedCategory] = createSignal("Todo");

  return (
    <MobileShell>
      <Title>Stoop — Home</Title>
      <div class="flex h-full flex-col">
        <main class="flex-1 overflow-y-auto">
          {/* Header */}
          <div class="flex items-center justify-between px-5 pt-14 pb-4">
            <div>
              <p class="mb-1 text-[11px] tracking-wider text-muted uppercase">
                <span class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lime" />
                Bedford-Stuyvesant
              </p>
              <h1 class="font-display text-[34px] leading-none tracking-tight">
                The stoop<span class="text-lime">.</span>
              </h1>
            </div>
            <button class="flex h-10 w-10 items-center justify-center rounded-full bg-card">
              <BellIcon />
            </button>
          </div>

          {/* Search pill — rounded-lg = 16px per design system */}
          <div class="px-5 pb-5">
            <div class="flex h-12 items-center gap-3 rounded-lg bg-card px-4">
              <SearchIcon />
              <span class="text-sm text-muted">Busca en tu barrio…</span>
            </div>
          </div>

          {/* Category chips */}
          <div class="flex gap-2 overflow-x-auto px-5 pb-6">
            <For each={CATEGORIES}>
              {(cat) => (
                <button
                  onClick={() => setSelectedCategory(cat)}
                  class="shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors"
                  classList={{
                    "bg-lime text-ink": selectedCategory() === cat,
                    "border border-hairline text-cream": selectedCategory() !== cat,
                  }}
                >
                  {cat}
                </button>
              )}
            </For>
          </div>

          {/* Recién publicados — strip horizontal
              overflow-x-auto: scroll nativo del browser, sin librería.
              Los items tienen ancho fijo (w-[170px]) con shrink-0 para
              que no colapsen al hacer wrap. El mismo <For> que el grid
              vertical — el layout lo define CSS, no el componente. */}
          <div class="flex items-baseline justify-between px-5 pb-3">
            <h2 class="font-display text-[22px] tracking-tight">Recién publicados</h2>
            <span class="text-xs text-muted">Ver todos →</span>
          </div>
          <div class="flex gap-3 overflow-x-auto px-5 pb-7">
            <For each={FEATURED}>
              {(item) => (
                <a href={`/item/${item.id}`} class="block w-[170px] shrink-0">
                  <div
                    class="mb-2 rounded-xl"
                    style={{ height: "180px", background: `oklch(0.35 0.06 ${item.hue})` }}
                  />
                  <p class="mb-0.5 text-[14px] leading-tight font-medium">{item.title}</p>
                  <div class="flex justify-between text-[12px]">
                    <span class="font-semibold text-lime">${item.price}</span>
                    <span class="text-muted">{item.distance}</span>
                  </div>
                </a>
              )}
            </For>
          </div>

          {/* De tus vecinos — section title */}
          <div class="px-5 pb-3">
            <h2 class="font-display text-[22px] tracking-tight">De tus vecinos</h2>
          </div>

          {/* De tus vecinos — grid 2 columnas con alturas variables.
              Alturas distintas por ítem (del diseño: h × 0.8) añaden
              ritmo visual sin romper el grid. El valor viene del dato,
              no de CSS fijo, para que cuando conectemos Supabase cada
              ítem pueda tener su propia proporción de foto. */}
          <div class="grid grid-cols-2 gap-3 px-5 pb-8">
            <For each={LISTINGS}>
              {(item) => (
                <a href={`/item/${item.id}`} class="block">
                  <div
                    class="mb-2 rounded-xl"
                    style={{
                      height: `${item.imgHeight}px`,
                      background: `oklch(0.35 0.06 ${item.hue})`,
                    }}
                  />
                  <p class="mb-0.5 text-[13px] leading-tight font-medium">{item.title}</p>
                  <div class="flex justify-between text-[11px]">
                    <span class="font-semibold text-lime">${item.price}</span>
                    <span class="text-muted">{item.distance}</span>
                  </div>
                </a>
              )}
            </For>
          </div>
        </main>

        <TabBar active="home" />
      </div>
    </MobileShell>
  );
};

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,240,0.6)" stroke-width="1.8">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export default Home;
