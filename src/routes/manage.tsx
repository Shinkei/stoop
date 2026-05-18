import { Title } from "@solidjs/meta";
import { type Component, For } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Manage — /manage
  Dashboard del vendedor: stats, filtros y lista de publicaciones.

  Esta es la base estática (filtro "Todas" activo, stats hardcoded).
  Los filtros reactivos y las stats derivadas llegan en los commits
  siguientes.

  TODO: Conectar con Supabase
  - supabase.from("listings").select("*, offers(count)").eq("seller_id", user.id)
  - Acciones inline: editar, marcar vendido, eliminar (mutaciones con
    "use server")
*/

type ItemStatus = "active" | "reserved" | "draft" | "sold";

type ManagedItem = {
  id: string;
  title: string;
  price: number;
  views: number;
  offers: number;
  status: ItemStatus;
  hue: number;
};

const ITEMS: ManagedItem[] = [
  { id: "m1", title: "Mesa lateral de nogal",   price: 45,  views: 124, offers: 3, status: "active",   hue: 40 },
  { id: "m2", title: "Chaqueta denim Levi's",   price: 28,  views: 67,  offers: 1, status: "active",   hue: 220 },
  { id: "m3", title: "Set Pyrex vintage",       price: 34,  views: 210, offers: 5, status: "reserved", hue: 180 },
  { id: "m4", title: "Colección de vinilos",    price: 85,  views: 89,  offers: 2, status: "active",   hue: 280 },
  { id: "m5", title: "Silla mid-century",       price: 120, views: 56,  offers: 4, status: "active",   hue: 30 },
  { id: "m6", title: "Bolso Filson",            price: 60,  views: 42,  offers: 0, status: "active",   hue: 80 },
  { id: "m7", title: "Lámpara de pie",          price: 35,  views: 0,   offers: 0, status: "draft",    hue: 100 },
  { id: "m8", title: "Plantas suculentas",      price: 25,  views: 89,  offers: 0, status: "sold",     hue: 140 },
];

const STATUS_LABEL: Record<ItemStatus, string> = {
  active: "ACTIVA",
  reserved: "RESERVADA",
  draft: "BORRADOR",
  sold: "VENDIDA",
};

const Manage: Component = () => {
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

          {/* Stats */}
          <div class="grid grid-cols-3 gap-2 px-5 pb-5">
            <StatCard value="5" label="Activas" />
            <StatCard value="15" label="Ofertas" accent />
            <StatCard value="$25" label="Ganado" />
          </div>

          {/* Filter pills */}
          <div class="flex gap-2 overflow-x-auto px-5 pb-4">
            <FilterPill label="Todas" count={8} active />
            <FilterPill label="Activas" count={5} />
            <FilterPill label="Reservadas" count={1} />
            <FilterPill label="Borradores" count={1} />
            <FilterPill label="Vendidas" count={1} />
          </div>

          {/* List */}
          <div class="px-5 pb-4">
            <For each={ITEMS}>
              {(item, i) => (
                <ItemRow item={item} isLast={i() === ITEMS.length - 1} />
              )}
            </For>
          </div>
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

const FilterPill: Component<{ label: string; count: number; active?: boolean }> = (props) => (
  <button
    class="shrink-0 rounded-pill px-3 py-1.5 text-[12px] font-medium"
    classList={{
      "bg-cream text-ink": props.active,
      "border border-hairline text-cream": !props.active,
    }}
  >
    {props.label} ({props.count})
  </button>
);

const ItemRow: Component<{ item: ManagedItem; isLast: boolean }> = (props) => (
  <div
    class="flex gap-3 py-3.5"
    classList={{ "border-b border-hairline": !props.isLast }}
  >
    <div
      class="h-[72px] w-[72px] shrink-0 rounded-md"
      style={{ background: `oklch(0.45 0.08 ${props.item.hue})` }}
    />
    <div class="flex min-w-0 flex-1 flex-col justify-between">
      <div>
        <div class="mb-0.5 flex items-center justify-between gap-2">
          <p class="truncate text-sm font-medium">{props.item.title}</p>
          <StatusBadge status={props.item.status} />
        </div>
        <p class="text-sm font-semibold text-lime">${props.item.price}</p>
      </div>
      <div class="flex gap-3.5 text-[11px] text-muted">
        <span class="flex items-center gap-1">
          <EyeIcon />
          {props.item.views}
        </span>
        <span
          class="flex items-center gap-1"
          classList={{ "font-semibold text-lime": props.item.offers > 0 }}
        >
          <ChatIcon active={props.item.offers > 0} />
          {props.item.offers} oferta{props.item.offers !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  </div>
);

const StatusBadge: Component<{ status: ItemStatus }> = (props) => (
  <span
    class="rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-wider"
    classList={{
      "bg-[rgba(159,232,112,0.14)] text-lime": props.status === "active",
      "bg-[rgba(255,200,100,0.14)] text-warning": props.status === "reserved",
      "bg-white/10 text-muted": props.status === "draft" || props.status === "sold",
    }}
  >
    {STATUS_LABEL[props.status]}
  </span>
);

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
