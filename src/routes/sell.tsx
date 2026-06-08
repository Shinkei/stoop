import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import {
  type Component,
  createEffect,
  createSignal,
  For,
  type JSX,
  Match,
  Show,
  Switch,
} from "solid-js";
import { createStore } from "solid-js/store";
import { MobileShell } from "~/components/layout/MobileShell";
import { currentUser, isAuthenticated, isAuthLoading } from "~/lib/auth";
import { createListing, type NewListing } from "~/lib/listings";

/*
  Sell — /sell

  Wizard de 4 pasos: Fotos → Detalles → Recogida → Revisar.

  Nuevos conceptos de SolidJS aquí:

  1. createStore({...})
     - Para estado anidado (objetos, arrays). Es el primitivo correcto
       cuando una sola "cosa" tiene muchos campos — un formulario.
     - Devuelve [store, setStore] como createSignal, pero el store es
       un proxy reactivo: leer store.title rastrea solo ese campo;
       cambiar otro campo no notifica a quien lee title.
     - Eso evita el problema de "todo el componente se re-renderiza
       cuando cualquier campo cambia" que en React resuelves con
       useReducer o context-fina.

  2. setStore("path", value) — actualización por path
     - setForm("title", "...") cambia solo title.
     - setForm("photos", 0, "url") cambia photos[0] sin tocar el resto.
     - setForm("acceptsOffers", (v) => !v) usa updater function.
     - No requiere spreads ni inmutabilidad — el store es mutable
       internamente pero las lecturas siguen siendo reactivas.

  3. <Switch>/<Match> — render condicional multi-rama
     - Como un switch/case para JSX. Solo el <Match> activo se renderiza.
     - <Show> sirve para 2 estados (truthy/fallback); <Switch> para N.
     - El paso del wizard se selecciona con <Match when={step() === N}>.

  4. Submit + auth + navigate
     - createListing() es una mutación que requiere auth. Si no hay user
       cuando el componente monta, redirigimos a /login con createEffect.
     - Tras crear el listing, navegamos a /manage (donde getMyListings
       se revalida automáticamente porque createListing llama a
       revalidate(getMyListings.key) por dentro).
*/

type ListingForm = {
  photos: string[]; // URLs de Supabase Storage (placeholder por ahora)
  title: string;
  category: string;
  price: string; // string para no fight con el input; convertir a number al guardar
  condition: string;
  description: string;
  acceptsOffers: boolean;
  neighborhood: string;
};

const INITIAL_FORM: ListingForm = {
  photos: [],
  title: "",
  category: "Muebles",
  price: "",
  condition: "Buen estado",
  description: "",
  acceptsOffers: true,
  neighborhood: "Bedford-Stuyvesant",
};

const STEPS = [
  { id: 1, label: "fotos" },
  { id: 2, label: "detalles" },
  { id: 3, label: "recogida" },
  { id: 4, label: "revisar" },
] as const;
type StepId = (typeof STEPS)[number]["id"];

const Sell: Component = () => {
  const navigate = useNavigate();
  const [form, setForm] = createStore<ListingForm>({ ...INITIAL_FORM });
  const [step, setStep] = createSignal<StepId>(1);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    if (!isAuthLoading() && !isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  });

  const currentStep = () => STEPS.find((s) => s.id === step())!;
  const isLastStep = () => step() === STEPS.length;

  // Validación por paso — solo bloquea cuando faltan datos del paso actual.
  // En el paso 1 permitimos seguir aunque no haya fotos: el modelo todavía
  // no acepta uploads reales y el step muestra placeholders.
  const canContinue = () => {
    if (submitting()) return false;
    switch (step()) {
      case 2:
        return form.title.trim().length > 0 && form.price.trim().length > 0;
      default:
        return true;
    }
  };

  const submit = async () => {
    const user = currentUser();
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload: NewListing = {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price),
        condition: form.condition,
        description: form.description.trim() || null,
        accepts_offers: form.acceptsOffers,
        neighborhood: form.neighborhood.trim() || null,
        photos: form.photos.length > 0 ? form.photos : null,
        status: "active",
      };
      await createListing(user.id, payload);
      navigate("/manage", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar");
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (!canContinue()) return;
    if (isLastStep()) {
      submit();
      return;
    }
    setStep((s) => (s + 1) as StepId);
  };

  const goBack = () => {
    if (step() > 1) setStep((s) => (s - 1) as StepId);
  };

  return (
    <MobileShell>
      <Title>Stoop — Nueva publicación</Title>
      <div class="flex h-full flex-col">
        {/* Top bar — back en pasos > 1, close en paso 1 */}
        <div class="flex shrink-0 items-center justify-between px-5 pt-14 pb-5">
          <Switch>
            <Match when={step() === 1}>
              <A
                href="/"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-card"
                aria-label="Cerrar"
              >
                <CloseIcon />
              </A>
            </Match>
            <Match when={step() > 1}>
              <button
                onClick={goBack}
                class="flex h-10 w-10 items-center justify-center rounded-full bg-card"
                aria-label="Atrás"
              >
                <BackIcon />
              </button>
            </Match>
          </Switch>
          <p class="text-sm font-semibold">Nueva publicación</p>
          <button class="text-[13px] text-muted">Guardar</button>
        </div>

        {/* Progress — segmentos pintados según el paso actual */}
        <div class="shrink-0 px-5 pb-6">
          <div class="flex gap-1.5">
            <For each={STEPS}>
              {(s) => (
                <div
                  class="h-[3px] flex-1 rounded-pill transition-colors"
                  classList={{
                    "bg-lime": s.id <= step(),
                    "bg-white/15": s.id > step(),
                  }}
                />
              )}
            </For>
          </div>
          <p class="mt-2.5 text-[11px] tracking-wider text-muted uppercase">
            Paso {step()} de {STEPS.length} · {currentStep().label}
          </p>
        </div>

        {/* Step content */}
        <main class="flex-1 overflow-y-auto px-5">
          <Switch>
            <Match when={step() === 1}>
              <StepPhotos />
            </Match>
            <Match when={step() === 2}>
              <StepDetails form={form} setForm={setForm} />
            </Match>
            <Match when={step() === 3}>
              <StepPickup form={form} setForm={setForm} />
            </Match>
            <Match when={step() === 4}>
              <StepReview form={form} />
            </Match>
          </Switch>
        </main>

        {/* Sticky CTA */}
        <div class="cta-gradient shrink-0 px-5 py-4 pb-8">
          <Show when={error()}>
            {(msg) => (
              <p class="mb-2 text-center text-[12px] text-danger" role="alert">
                {msg()}
              </p>
            )}
          </Show>
          <button
            onClick={goNext}
            class="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canContinue()}
          >
            <Switch>
              <Match when={submitting()}>Publicando…</Match>
              <Match when={isLastStep()}>Publicar</Match>
              <Match when={!isLastStep()}>Continuar →</Match>
            </Switch>
          </button>
        </div>
      </div>
    </MobileShell>
  );
};

// ── Steps ────────────────────────────────────────────────────

type StepProps = {
  form: ListingForm;
  setForm: ReturnType<typeof createStore<ListingForm>>[1];
};

const StepPhotos: Component = () => (
  <>
    <h2 class="mb-3 font-display text-[22px] tracking-tight">Tus fotos</h2>
    <p class="mb-4 text-[13px] text-muted">
      Hasta 6 fotos. La primera será la portada de tu publicación. (Próximamente
      con upload a Storage — por ahora se publica sin fotos reales.)
    </p>
    <div class="grid grid-cols-3 gap-2">
      <div class="relative aspect-square overflow-hidden rounded-md">
        <div class="absolute inset-0" style={{ background: "oklch(0.45 0.08 40)" }} />
        <span class="absolute bottom-1 left-1 rounded-xs bg-lime px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-ink uppercase">
          Portada
        </span>
      </div>
      <div
        class="aspect-square overflow-hidden rounded-md"
        style={{ background: "oklch(0.42 0.07 40)" }}
      />
      <button class="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border-[1.5px] border-dashed border-faint text-muted">
        <PlusIcon />
        <span class="text-[10px]">Agregar</span>
      </button>
    </div>
  </>
);

const StepDetails: Component<StepProps> = (props) => (
  <>
    <FormField label="Título">
      <input
        type="text"
        value={props.form.title}
        onInput={(e) => props.setForm("title", e.currentTarget.value)}
        placeholder="Mesa lateral de nogal"
        class="w-full bg-transparent text-[15px] text-cream outline-none placeholder:text-muted"
      />
    </FormField>
    <FormField label="Categoría">
      <input
        type="text"
        value={props.form.category}
        onInput={(e) => props.setForm("category", e.currentTarget.value)}
        class="w-full bg-transparent text-[15px] outline-none"
      />
    </FormField>
    <div class="grid grid-cols-2 gap-2.5">
      <FormField label="Precio">
        <div class="flex items-center gap-1">
          <span class="text-[15px] text-muted">$</span>
          <input
            type="text"
            inputmode="numeric"
            value={props.form.price}
            placeholder="45"
            onInput={(e) =>
              props.setForm("price", e.currentTarget.value.replace(/[^\d]/g, ""))
            }
            class="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
        </div>
      </FormField>
      <FormField label="Condición">
        <input
          type="text"
          value={props.form.condition}
          onInput={(e) => props.setForm("condition", e.currentTarget.value)}
          class="w-full bg-transparent text-[15px] outline-none"
        />
      </FormField>
    </div>
    <FormField label="Descripción" minHeight={90}>
      <textarea
        value={props.form.description}
        onInput={(e) => props.setForm("description", e.currentTarget.value)}
        rows={3}
        placeholder="Detalles, medidas, defectos…"
        class="w-full resize-none bg-transparent text-sm leading-relaxed text-cream/85 outline-none placeholder:text-muted"
      />
    </FormField>

    <button
      type="button"
      onClick={() => props.setForm("acceptsOffers", (v) => !v)}
      class="flex w-full items-center justify-between rounded-md bg-card p-4 text-left"
    >
      <div>
        <p class="text-sm font-medium">Acepta ofertas</p>
        <p class="mt-0.5 text-[11px] text-muted">Permite a compradores negociar</p>
      </div>
      <Toggle on={props.form.acceptsOffers} />
    </button>
  </>
);

const StepPickup: Component<StepProps> = (props) => (
  <>
    <h2 class="mb-3 font-display text-[22px] tracking-tight">Recogida</h2>
    <p class="mb-4 text-[13px] text-muted">
      ¿En qué barrio se recoge? (Selector de ubicación y horario llegan próximamente.)
    </p>
    <FormField label="Barrio">
      <input
        type="text"
        value={props.form.neighborhood}
        onInput={(e) => props.setForm("neighborhood", e.currentTarget.value)}
        class="w-full bg-transparent text-[15px] outline-none"
      />
    </FormField>
  </>
);

const StepReview: Component<{ form: ListingForm }> = (props) => (
  <>
    <h2 class="mb-4 font-display text-[22px] tracking-tight">Revisar</h2>
    <div class="rounded-md bg-card p-4">
      <p class="text-[11px] tracking-wider text-muted uppercase">Título</p>
      <p class="mb-3 text-[15px]">{props.form.title || "—"}</p>
      <p class="text-[11px] tracking-wider text-muted uppercase">Precio</p>
      <p class="mb-3 text-[15px] text-lime">${props.form.price || "0"}</p>
      <p class="text-[11px] tracking-wider text-muted uppercase">Categoría</p>
      <p class="mb-3 text-[15px]">{props.form.category}</p>
      <p class="text-[11px] tracking-wider text-muted uppercase">Barrio</p>
      <p class="mb-3 text-[15px]">{props.form.neighborhood || "—"}</p>
      <Show when={props.form.description}>
        <p class="text-[11px] tracking-wider text-muted uppercase">Descripción</p>
        <p class="text-sm text-cream/85">{props.form.description}</p>
      </Show>
    </div>
  </>
);

const FormField: Component<{
  label: string;
  children: JSX.Element;
  minHeight?: number;
}> = (props) => (
  <div
    class="mb-2.5 rounded-md bg-card px-4 py-3"
    style={{ "min-height": props.minHeight ? `${props.minHeight}px` : undefined }}
  >
    <p class="mb-1 text-[10px] tracking-wider text-muted uppercase">{props.label}</p>
    {props.children}
  </div>
);

const Toggle: Component<{ on: boolean }> = (props) => (
  <div
    class="relative h-[26px] w-11 rounded-pill transition-colors"
    classList={{ "bg-lime": props.on, "bg-white/15": !props.on }}
  >
    <div
      class="absolute top-[3px] h-5 w-5 rounded-pill bg-ink transition-all"
      classList={{ "right-[3px]": props.on, "left-[3px]": !props.on }}
    />
  </div>
);

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const BackIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default Sell;
