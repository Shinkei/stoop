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
import {
  getInbox,
  type OfferWithRels,
  setOfferStatus,
} from "~/lib/offers";

/*
  Offers Inbox — /offers

  Conceptos clave de SolidJS aquí:

  1. createAsync con dependencia de señal
     - getInbox(currentUser()?.id) re-corre si la sesión cambia.

  2. createMemo para listas derivadas
     - filtered() depende de tab() e inbox(). Solo recalcula cuando alguna
       de las dos cambia. <For> recibe la lista filtrada.

  3. Categorización en cliente
     - El inbox trae TODAS las ofertas en las que el usuario está involucrado
       (RLS lo garantiza). El campo `listing.seller_id` distingue si soy
       seller (recibida) o buyer (enviada). El status === "accepted" va a
       su propia pestaña independientemente del lado.

  4. Mutación + revalidate
     - setOfferStatus() en lib/offers.ts llama a revalidate(getInbox.key)
       internamente, así que el inbox se re-fetch solo después de aceptar
       o rechazar. La UI se actualiza sin manejo manual.
*/

type TabId = "incoming" | "sent" | "accepted";

const TABS: { id: TabId; label: string }[] = [
  { id: "incoming", label: "Recibidas" },
  { id: "sent", label: "Enviadas" },
  { id: "accepted", label: "Aceptadas" },
];

const Offers: Component = () => {
  const navigate = useNavigate();
  const [tab, setTab] = createSignal<TabId>("incoming");
  const [pendingId, setPendingId] = createSignal<string | null>(null);

  createEffect(() => {
    if (!isAuthLoading() && !isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  });

  const inbox = createAsync<OfferWithRels[]>(() => getInbox(currentUser()?.id), {
    initialValue: [],
  });

  const userId = () => currentUser()?.id;

  // Predicate por pestaña. Centralizado para que count y filter coincidan.
  const inTab = (o: OfferWithRels, t: TabId) => {
    const uid = userId();
    if (!uid) return false;
    if (t === "accepted") return o.status === "accepted";
    if (o.status !== "pending") return false;
    if (t === "incoming") return o.listing.seller_id === uid;
    return o.buyer_id === uid; // sent
  };

  const filtered = createMemo(() => inbox().filter((o) => inTab(o, tab())));
  const countOf = (t: TabId) => inbox().filter((o) => inTab(o, t)).length;

  // Mejor oferta pendiente: la incoming con mayor ratio amount/listing.price.
  const bestOffer = createMemo(() => {
    if (tab() !== "incoming") return undefined;
    return [...inbox().filter((o) => inTab(o, "incoming"))].sort(
      (a, b) => b.amount / Number(b.listing.price) - a.amount / Number(a.listing.price),
    )[0];
  });

  const respond = async (offerId: string, status: "accepted" | "rejected") => {
    setPendingId(offerId);
    try {
      await setOfferStatus(offerId, status);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <MobileShell>
      <Title>Stoop — Ofertas</Title>
      <div class="flex h-full flex-col">
        <main class="flex-1 overflow-y-auto">
          <div class="mx-auto w-full max-w-3xl">
          <div class="px-5 pt-14 pb-5 md:px-6 md:pt-8">
            <p class="mb-1 text-[11px] tracking-wider text-muted uppercase">Bandeja</p>
            <h1 class="font-display text-[34px] leading-none tracking-tight">
              Ofertas <span class="text-lime">· {filtered().length}</span>
            </h1>
          </div>

          {/* Tabs */}
          <div class="flex gap-5 border-b border-hairline px-5 md:px-6">
            <For each={TABS}>
              {(t) => (
                <Tab
                  label={t.label}
                  count={countOf(t.id)}
                  active={tab() === t.id}
                  onClick={() => setTab(t.id)}
                />
              )}
            </For>
          </div>

          <Suspense fallback={<InboxSkeleton />}>
            <Show when={bestOffer()}>
              {(offer) => (
                <BestOffer
                  offer={offer()}
                  busy={pendingId() === offer().id}
                  onAccept={() => respond(offer().id, "accepted")}
                  onReject={() => respond(offer().id, "rejected")}
                />
              )}
            </Show>

            <Show when={filtered().length > 0} fallback={<EmptyInbox tab={tab()} />}>
              <p class="px-5 pt-3 pb-1 text-[11px] tracking-wider text-muted uppercase md:px-6">
                Todas las ofertas
              </p>
              <div class="px-5 pb-4 md:px-6">
                <For each={filtered()}>
                  {(offer, i) => (
                    <OfferRow
                      offer={offer}
                      isLast={i() === filtered().length - 1}
                      side={tab()}
                      busy={pendingId() === offer.id}
                      onAccept={() => respond(offer.id, "accepted")}
                      onReject={() => respond(offer.id, "rejected")}
                    />
                  )}
                </For>
              </div>
            </Show>
          </Suspense>
          </div>
        </main>

        <TabBar active="offers" />
      </div>
    </MobileShell>
  );
};

// ── Best offer card ──────────────────────────────────────────────

const BestOffer: Component<{
  offer: OfferWithRels;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}> = (props) => {
  const ratio = () =>
    Math.round((props.offer.amount / Number(props.offer.listing.price)) * 100);
  const expiresLabel = () => formatExpires(props.offer.expires_at);
  return (
    <section class="px-5 pt-4 pb-3 md:px-6">
      <div class="rounded-lg bg-lime p-4 text-ink">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-[11px] font-bold tracking-wider uppercase">Mejor oferta</p>
          <Show when={expiresLabel()}>
            {(label) => (
              <span class="rounded-pill bg-ink px-2 py-1 text-[10px] font-semibold text-lime">
                {label()}
              </span>
            )}
          </Show>
        </div>
        <div class="mb-1 flex items-baseline gap-2">
          <p class="font-display text-[36px] leading-none tracking-tight">
            ${formatPrice(props.offer.amount)}
          </p>
          <p class="text-xs">
            de <strong>{props.offer.buyer.full_name}</strong> · {props.offer.listing.title}
          </p>
        </div>
        <p class="mb-3 text-[11px] opacity-70">{ratio()}% del precio</p>
        <div class="flex gap-2">
          <button
            disabled={props.busy}
            onClick={() => props.onAccept()}
            class="flex-1 rounded-pill bg-ink py-2.5 text-[13px] font-semibold text-lime disabled:opacity-50"
          >
            {props.busy ? "…" : "Aceptar"}
          </button>
          <button
            disabled={props.busy}
            onClick={() => props.onReject()}
            class="flex-1 rounded-pill border-[1.5px] border-ink py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            Rechazar
          </button>
        </div>
      </div>
    </section>
  );
};

// ── Row ──────────────────────────────────────────────────────────

const OfferRow: Component<{
  offer: OfferWithRels;
  isLast: boolean;
  side: TabId;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}> = (props) => {
  const counterpart = () =>
    props.side === "sent" ? props.offer.listing.seller : props.offer.buyer;
  const displayName = () =>
    props.side === "sent" ? `Tú → ${counterpart().full_name}` : counterpart().full_name;
  const hue = () => hash(counterpart().id);
  const ratio = () =>
    Math.round((props.offer.amount / Number(props.offer.listing.price)) * 100);

  return (
    <div
      class="flex items-start gap-3 py-3.5"
      classList={{ "border-b border-hairline": !props.isLast }}
    >
      <div
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-ink"
        style={{ background: `oklch(0.7 0.12 ${hue()})` }}
      >
        {counterpart().full_name[0]?.toUpperCase() ?? "?"}
      </div>
      <div class="min-w-0 flex-1">
        <div class="mb-0.5 flex items-baseline justify-between gap-2">
          <p class="truncate text-sm font-semibold text-cream">{displayName()}</p>
          <p class="shrink-0 text-[11px] text-muted">{formatAge(props.offer.created_at)}</p>
        </div>
        <p class="truncate text-[12px] text-muted">
          <Show when={props.side === "sent"} fallback={<>Ofreció </>}>
            Ofreciste{" "}
          </Show>
          <span class="font-semibold text-lime">${formatPrice(props.offer.amount)}</span> ·{" "}
          <span class="text-cream/70">{ratio()}%</span> · {props.offer.listing.title}
        </p>
        <Show when={props.side === "incoming"}>
          <div class="mt-2 flex gap-2">
            <button
              disabled={props.busy}
              onClick={() => props.onAccept()}
              class="rounded-pill bg-lime px-3 py-1.5 text-[12px] font-semibold text-ink disabled:opacity-50"
            >
              {props.busy ? "…" : "Aceptar"}
            </button>
            <button
              disabled={props.busy}
              onClick={() => props.onReject()}
              class="rounded-pill border border-hairline px-3 py-1.5 text-[12px] font-semibold text-cream disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

// ── States ───────────────────────────────────────────────────────

const InboxSkeleton: Component = () => (
  <div class="animate-pulse px-5 py-4">
    <div class="mb-3 h-24 rounded-lg bg-card" />
    <div class="space-y-3">
      <div class="h-16 rounded-md bg-card" />
      <div class="h-16 rounded-md bg-card" />
    </div>
  </div>
);

const EmptyInbox: Component<{ tab: TabId }> = (props) => (
  <div class="flex flex-col items-center px-8 py-16 text-center">
    <p class="mb-2 text-sm text-cream">
      {props.tab === "incoming" && "No tienes ofertas recibidas"}
      {props.tab === "sent" && "No has enviado ofertas"}
      {props.tab === "accepted" && "Aún no hay ofertas aceptadas"}
    </p>
    <p class="text-[12px] text-muted">Las ofertas aparecerán aquí cuando lleguen.</p>
  </div>
);

const Tab: Component<{
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}> = (props) => (
  <button
    onClick={() => props.onClick?.()}
    class="-mb-px border-b-2 pb-3"
    classList={{
      "border-lime": props.active,
      "border-transparent": !props.active,
    }}
  >
    <span
      class="text-sm"
      classList={{
        "font-semibold text-cream": props.active,
        "text-muted": !props.active,
      }}
    >
      {props.label}
    </span>
    <span class="ml-1.5 text-[11px] text-muted">{props.count}</span>
  </button>
);

// ── Helpers ──────────────────────────────────────────────────────

const formatPrice = (price: number) => {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
};

const formatAge = (created: string | null): string => {
  if (!created) return "";
  const diffMs = Date.now() - new Date(created).getTime();
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
};

const formatExpires = (expires: string | null): string | undefined => {
  if (!expires) return undefined;
  const ms = new Date(expires).getTime() - Date.now();
  if (ms <= 0) return "EXPIRADA";
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "EXPIRA EN <1H";
  if (h < 24) return `EXPIRA EN ${h}H`;
  return `EXPIRA EN ${Math.round(h / 24)}D`;
};

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * 11) % 360;
  return h;
};

export default Offers;
