import { Title } from "@solidjs/meta";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Offers Inbox — /offers

  Nuevos conceptos de SolidJS aquí:

  1. createMemo(fn) para listas derivadas
     - filtered() = createMemo(() => OFFERS.filter(o => o.status === tab()))
     - Solo recalcula cuando tab() cambia. <For> recibe la lista filtrada
       y solo crea/destruye los nodos que entran o salen — no re-renderiza
       los que se mantienen.
     - Sin memo, OFFERS.filter(...) correría en cada lectura. Para una
       lista de 10 ítems da igual, pero el patrón importa.

  2. createMemo vs función simple ()
     - () => filter(...) también funciona, pero re-ejecuta en cada lectura.
       Si la lista la leen varios nodos, el filter corre N veces.
     - createMemo cachea el resultado hasta que una dependencia cambia.

  3. Tab counts derivados
     - count = createMemo(() => OFFERS.filter(o => o.status === id).length)
     - Cuando cambia algo (marcar leída, etc.), los counts y la lista
       se actualizan solos sin intervención manual.

  4. createStore para una lista mutable por ID
     - createStore<Offer[]>(...) devuelve un proxy reactivo sobre el array.
     - setOffers(o => o.id === id, "unread", false) busca el item que
       cumple el predicado y le cambia una propiedad. Reactividad granular:
       solo el nodo que lee `unread` de ese ítem se re-evalúa.
     - Patrón clave: el primer argumento puede ser un índice, un predicado,
       o el rango {from, to}. Devuelve los items que pasaron.

  TODO: Conectar con Supabase
  - supabase.from("offers").select("*, buyer:profiles(*), listing:listings(*)")
*/

type TabId = "incoming" | "sent" | "accepted";

type Offer = {
  id: string;
  name: string;
  item: string;
  amount: number;
  ask: number;
  time: string;
  unread: boolean;
  hue: number;
  status: TabId;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "incoming", label: "Recibidas" },
  { id: "sent", label: "Enviadas" },
  { id: "accepted", label: "Aceptadas" },
];

const OFFERS: Offer[] = [
  { id: "o1", name: "Jordan K.",  item: "Mesa lateral de nogal",   amount: 35, ask: 45, time: "12m", unread: true,  hue: 40,  status: "incoming" },
  { id: "o2", name: "Priya S.",   item: "Mesa lateral de nogal",   amount: 40, ask: 45, time: "1h",  unread: true,  hue: 40,  status: "incoming" },
  { id: "o3", name: "Dev A.",     item: "Set Pyrex vintage",       amount: 30, ask: 34, time: "3h",  unread: false, hue: 180, status: "incoming" },
  { id: "o4", name: "Marco L.",   item: "Chaqueta denim Levi's",   amount: 22, ask: 28, time: "6h",  unread: false, hue: 220, status: "incoming" },
  { id: "o5", name: "Simone V.",  item: "Colección de vinilos",    amount: 70, ask: 85, time: "1d",  unread: false, hue: 280, status: "incoming" },
  { id: "o6", name: "Tú → Maya R.",   item: "Silla mid-century",  amount: 50, ask: 60, time: "2h", unread: false, hue: 30,  status: "sent" },
  { id: "o7", name: "Tú → Carlos M.", item: "Lámpara de pie",     amount: 25, ask: 30, time: "4h", unread: false, hue: 100, status: "sent" },
  { id: "o8", name: "Tú → Laura T.",  item: "Olla de hierro",     amount: 18, ask: 22, time: "1d", unread: false, hue: 200, status: "sent" },
  { id: "o9", name: "Diego F.",   item: "Set de tazas",            amount: 15, ask: 18, time: "3d",  unread: false, hue: 320, status: "accepted" },
  { id: "o10", name: "Sarah K.",  item: "Cojín bordado",           amount: 12, ask: 15, time: "5d",  unread: false, hue: 80,  status: "accepted" },
];

const Offers: Component = () => {
  const [offers, setOffers] = createStore<Offer[]>(OFFERS);
  const [tab, setTab] = createSignal<TabId>("incoming");

  // Lista derivada — recalcula cuando tab() o offers cambia.
  const filtered = createMemo(() => offers.filter((o) => o.status === tab()));

  // Counts por pestaña — derivados del store.
  const countOf = (id: TabId) => offers.filter((o) => o.status === id).length;

  // Mejor oferta: la incoming con mayor % del precio pedido.
  const bestOffer = createMemo(() =>
    tab() === "incoming"
      ? [...offers.filter((o) => o.status === "incoming")].sort(
          (a, b) => b.amount / b.ask - a.amount / a.ask,
        )[0]
      : undefined,
  );

  // Marca una oferta como leída. setOffers acepta un predicado
  // como primer argumento — busca el item que cumple y solo cambia
  // la prop indicada.
  const markRead = (id: string) => {
    setOffers((o) => o.id === id, "unread", false);
  };

  return (
    <MobileShell>
      <Title>Stoop — Ofertas</Title>
      <div class="flex h-full flex-col">
        <main class="flex-1 overflow-y-auto">
          {/* Header — el contador refleja la pestaña actual */}
          <div class="px-5 pt-14 pb-5">
            <p class="mb-1 text-[11px] tracking-wider text-muted uppercase">Bandeja</p>
            <h1 class="font-display text-[34px] leading-none tracking-tight">
              Ofertas <span class="text-lime">· {filtered().length}</span>
            </h1>
          </div>

          {/* Tabs */}
          <div class="flex gap-5 border-b border-hairline px-5">
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

          {/* Mejor oferta — solo en Recibidas */}
          <Show when={bestOffer()}>
            {(offer) => (
              <section class="px-5 pt-4 pb-3">
                <div class="rounded-lg bg-lime p-4 text-ink">
                  <div class="mb-2 flex items-center justify-between">
                    <p class="text-[11px] font-bold tracking-wider uppercase">Mejor oferta</p>
                    <span class="rounded-pill bg-ink px-2 py-1 text-[10px] font-semibold text-lime">
                      EXPIRA EN 2H
                    </span>
                  </div>
                  <div class="mb-1 flex items-baseline gap-2">
                    <p class="font-display text-[36px] leading-none tracking-tight">
                      ${offer().amount}
                    </p>
                    <p class="text-xs">
                      de <strong>{offer().name}</strong> · {offer().item}
                    </p>
                  </div>
                  <p class="mb-3 text-[11px] opacity-70">
                    {Math.round((offer().amount / offer().ask) * 100)}% del precio
                  </p>
                  <div class="flex gap-2">
                    <button class="flex-1 rounded-pill bg-ink py-2.5 text-[13px] font-semibold text-lime">
                      Aceptar
                    </button>
                    <button class="flex-1 rounded-pill border-[1.5px] border-ink py-2.5 text-[13px] font-semibold">
                      Contraofertar
                    </button>
                  </div>
                </div>
              </section>
            )}
          </Show>

          {/* Lista filtrada por pestaña */}
          <OfferList offers={filtered()} onRowClick={markRead} />
        </main>

        <TabBar active="offers" />
      </div>
    </MobileShell>
  );
};

const OfferList: Component<{
  offers: Offer[];
  onRowClick: (id: string) => void;
}> = (props) => (
  <>
    <p class="px-5 pt-2 pb-1 text-[11px] tracking-wider text-muted uppercase">
      Todas las ofertas
    </p>
    <div class="px-5 pb-4">
      <For each={props.offers}>
        {(offer, i) => (
          <OfferRow
            offer={offer}
            isLast={i() === props.offers.length - 1}
            onClick={() => props.onRowClick(offer.id)}
          />
        )}
      </For>
    </div>
  </>
);

const Tab: Component<{
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}> = (props) => (
  <button
    onClick={props.onClick}
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

const OfferRow: Component<{
  offer: Offer;
  isLast: boolean;
  onClick: () => void;
}> = (props) => (
  <button
    onClick={props.onClick}
    class="flex w-full items-center gap-3 py-3.5 text-left"
    classList={{ "border-b border-hairline": !props.isLast }}
  >
    <div
      class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-ink"
      style={{ background: `oklch(0.7 0.12 ${props.offer.hue})` }}
    >
      {props.offer.name[0]}
      {props.offer.unread && (
        <div class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink bg-lime" />
      )}
    </div>
    <div class="min-w-0 flex-1">
      <div class="mb-0.5 flex items-baseline justify-between gap-2">
        <p
          class="truncate text-sm"
          classList={{
            "font-semibold text-cream": props.offer.unread,
            "font-medium text-cream/90": !props.offer.unread,
          }}
        >
          {props.offer.name}
        </p>
        <p class="shrink-0 text-[11px] text-muted">{props.offer.time}</p>
      </div>
      <p class="truncate text-[12px] text-muted">
        Ofreció <span class="font-semibold text-lime">${props.offer.amount}</span> por {props.offer.item}
      </p>
    </div>
  </button>
);

export default Offers;
