import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import { type Component, createSignal, For, Show, Suspense } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";
import { getListings, hueFromId, type ListingRow } from "~/lib/listings";

/*
  Home — Pantalla principal del marketplace.

  Conceptos clave de SolidJS aquí:

  - createAsync(fn): equivalente a useQuery/use(promise) en React. Devuelve una
    señal cuyo valor es undefined mientras carga, y el dato cuando resuelve.
    Se integra con <Suspense> para mostrar el fallback de loading sin booleanos.

  - <For>: equivalente a .map() en React, pero más eficiente — solo crea/destruye
    los nodos que entran o salen de la lista; los que se mantienen no se re-renderizan.

  - Acceso a señales: listings() con paréntesis (es una función getter, no un valor).

  Sobre la foto:
    El seed actual no tiene URLs de fotos (las subiremos con Storage cuando
    conectemos /sell). Mientras tanto, hueFromId(id) genera un color
    determinístico para el placeholder, así cada listing se ve distinto pero
    estable entre recargas.
*/

const CATEGORIES = ["Todo", "Muebles", "Ropa", "Libros", "Cocina", "Niños"] as const;

const Home: Component = () => {
  const [selectedCategory, setSelectedCategory] = createSignal("Todo");

  // createAsync se suscribe a cualquier señal que lea adentro:
  // selectedCategory() se lee en el callback, así que al cambiar de pestaña
  // la query se re-ejecuta sola contra Supabase con el nuevo filtro.
  // "Todo" es el caso sin filtro — getListings() ignora ese valor.
  const listings = createAsync<ListingRow[]>(
    () => getListings(selectedCategory()),
    { initialValue: [] },
  );

  // Featured = los 3 más recientes (los primeros del array ya está ordenado).
  const featured = () => listings().slice(0, 3);

  return (
    <MobileShell>
      <Title>Stoop — Home</Title>
      <div class="flex h-full flex-col">
        <main class="flex-1 overflow-y-auto">
          {/* Header */}
          <div class="flex items-center justify-between px-5 pt-14 pb-4 md:px-6 md:pt-8">
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

          {/* Search pill */}
          <A href="/search" class="block px-5 pb-5 md:px-6">
            <div class="flex h-12 items-center gap-3 rounded-lg bg-card px-4 md:max-w-xl">
              <SearchIcon />
              <span class="text-sm text-muted">Busca en tu barrio…</span>
            </div>
          </A>

          {/* Category chips */}
          <div class="flex gap-2 overflow-x-auto px-5 pb-6 md:px-6">
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

          <Suspense fallback={<FeedSkeleton />}>
            <Show when={listings().length > 0} fallback={<EmptyFeed />}>
              {/* Recién publicados */}
              <div class="flex items-baseline justify-between px-5 pb-3 md:px-6">
                <h2 class="font-display text-[22px] tracking-tight">Recién publicados</h2>
                <span class="text-xs text-muted">Ver todos →</span>
              </div>
              <div class="flex gap-3 overflow-x-auto px-5 pb-7 md:px-6">
                <For each={featured()}>{(item) => <FeaturedCard item={item} />}</For>
              </div>

              {/* De tus vecinos — grid responsive (2/3/4 columnas) */}
              <div class="px-5 pb-3 md:px-6">
                <h2 class="font-display text-[22px] tracking-tight">De tus vecinos</h2>
              </div>
              <div class="grid grid-cols-2 gap-3 px-5 pb-8 md:grid-cols-3 md:px-6 lg:grid-cols-4">
                <For each={listings()}>{(item) => <FeedCard item={item} />}</For>
              </div>
            </Show>
          </Suspense>
        </main>

        <TabBar active="home" />
      </div>
    </MobileShell>
  );
};

// ── Cards ────────────────────────────────────────────────────────

const FeaturedCard: Component<{ item: ListingRow }> = (props) => (
  <A href={`/item/${props.item.id}`} class="block w-[170px] shrink-0">
    <Thumb id={props.item.id} photo={props.item.photos?.[0]} height={180} />
    <p class="mt-2 mb-0.5 text-[14px] leading-tight font-medium">{props.item.title}</p>
    <div class="flex justify-between text-[12px]">
      <span class="font-semibold text-lime">${formatPrice(props.item.price)}</span>
      <span class="truncate text-muted">{props.item.neighborhood}</span>
    </div>
  </A>
);

const FeedCard: Component<{ item: ListingRow }> = (props) => {
  // Altura derivada del id — varía entre 128 y 188 sin parecer aleatoria.
  const height = () => 128 + (hueFromId(props.item.id) % 60);
  return (
    <A href={`/item/${props.item.id}`} class="block">
      <Thumb id={props.item.id} photo={props.item.photos?.[0]} height={height()} />
      <p class="mt-2 mb-0.5 text-[13px] leading-tight font-medium">{props.item.title}</p>
      <div class="flex justify-between text-[11px]">
        <span class="font-semibold text-lime">${formatPrice(props.item.price)}</span>
        <span class="truncate text-muted">{props.item.neighborhood}</span>
      </div>
    </A>
  );
};

const Thumb: Component<{ id: string; photo: string | undefined; height: number }> = (props) => (
  <div
    class="rounded-xl bg-cover bg-center"
    style={{
      height: `${props.height}px`,
      background: props.photo
        ? `url(${props.photo}) center/cover`
        : `oklch(0.35 0.06 ${hueFromId(props.id)})`,
    }}
  />
);

// ── States ───────────────────────────────────────────────────────

const FeedSkeleton: Component = () => (
  <div class="grid grid-cols-2 gap-3 px-5 pb-8 md:grid-cols-3 md:px-6 lg:grid-cols-4">
    <For each={[1, 2, 3, 4, 5, 6, 7, 8]}>
      {() => (
        <div class="animate-pulse">
          <div class="mb-2 h-40 rounded-xl bg-card" />
          <div class="mb-1 h-3 w-3/4 rounded-md bg-card" />
          <div class="h-3 w-1/3 rounded-md bg-card" />
        </div>
      )}
    </For>
  </div>
);

const EmptyFeed: Component = () => (
  <div class="flex flex-col items-center px-8 py-12 text-center">
    <p class="mb-2 text-sm text-cream">Aún no hay publicaciones</p>
    <p class="text-[12px] text-muted">Sé el primero en compartir algo con tus vecinos.</p>
  </div>
);

// ── Helpers / Icons ──────────────────────────────────────────────

const formatPrice = (price: number) => {
  // DB devuelve numeric como string; aseguramos number sin decimales para precios enteros.
  const n = typeof price === "string" ? parseFloat(price) : price;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
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
