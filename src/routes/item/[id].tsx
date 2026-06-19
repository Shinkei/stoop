import { Title } from "@solidjs/meta";
import { A, createAsync, useNavigate, useParams } from "@solidjs/router";
import {
  type Component,
  createMemo,
  createSignal,
  For,
  Show,
  Suspense,
} from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { currentUser, isAuthenticated } from "~/lib/auth";
import { getListing, hueFromId, type ListingWithSeller } from "~/lib/listings";
import { createOffer } from "~/lib/offers";

/*
  Item Detail — /item/:id

  Conceptos de SolidJS que aparecen aquí:

  1. createAsync(fn) con params reactivos
     - useParams() devuelve un proxy reactivo. Si la URL cambia (navegar de
       /item/A a /item/B sin recargar), createAsync detecta el cambio en
       params.id automáticamente y re-ejecuta getListing.

  2. <Suspense fallback={...}>
     - createAsync "suspende" el árbol mientras el Promise resuelve.

  3. <Show when={val}>{(v) => ...}
     - El children como función recibe v: () => NonNullable<T>, estrechando
       el tipo sin casting manual.

  4. createMemo para valores derivados
     - currentHue() depende de listing y photoIndex.

  5. Modal/sheet para "Hacer oferta"
     - sheetOpen() controla visibilidad. Submit llama a createOffer() que
       invalida el inbox por dentro. No hace falta más estado: el usuario
       verá la oferta cuando vaya a /offers.
*/

const ItemDetail: Component = () => {
  const params = useParams();
  const navigate = useNavigate();

  // params.id es reactivo: createAsync vuelve a ejecutarse si cambia.
  const item = createAsync<ListingWithSeller | null>(() => getListing(params.id ?? ""));

  const [photoIndex, setPhotoIndex] = createSignal(0);
  const [sheetOpen, setSheetOpen] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [feedback, setFeedback] = createSignal<string | null>(null);

  const photos = createMemo<string[]>(() => item()?.photos ?? []);
  const hasPhotos = () => photos().length > 0;

  const placeholderHues = createMemo(() => {
    const id = item()?.id;
    if (!id) return [40, 45, 35];
    const base = hueFromId(id);
    return [base, (base + 8) % 360, (base + 350) % 360];
  });

  const currentHue = () => placeholderHues()[photoIndex() % placeholderHues().length] ?? 40;
  const dotCount = () => (hasPhotos() ? photos().length : placeholderHues().length);

  const requireAuth = (): string | null => {
    const u = currentUser();
    if (!isAuthenticated() || !u) {
      navigate("/login");
      return null;
    }
    return u.id;
  };

  const submitOffer = async (amount: number, message: string) => {
    const uid = requireAuth();
    const listing = item();
    if (!uid || !listing) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await createOffer({
        listingId: listing.id,
        buyerId: uid,
        amount,
        message: message.trim() || undefined,
      });
      setSheetOpen(false);
      setFeedback("Oferta enviada ✓");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Error al enviar la oferta");
    } finally {
      setSubmitting(false);
    }
  };

  const buyNow = () => {
    const listing = item();
    if (!listing) return;
    submitOffer(Number(listing.price), "Compra a precio completo");
  };

  return (
    <MobileShell>
      <Title>Stoop — {item()?.title ?? "Item"}</Title>
      <div class="flex h-full flex-col">
        <Suspense fallback={<ItemSkeleton />}>
          <Show when={item()} fallback={<NotFound />}>
            {(listing) => (
              <>
                {/* Hero / foto */}
                <div class="relative shrink-0">
                  <div
                    class="w-full transition-colors duration-300 bg-cover bg-center md:h-[440px]"
                    style={{
                      height: "300px",
                      background: hasPhotos()
                        ? `url(${photos()[photoIndex()]}) center/cover`
                        : `oklch(0.35 0.06 ${currentHue()})`,
                    }}
                  />

                  <A
                    href="/"
                    class="absolute top-12 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
                  >
                    <BackIcon />
                  </A>

                  <Show when={listing().neighborhood}>
                    {(n) => (
                      <div class="absolute top-12 right-4 rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-cream backdrop-blur-sm">
                        {n()}
                      </div>
                    )}
                  </Show>

                  <div class="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5">
                    <For each={Array.from({ length: dotCount() })}>
                      {(_, i) => (
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

                {/* Contenido */}
                <div class="flex-1 overflow-y-auto">
                  <div class="mx-auto max-w-3xl px-5 pt-5 pb-6 md:px-6">
                    <div class="mb-1 flex items-baseline justify-between">
                      <span class="font-display text-3xl text-lime">
                        ${formatPrice(listing().price)}
                      </span>
                      <Show when={(listing().original_price ?? 0) > 0}>
                        <span class="text-sm text-muted line-through">
                          ${formatPrice(listing().original_price ?? 0)}
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
                        <p class="text-sm leading-tight font-semibold">
                          {listing().seller.full_name}
                        </p>
                        <p class="text-[11px] text-muted">
                          ★ {listing().seller.rating ?? "—"} · {listing().seller.total_sold ?? 0} vendidos
                        </p>
                      </div>
                      <Show when={listing().seller.reply_time_minutes}>
                        {(m) => (
                          <div class="text-right">
                            <p class="text-[11px] text-muted">Responde en</p>
                            <p class="text-xs font-semibold text-lime">~{m()} min</p>
                          </div>
                        )}
                      </Show>
                    </div>

                    {/* Chips */}
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

                    <Show when={listing().description}>
                      {(desc) => (
                        <p class="text-[14px] leading-relaxed text-cream/80">{desc()}</p>
                      )}
                    </Show>

                    <Show when={feedback()}>
                      {(msg) => (
                        <p class="mt-4 text-[12px] text-lime" role="status">
                          {msg()}
                        </p>
                      )}
                    </Show>
                  </div>
                </div>

                {/* CTAs sticky */}
                <div class="mx-auto flex w-full max-w-3xl shrink-0 gap-3 border-t border-hairline bg-ink px-5 py-4 pb-8 md:px-6">
                  <Show when={listing().accepts_offers}>
                    <button
                      onClick={() => {
                        if (requireAuth()) setSheetOpen(true);
                      }}
                      class="flex-1 rounded-2xl border border-faint py-3.5 text-sm font-semibold transition-opacity active:opacity-70"
                    >
                      Hacer oferta
                    </button>
                  </Show>
                  <button
                    onClick={buyNow}
                    disabled={submitting()}
                    class="rounded-2xl bg-lime py-3.5 text-sm font-bold text-ink transition-opacity active:opacity-70 disabled:opacity-50"
                    classList={{
                      "flex-1": !listing().accepts_offers,
                      "w-40": !!listing().accepts_offers,
                    }}
                  >
                    {submitting() ? "Enviando…" : `Comprar · $${formatPrice(listing().price)}`}
                  </button>
                </div>

                <Show when={sheetOpen()}>
                  <OfferSheet
                    listing={listing()}
                    submitting={submitting()}
                    onSubmit={submitOffer}
                    onClose={() => setSheetOpen(false)}
                  />
                </Show>
              </>
            )}
          </Show>
        </Suspense>
      </div>
    </MobileShell>
  );
};

// ── Offer sheet ──────────────────────────────────────────────────

const OfferSheet: Component<{
  listing: ListingWithSeller;
  submitting: boolean;
  onSubmit: (amount: number, message: string) => void;
  onClose: () => void;
}> = (props) => {
  const suggested = () => Math.max(1, Math.round(Number(props.listing.price) * 0.85));
  const [amount, setAmount] = createSignal(String(suggested()));
  const [message, setMessage] = createSignal("");

  const valid = () => {
    const n = Number(amount());
    return Number.isFinite(n) && n > 0;
  };

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!valid() || props.submitting) return;
    props.onSubmit(Number(amount()), message());
  };

  return (
    <div
      class="absolute inset-0 z-10 flex flex-col justify-end bg-black/50"
      onClick={() => props.onClose()}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        class="rounded-t-2xl bg-ink px-5 pt-5 pb-8"
      >
        <div class="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h2 class="mb-1 font-display text-[22px] tracking-tight">Hacer oferta</h2>
        <p class="mb-4 text-[12px] text-muted">
          {props.listing.title} · pide ${formatPrice(props.listing.price)}
        </p>

        <div class="mb-2.5 rounded-md bg-card px-4 py-3">
          <p class="mb-1 text-[10px] tracking-wider text-muted uppercase">Tu oferta</p>
          <div class="flex items-center gap-1">
            <span class="text-[18px] text-muted">$</span>
            <input
              type="text"
              inputmode="numeric"
              value={amount()}
              onInput={(e) => setAmount(e.currentTarget.value.replace(/[^\d]/g, ""))}
              class="w-full bg-transparent text-[20px] font-semibold text-cream outline-none"
            />
          </div>
        </div>

        <div class="mb-4 rounded-md bg-card px-4 py-3">
          <p class="mb-1 text-[10px] tracking-wider text-muted uppercase">Mensaje (opcional)</p>
          <textarea
            value={message()}
            onInput={(e) => setMessage(e.currentTarget.value)}
            rows={2}
            placeholder="¿Sigue disponible? ¿Cómo recogemos?"
            class="w-full resize-none bg-transparent text-sm text-cream/85 outline-none placeholder:text-muted"
          />
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            onClick={() => props.onClose()}
            class="flex-1 rounded-pill border border-hairline py-3 text-[13px] font-semibold text-cream"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!valid() || props.submitting}
            class="flex-1 rounded-pill bg-lime py-3 text-[13px] font-bold text-ink disabled:opacity-50"
          >
            {props.submitting ? "Enviando…" : `Ofrecer $${amount() || "0"}`}
          </button>
        </div>
      </form>
    </div>
  );
};

const formatPrice = (price: number) => {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
};

const ItemSkeleton: Component = () => (
  <div class="animate-pulse">
    <div class="h-[300px] w-full bg-card" />
    <div class="space-y-3 px-5 pt-5">
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
