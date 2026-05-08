import { Title } from "@solidjs/meta";
import { A, createAsync, useParams } from "@solidjs/router";
import { type Component, createMemo, createSignal, For, Show, Suspense } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";

/*
  Item Detail — /item/:id

  Nuevos conceptos de SolidJS que aparecen aquí:

  1. createAsync(fn)
     - Equivalente a useQuery (React Query) o use(promise) de React 19.
     - fn recibe params.id como dependencia reactiva: si navegas entre
       ítems sin recargar la página, la fetch se re-ejecuta automáticamente.
     - Devuelve una señal: item() === undefined mientras carga, dato después.
     - Se integra con <Suspense> sin ningún booleano `isLoading` manual.

  2. <Suspense fallback={...}>
     - Idéntico a React. createAsync "suspende" automáticamente hasta que
       el Promise resuelve, mostrando el fallback en ese intervalo.

  3. createMemo(fn)
     - Valor derivado memoizado. Equivalente a useMemo pero sin array de deps:
       Solid rastrea las dependencias automáticamente al ejecutar fn.
     - Se recalcula solo cuando item() o photoIndex() cambian (sus deps reales).

  4. <Show when={val()}>{(v) => ...}</Show>  — accessor pattern
     - El children como función recibe v: () => NonNullable<T>.
     - Estrecha el tipo (elimina undefined/null) sin casting manual.
     - El bloque solo se re-evalúa cuando val() pasa de falsy a truthy,
       no ante cualquier otra señal. Más eficiente que el children JSX directo.

  5. <For each={arr}>{(item, index) => ...}</For>  — index es () => number
     - A diferencia de React (.map con key), index es un getter reactivo.
     - Llámalo como index() dentro del callback.
*/

type Listing = {
  id: string;
  title: string;
  price: number;
  original_price: number;
  condition: string;
  category: string;
  description: string;
  neighborhood: string;
  accepts_offers: boolean;
  hues: number[];
  seller: {
    full_name: string;
    rating: number;
    total_sold: number;
    reply_time_minutes: number;
  };
};

const MOCK_LISTINGS: Record<string, Listing> = {
  "1": {
    id: "1",
    title: "Mesa lateral de nogal",
    price: 45,
    original_price: 120,
    condition: "Buen estado",
    category: "Muebles",
    description:
      "Mesa lateral de nogal macizo, circa 1970. Pequeña mancha en la parte inferior que no se ve cuando está en uso. Perfecta para sala de estar o dormitorio.",
    neighborhood: "Bedford-Stuyvesant",
    accepts_offers: true,
    hues: [40, 45, 35],
    seller: { full_name: "María B.", rating: 4.8, total_sold: 23, reply_time_minutes: 12 },
  },
  "2": {
    id: "2",
    title: "Chaqueta denim Levi's",
    price: 28,
    original_price: 89,
    condition: "Como nuevo",
    category: "Ropa",
    description:
      "Levi's 501 vintage, talla M. Pocas veces usada, sin desgaste visible. El color añil es intenso y uniforme.",
    neighborhood: "Crown Heights",
    accepts_offers: false,
    hues: [220, 225, 215],
    seller: { full_name: "Carlos M.", rating: 5.0, total_sold: 8, reply_time_minutes: 5 },
  },
  "3": {
    id: "3",
    title: "Set Pyrex vintage",
    price: 34,
    original_price: 0,
    condition: "Usado",
    category: "Cocina",
    description:
      "Set de 4 fuentes Pyrex de los 70s con estampado turquesa. Ligeras marcas de uso, completamente funcionales.",
    neighborhood: "Park Slope",
    accepts_offers: true,
    hues: [180, 175, 185],
    seller: { full_name: "Laura T.", rating: 4.6, total_sold: 41, reply_time_minutes: 30 },
  },
  "4": {
    id: "4",
    title: "Silla estilo Eames",
    price: 120,
    original_price: 350,
    condition: "Buen estado",
    category: "Muebles",
    description:
      "Réplica de alta calidad de la Eames DSW. La pata delantera derecha tiene una pequeña reparación invisible cuando está sentado.",
    neighborhood: "Williamsburg",
    accepts_offers: true,
    hues: [30, 35, 25],
    seller: { full_name: "Alex R.", rating: 4.9, total_sold: 15, reply_time_minutes: 20 },
  },
  "5": {
    id: "5",
    title: "Colección de vinilos (28)",
    price: 85,
    original_price: 0,
    condition: "Varios",
    category: "Entretenimiento",
    description:
      "28 vinilos de jazz, soul y funk de los 60s–80s. Incluye: Miles Davis, James Brown, Aretha Franklin. Fundas en buen estado.",
    neighborhood: "Bushwick",
    accepts_offers: true,
    hues: [280, 285, 275],
    seller: { full_name: "Diego F.", rating: 4.7, total_sold: 62, reply_time_minutes: 45 },
  },
  "6": {
    id: "6",
    title: "Bolso Filson",
    price: 60,
    original_price: 220,
    condition: "Buen estado",
    category: "Ropa",
    description:
      "Filson Original Briefcase en canvas verde oliva. Uso frecuente pero cuero sin grietas y cierre perfecto.",
    neighborhood: "DUMBO",
    accepts_offers: false,
    hues: [80, 85, 75],
    seller: { full_name: "Sarah K.", rating: 4.9, total_sold: 7, reply_time_minutes: 10 },
  },
};

async function getListing(id: string): Promise<Listing | null> {
  // Con Supabase sería:
  // const { data } = await supabase
  //   .from("listings")
  //   .select("*, seller:profiles(*)")
  //   .eq("id", id)
  //   .single();
  // return data;
  return MOCK_LISTINGS[id] ?? null;
}

const ItemDetail: Component = () => {
  const params = useParams();

  // params.id es reactivo: si navegas a otro ítem, getListing se re-ejecuta.
  // params.id puede ser undefined en el tipo, pero la ruta /item/:id lo garantiza.
  const item = createAsync(() => getListing(params.id ?? ""));

  const [photoIndex, setPhotoIndex] = createSignal(0);

  // Deps rastreadas automáticamente: item() y photoIndex().
  const currentHue = createMemo(() => item()?.hues[photoIndex()] ?? 40);

  return (
    <MobileShell>
      <Title>Stoop — {item()?.title ?? "Item"}</Title>
      <div class="flex h-full flex-col">
        <Suspense fallback={<ItemSkeleton />}>
          <Show when={item()} fallback={<NotFound />}>
            {(listing) => (
              <>
                {/* Área de foto */}
                <div class="relative shrink-0">
                  <div
                    class="w-full transition-colors duration-300"
                    style={{
                      height: "300px",
                      background: `oklch(0.35 0.06 ${currentHue()})`,
                    }}
                  />

                  {/* Botón atrás */}
                  <A
                    href="/"
                    class="absolute top-12 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                  >
                    <BackIcon />
                  </A>

                  {/* Badge barrio */}
                  <div class="absolute top-12 right-4 rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-cream backdrop-blur-sm">
                    {listing().neighborhood}
                  </div>

                  {/* Dots de fotos — index es () => number en <For> */}
                  <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    <For each={listing().hues}>
                      {(_hue, i) => (
                        <button
                          onClick={() => setPhotoIndex(i())}
                          class="h-1.5 rounded-full transition-all"
                          classList={{
                            "w-4 bg-cream": photoIndex() === i(),
                            "w-1.5 bg-cream/40": photoIndex() !== i(),
                          }}
                        />
                      )}
                    </For>
                  </div>
                </div>

                {/* Contenido scrollable */}
                <div class="flex-1 overflow-y-auto">
                  <div class="px-5 pt-5 pb-6">
                    {/* Precio + título */}
                    <div class="mb-1 flex items-baseline justify-between">
                      <span class="font-display text-3xl text-lime">
                        ${listing().price}
                      </span>
                      <Show when={listing().original_price > 0}>
                        <span class="text-sm text-muted line-through">
                          ${listing().original_price}
                        </span>
                      </Show>
                    </div>
                    <h1 class="mb-1 font-display text-2xl leading-tight">{listing().title}</h1>
                    <p class="mb-5 text-[13px] text-muted">{listing().category}</p>

                    {/* Vendedor */}
                    <div class="mb-5 flex items-center gap-3 rounded-2xl bg-card p-4">
                      <div
                        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-ink"
                        style={{ background: `oklch(0.75 0.14 ${currentHue()})` }}
                      >
                        {listing().seller.full_name[0]}
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold leading-tight">
                          {listing().seller.full_name}
                        </p>
                        <p class="text-[11px] text-muted">
                          ★ {listing().seller.rating} · {listing().seller.total_sold} vendidos
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="text-[11px] text-muted">Responde en</p>
                        <p class="text-xs font-semibold text-lime">
                          ~{listing().seller.reply_time_minutes} min
                        </p>
                      </div>
                    </div>

                    {/* Chips de estado */}
                    <div class="mb-5 flex flex-wrap gap-2">
                      <span class="rounded-full border border-white/15 px-3 py-1 text-xs">
                        {listing().condition}
                      </span>
                      <Show when={listing().accepts_offers}>
                        <span class="rounded-full bg-accent-soft px-3 py-1 text-xs text-lime">
                          Acepta ofertas
                        </span>
                      </Show>
                    </div>

                    {/* Descripción */}
                    <p class="text-[14px] leading-relaxed text-cream/80">
                      {listing().description}
                    </p>
                  </div>
                </div>

                {/* CTAs sticky */}
                <div class="flex shrink-0 gap-3 border-t border-hairline bg-ink px-5 py-4 pb-8">
                  <Show when={listing().accepts_offers}>
                    <button class="flex-1 rounded-2xl border border-faint py-3.5 text-sm font-semibold transition-opacity active:opacity-70">
                      Hacer oferta
                    </button>
                  </Show>
                  <button
                    class="rounded-2xl bg-lime py-3.5 text-sm font-bold text-ink transition-opacity active:opacity-70"
                    classList={{
                      "flex-1": !listing().accepts_offers,
                      "w-40": listing().accepts_offers,
                    }}
                  >
                    Comprar · ${listing().price}
                  </button>
                </div>
              </>
            )}
          </Show>
        </Suspense>
      </div>
    </MobileShell>
  );
};

const ItemSkeleton: Component = () => (
  <div class="animate-pulse">
    <div class="h-[300px] w-full bg-card" />
    <div class="px-5 pt-5 space-y-3">
      <div class="h-8 w-20 rounded-xl bg-card" />
      <div class="h-6 w-3/4 rounded-xl bg-card" />
      <div class="h-4 w-1/3 rounded-xl bg-card" />
    </div>
  </div>
);

const NotFound: Component = () => (
  <div class="flex flex-1 flex-col items-center justify-center gap-3 text-muted">
    <p class="text-sm">Item no encontrado</p>
    <A href="/" class="text-xs text-lime">
      ← Volver al inicio
    </A>
  </div>
);

const BackIcon: Component = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

export default ItemDetail;
