import { Title } from "@solidjs/meta";
import { A, createAsync } from "@solidjs/router";
import {
  type Component,
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  Suspense,
} from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";
import { hueFromId, type ListingRow, searchListings } from "~/lib/listings";

/*
  Search — /search

  Nuevos conceptos de SolidJS que aparecen aquí:

  1. Controlled input (input controlado)
     - value={query()} y onInput={(e) => setQuery(...)} conectan el
       <input> a la señal en ambas direcciones.
     - Solid usa onInput, NO onChange.

  2. Debounce con createEffect + setTimeout
     - El usuario escribe rápido; cada keystroke actualiza query() pero
       no queremos hacer 1 request por tecla.
     - createEffect rastrea query(); arrancamos un timer y solo cuando
       pasa el delay sin más cambios escribimos en debouncedQuery().
     - onCleanup limpia el timer anterior cuando query() vuelve a cambiar.
     - createAsync se suscribe a debouncedQuery() — solo re-fetcha cuando
       el valor estable cambia.

  3. createAsync con dependencia reactiva
     - searchListings(debounced()) lee la señal adentro; cualquier cambio
       re-ejecuta la query y suspende el árbol envuelto en <Suspense>.

  4. onMount + createEffect para localStorage
     - onMount: corre UNA vez cuando el componente se monta, en cliente.
     - createEffect: corre cuando alguna señal que lee cambia. Persiste
       recents() en localStorage sin manejo manual.
*/

const STORAGE_KEY = "stoop:recent-searches";

const INITIAL_RECENTS = [
  "silla mid-century",
  "sartén de hierro",
  "monstera",
  "bici de niño",
];

type Category = { name: string; hue: number };

const CATEGORIES: Category[] = [
  { name: "Muebles", hue: 40 },
  { name: "Ropa", hue: 340 },
  { name: "Libros", hue: 80 },
  { name: "Cocina", hue: 200 },
  { name: "Niños", hue: 300 },
  { name: "Electrónica", hue: 220 },
  { name: "Jardín", hue: 140 },
  { name: "Arte", hue: 20 },
];

const Search: Component = () => {
  const [query, setQuery] = createSignal("");
  const [debounced, setDebounced] = createSignal("");
  const [recents, setRecents] = createSignal<string[]>(INITIAL_RECENTS);

  // Hidratar desde localStorage al montar (cliente only).
  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecents(JSON.parse(stored));
      } catch {
        // JSON inválido: ignorar y mantener defaults.
      }
    }
  });

  // Persistir en localStorage cada vez que recents() cambia.
  createEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents()));
  });

  // Debounce: 250ms tras el último keystroke se considera "estable".
  createEffect(() => {
    const v = query();
    const t = setTimeout(() => setDebounced(v), 250);
    onCleanup(() => clearTimeout(t));
  });

  const trimmed = () => debounced().trim();
  const hasQuery = () => trimmed().length > 0;

  const results = createAsync<ListingRow[]>(() => searchListings(trimmed()), {
    initialValue: [],
  });

  // Click en un chip: rellena el input y mueve el término al frente.
  const useRecent = (term: string) => {
    setQuery(term);
    setRecents((prev) => [term, ...prev.filter((t) => t !== term)]);
  };

  // Cuando el usuario lanza una búsqueda con texto válido, la promovemos
  // a recents al primer resultado estable. Lo metemos en un effect para
  // que se dispare cuando trimmed() cambia.
  createEffect(() => {
    const t = trimmed();
    if (t.length >= 2) {
      setRecents((prev) => [t, ...prev.filter((r) => r !== t)].slice(0, 8));
    }
  });

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

          <Show
            when={hasQuery()}
            fallback={
              <>
                <Show when={recents().length > 0}>
                  <section class="px-5 pb-6">
                    <div class="mb-3 flex items-baseline justify-between">
                      <p class="text-[11px] font-semibold tracking-wider text-muted uppercase">
                        Recientes
                      </p>
                      <button onClick={() => setRecents([])} class="text-[11px] text-muted">
                        Borrar
                      </button>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <For each={recents()}>
                        {(term) => (
                          <button
                            onClick={() => useRecent(term)}
                            class="flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-[13px] text-cream"
                          >
                            <ClockIcon />
                            {term}
                          </button>
                        )}
                      </For>
                    </div>
                  </section>
                </Show>

                {/* Categorías */}
                <section class="px-5 pb-4">
                  <p class="mb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
                    Explora por categoría
                  </p>
                  <div class="grid grid-cols-2 gap-2.5">
                    <For each={CATEGORIES}>
                      {(cat) => (
                        <button
                          onClick={() => setQuery(cat.name)}
                          class="relative h-[100px] overflow-hidden rounded-md text-left"
                        >
                          <div
                            class="absolute inset-0"
                            style={{ background: `oklch(0.45 0.08 ${cat.hue})` }}
                          />
                          <div class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/85 to-ink/10 px-3 py-2.5">
                            <p class="text-sm font-semibold text-cream">{cat.name}</p>
                          </div>
                        </button>
                      )}
                    </For>
                  </div>
                </section>
              </>
            }
          >
            <Suspense fallback={<ResultsSkeleton />}>
              <Show when={results().length > 0} fallback={<EmptyResults query={trimmed()} />}>
                <p class="px-5 pt-2 pb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  {results().length} resultado{results().length === 1 ? "" : "s"}
                </p>
                <div class="grid grid-cols-2 gap-3 px-5 pb-8">
                  <For each={results()}>{(item) => <ResultCard item={item} />}</For>
                </div>
              </Show>
            </Suspense>
          </Show>
        </main>

        <TabBar active="search" />
      </div>
    </MobileShell>
  );
};

const ResultCard: Component<{ item: ListingRow }> = (props) => (
  <A href={`/item/${props.item.id}`} class="block">
    <div
      class="mb-2 h-36 rounded-xl bg-cover bg-center"
      style={{
        background: props.item.photos?.[0]
          ? `url(${props.item.photos[0]}) center/cover`
          : `oklch(0.45 0.08 ${hueFromId(props.item.id)})`,
      }}
    />
    <p class="mb-0.5 text-[13px] leading-tight font-medium">{props.item.title}</p>
    <div class="flex justify-between text-[11px]">
      <span class="font-semibold text-lime">${formatPrice(props.item.price)}</span>
      <span class="truncate text-muted">{props.item.neighborhood}</span>
    </div>
  </A>
);

const ResultsSkeleton: Component = () => (
  <div class="grid grid-cols-2 gap-3 px-5 pt-2 pb-8">
    <For each={[1, 2, 3, 4]}>
      {() => (
        <div class="animate-pulse">
          <div class="mb-2 h-36 rounded-xl bg-card" />
          <div class="mb-1 h-3 w-3/4 rounded-md bg-card" />
          <div class="h-3 w-1/3 rounded-md bg-card" />
        </div>
      )}
    </For>
  </div>
);

const EmptyResults: Component<{ query: string }> = (props) => (
  <div class="flex flex-col items-center px-8 py-12 text-center">
    <p class="mb-2 text-sm text-cream">Sin resultados para "{props.query}"</p>
    <p class="text-[12px] text-muted">Prueba con otra palabra o categoría.</p>
  </div>
);

const formatPrice = (price: number) => {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
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
