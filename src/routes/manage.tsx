import { Title } from "@solidjs/meta";
import { createAsync, useNavigate } from "@solidjs/router";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  Show,
  Suspense,
} from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";
import { currentUser, isAuthenticated, isAuthLoading } from "~/lib/auth";
import { getMyListings, hueFromId, type ManagedListing } from "~/lib/listings";

/*
  Manage — /manage
  Dashboard del vendedor: stats, filtros y lista de publicaciones.

  Conceptos clave de SolidJS aquí:

  1. createAsync con dependencia de señal
     - getMyListings(currentUser()?.id) lee la señal de auth dentro del
       callback. Si el usuario cambia (login/logout), la query se vuelve
       a ejecutar automáticamente.

  2. Múltiples createMemo derivados de la misma fuente
     - filtered() depende de filter() y listings()
     - stats() depende de listings()
     - countOf() es función simple (no memo) porque la usa <For> en cada item
       y memo-ar por id sería más overhead que beneficio.

  3. Reduce dentro de createMemo
     - Un solo recorrido produce active/offers/earned. Más eficiente que
       3 filter().length por separado.

  4. Ofertas pendientes derivadas
     - Cada listing trae offers: [{id, status}] embebido. Contamos en cliente
       cuántas están en 'pending'. El backend hace el join, el cliente cuenta.

  5. Ruta protegida
     - Igual que /profile: createEffect detecta que la sesión cargó y no hay
       usuario, redirige a /login.
*/

type ItemStatus = "active" | "reserved" | "draft" | "sold";

const STATUS_LABEL: Record<ItemStatus, string> = {
  active: "ACTIVA",
  reserved: "RESERVADA",
  draft: "BORRADOR",
  sold: "VENDIDA",
};

type FilterId = "all" | ItemStatus;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "active", label: "Activas" },
  { id: "reserved", label: "Reservadas" },
  { id: "draft", label: "Borradores" },
  { id: "sold", label: "Vendidas" },
];

const Manage: Component = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = createSignal<FilterId>("all");

  createEffect(() => {
    if (!isAuthLoading() && !isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  });

  const listings = createAsync<ManagedListing[]>(
    () => getMyListings(currentUser()?.id),
    { initialValue: [] },
  );

  // Lista filtrada por status — recalcula cuando filter() o listings() cambia.
  const filtered = createMemo(() =>
    filter() === "all" ? listings() : listings().filter((it) => it.status === filter()),
  );

  const countOf = (id: FilterId) =>
    id === "all" ? listings().length : listings().filter((it) => it.status === id).length;

  // Stats agregadas — un solo recorrido sobre todos los listings.
  //   active:   cuántos activos
  //   offers:   ofertas pending sobre activos y reservados
  //   earned:   suma de precios de los vendidos
  const stats = createMemo(() =>
    listings().reduce(
      (acc, it) => {
        const pending = it.offers.filter((o) => o.status === "pending").length;
        if (it.status === "active") acc.active += 1;
        if (it.status === "active" || it.status === "reserved") acc.offers += pending;
        if (it.status === "sold") acc.earned += Number(it.price);
        return acc;
      },
      { active: 0, offers: 0, earned: 0 },
    ),
  );

  return (
    <MobileShell>
      <Title>Stoop — Mis publicaciones</Title>
      <div class="flex h-full flex-col">
        <main class="flex-1 overflow-y-auto">
          {/* Header */}
          <div class="px-5 pt-14 pb-5">
            <p class="mb-1 text-[11px] tracking-wider text-muted uppercase">
              Panel del vendedor
            </p>
            <h1 class="font-display text-[34px] leading-none tracking-tight">
              Tus publicaciones
            </h1>
          </div>

          <Suspense fallback={<ManageSkeleton />}>
            {/* Stats — derivadas con un único reduce */}
            <div class="grid grid-cols-3 gap-2 px-5 pb-5">
              <StatCard value={`${stats().active}`} label="Activas" />
              <StatCard value={`${stats().offers}`} label="Ofertas" accent />
              <StatCard value={`$${stats().earned}`} label="Ganado" />
            </div>

            {/* Filter pills */}
            <div class="flex gap-2 overflow-x-auto px-5 pb-4">
              <For each={FILTERS}>
                {(f) => (
                  <FilterPill
                    label={f.label}
                    count={countOf(f.id)}
                    active={filter() === f.id}
                    onClick={() => setFilter(f.id)}
                  />
                )}
              </For>
            </div>

            <Show when={filtered().length > 0} fallback={<EmptyList />}>
              <div class="px-5 pb-4">
                <For each={filtered()}>
                  {(item, i) => (
                    <ItemRow item={item} isLast={i() === filtered().length - 1} />
                  )}
                </For>
              </div>
            </Show>
          </Suspense>
        </main>

        <TabBar active="profile" />
      </div>
    </MobileShell>
  );
};

const StatCard: Component<{ value: string; label: string; accent?: boolean }> = (props) => (
  <div
    class="rounded-md p-3.5"
    classList={{
      "bg-lime text-ink": props.accent,
      "bg-card text-cream": !props.accent,
    }}
  >
    <p class="font-display text-[28px] leading-none tracking-tight">{props.value}</p>
    <p
      class="mt-1 text-[11px] tracking-wider uppercase"
      classList={{ "opacity-75": props.accent, "text-muted": !props.accent }}
    >
      {props.label}
    </p>
  </div>
);

const FilterPill: Component<{
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}> = (props) => (
  <button
    onClick={() => props.onClick()}
    class="shrink-0 rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors"
    classList={{
      "bg-cream text-ink": props.active,
      "border border-hairline text-cream": !props.active,
    }}
  >
    {props.label} ({props.count})
  </button>
);

const ItemRow: Component<{ item: ManagedListing; isLast: boolean }> = (props) => {
  const pending = () => props.item.offers.filter((o) => o.status === "pending").length;
  const status = () => props.item.status as ItemStatus;
  return (
    <a
      href={`/item/${props.item.id}`}
      class="flex gap-3 py-3.5"
      classList={{ "border-b border-hairline": !props.isLast }}
    >
      <div
        class="h-[72px] w-[72px] shrink-0 rounded-md bg-cover bg-center"
        style={{
          background: props.item.photos?.[0]
            ? `url(${props.item.photos[0]}) center/cover`
            : `oklch(0.45 0.08 ${hueFromId(props.item.id)})`,
        }}
      />
      <div class="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div class="mb-0.5 flex items-center justify-between gap-2">
            <p class="truncate text-sm font-medium">{props.item.title}</p>
            <StatusBadge status={status()} />
          </div>
          <p class="text-sm font-semibold text-lime">${formatPrice(props.item.price)}</p>
        </div>
        <div class="flex gap-3.5 text-[11px] text-muted">
          <span class="flex items-center gap-1">
            <EyeIcon />
            {props.item.views ?? 0}
          </span>
          <span
            class="flex items-center gap-1"
            classList={{ "font-semibold text-lime": pending() > 0 }}
          >
            <ChatIcon active={pending() > 0} />
            {pending()} oferta{pending() !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </a>
  );
};

const StatusBadge: Component<{ status: ItemStatus }> = (props) => (
  <span
    class="rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wider"
    classList={{
      "bg-[rgba(159,232,112,0.14)] text-lime": props.status === "active",
      "bg-[rgba(255,200,100,0.14)] text-warning": props.status === "reserved",
      "bg-white/10 text-muted": props.status === "draft" || props.status === "sold",
    }}
  >
    {STATUS_LABEL[props.status] ?? props.status.toUpperCase()}
  </span>
);

const ManageSkeleton: Component = () => (
  <div class="animate-pulse">
    <div class="grid grid-cols-3 gap-2 px-5 pb-5">
      <div class="h-20 rounded-md bg-card" />
      <div class="h-20 rounded-md bg-card" />
      <div class="h-20 rounded-md bg-card" />
    </div>
    <div class="space-y-3 px-5">
      <div class="h-20 rounded-md bg-card" />
      <div class="h-20 rounded-md bg-card" />
    </div>
  </div>
);

const EmptyList: Component = () => (
  <div class="flex flex-col items-center px-8 py-12 text-center">
    <p class="mb-2 text-sm text-cream">No tienes publicaciones aún</p>
    <p class="text-[12px] text-muted">Cuando publiques algo, aparecerá aquí.</p>
  </div>
);

const formatPrice = (price: number) => {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
};

const EyeIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ChatIcon: Component<{ active?: boolean }> = (props) => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke={props.active ? "var(--color-lime)" : "currentColor"}
    stroke-width="2"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
  </svg>
);

export default Manage;
