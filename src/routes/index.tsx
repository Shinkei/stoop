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
  - Acceso a señales: selectedCategory() con paréntesis (es una función).
    En React sería solo `selectedCategory`.

  TODO: Conectar con Supabase
  - Reemplazar `mockListings` con createAsync(() => getListings())
  - createAsync es el equivalente a useQuery/fetch en SolidStart
*/

const CATEGORIES = ["Todo", "Muebles", "Ropa", "Libros", "Cocina", "Niños"] as const;

const mockListings = [
  { id: "1", title: "Mesa lateral de nogal", price: 45, distance: "2 cuadras", hue: 40 },
  { id: "2", title: "Chaqueta denim Levi's", price: 28, distance: "5 cuadras", hue: 220 },
  { id: "3", title: "Set Pyrex vintage", price: 34, distance: "0.3 km", hue: 180 },
  { id: "4", title: "Silla estilo Eames", price: 120, distance: "1 cuadra", hue: 30 },
  { id: "5", title: "Colección de vinilos (28)", price: 85, distance: "0.5 km", hue: 280 },
  { id: "6", title: "Bolso Filson", price: 60, distance: "3 cuadras", hue: 80 },
];

const Home: Component = () => {
  const [selectedCategory, setSelectedCategory] = createSignal("Todo");

  return (
    <MobileShell>
      <Title>Stoop — Home</Title>
      <div class="flex h-full flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto pb-24">
          {/* Header */}
          <div class="px-5 pt-14 pb-4">
            <p class="mb-1 text-[11px] tracking-wider text-stoop-muted uppercase">
              <span class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-stoop-lime" />
              Bedford-Stuyvesant
            </p>
            <h1 class="font-display text-[34px] leading-none tracking-tight">
              The stoop<span class="text-stoop-lime">.</span>
            </h1>
          </div>

          {/* Search pill */}
          <div class="px-5 pb-5">
            <div class="flex h-12 items-center gap-3 rounded-2xl bg-stoop-card px-4">
              <SearchIcon />
              <span class="text-sm text-stoop-muted">Busca en tu barrio…</span>
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
                    "bg-stoop-lime text-stoop-bg": selectedCategory() === cat,
                    "border border-white/15 text-stoop-cream": selectedCategory() !== cat,
                  }}
                >
                  {cat}
                </button>
              )}
            </For>
          </div>

          {/* Section title */}
          <div class="flex items-baseline justify-between px-5 pb-3">
            <h2 class="font-display text-[22px] tracking-tight">Recién publicados</h2>
            <span class="text-xs text-stoop-muted">Ver todos →</span>
          </div>

          {/* Grid */}
          <div class="grid grid-cols-2 gap-3 px-5">
            <For each={mockListings}>
              {(item) => (
                <a href={`/item/${item.id}`} class="block">
                  <div
                    class="mb-2 rounded-xl"
                    style={{
                      height: "140px",
                      background: `oklch(0.35 0.06 ${item.hue})`,
                    }}
                  />
                  <p class="mb-0.5 text-[13px] leading-tight font-medium">{item.title}</p>
                  <div class="flex justify-between text-[11px]">
                    <span class="font-semibold text-stoop-lime">${item.price}</span>
                    <span class="text-stoop-muted">{item.distance}</span>
                  </div>
                </a>
              )}
            </For>
          </div>
        </div>

        <TabBar active="home" />
      </div>
    </MobileShell>
  );
};

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(245,245,240,0.6)"
    stroke-width="1.8"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export default Home;
