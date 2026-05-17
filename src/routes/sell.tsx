import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";
import { type Component, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { MobileShell } from "~/components/layout/MobileShell";

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

  TODO: Conectar con Supabase
  - Subir fotos a Supabase Storage
  - Insert con "use server":
      async function createListing(data: ListingInsert) {
        "use server";
        return supabase.from("listings").insert(data).select().single();
      }
*/

type ListingForm = {
  photos: string[]; // URLs de Supabase Storage (placeholder por ahora)
  title: string;
  category: string;
  price: string; // string para no fight con el input; convertir a number al guardar
  condition: string;
  description: string;
  acceptsOffers: boolean;
};

const INITIAL_FORM: ListingForm = {
  photos: ["1", "2"],
  title: "Mesa lateral de nogal",
  category: "Muebles · Mesas",
  price: "45",
  condition: "Buen estado",
  description: "Nogal macizo, estilo mid-century. Desgaste mínimo en la superficie…",
  acceptsOffers: true,
};

const Sell: Component = () => {
  const [form, setForm] = createStore<ListingForm>({ ...INITIAL_FORM });

  // El botón se desactiva si faltan campos obligatorios.
  // No es un createMemo porque solo se evalúa una vez por render del JSX,
  // y el store ya rastrea las lecturas reactivamente.
  const canContinue = () =>
    form.title.trim().length > 0 && form.price.trim().length > 0;

  return (
    <MobileShell>
      <Title>Stoop — Nueva publicación</Title>
      <div class="flex h-full flex-col">
        {/* Top bar */}
        <div class="flex shrink-0 items-center justify-between px-5 pt-14 pb-5">
          <A
            href="/"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-card"
            aria-label="Cerrar"
          >
            <CloseIcon />
          </A>
          <p class="text-sm font-semibold">Nueva publicación</p>
          <button class="text-[13px] text-muted">Guardar</button>
        </div>

        {/* Progress */}
        <div class="shrink-0 px-5 pb-6">
          <div class="flex gap-1.5">
            <div class="h-[3px] flex-1 rounded-pill bg-lime" />
            <div class="h-[3px] flex-1 rounded-pill bg-lime" />
            <div class="h-[3px] flex-1 rounded-pill bg-white/15" />
            <div class="h-[3px] flex-1 rounded-pill bg-white/15" />
          </div>
          <p class="mt-2.5 text-[11px] tracking-wider text-muted uppercase">
            Paso 2 de 4 · detalles
          </p>
        </div>

        {/* Form scroll */}
        <main class="flex-1 overflow-y-auto px-5">
          {/* Photos */}
          <h2 class="mb-3 font-display text-[22px] tracking-tight">Tus fotos</h2>
          <div class="mb-6 grid grid-cols-3 gap-2">
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

          {/* Form fields — controlled via store path updates */}
          <FormField label="Título">
            <input
              type="text"
              value={form.title}
              onInput={(e) => setForm("title", e.currentTarget.value)}
              class="w-full bg-transparent text-[15px] text-cream outline-none"
            />
          </FormField>
          <FormField label="Categoría">
            <div class="flex items-center justify-between">
              <span class="text-[15px]">{form.category}</span>
              <ChevronIcon />
            </div>
          </FormField>
          <div class="grid grid-cols-2 gap-2.5">
            <FormField label="Precio">
              <div class="flex items-center gap-1">
                <span class="text-[15px] text-muted">$</span>
                <input
                  type="text"
                  inputmode="numeric"
                  value={form.price}
                  onInput={(e) =>
                    setForm("price", e.currentTarget.value.replace(/[^\d]/g, ""))
                  }
                  class="w-full bg-transparent text-[15px] outline-none"
                />
              </div>
            </FormField>
            <FormField label="Condición">
              <p class="text-[15px]">{form.condition}</p>
            </FormField>
          </div>
          <FormField label="Descripción" minHeight={90}>
            <textarea
              value={form.description}
              onInput={(e) => setForm("description", e.currentTarget.value)}
              rows={3}
              class="w-full resize-none bg-transparent text-sm leading-relaxed text-cream/85 outline-none"
            />
          </FormField>

          {/* Toggle row */}
          <button
            type="button"
            onClick={() => setForm("acceptsOffers", (v) => !v)}
            class="flex w-full items-center justify-between rounded-md bg-card p-4 text-left"
          >
            <div>
              <p class="text-sm font-medium">Acepta ofertas</p>
              <p class="mt-0.5 text-[11px] text-muted">Permite a compradores negociar</p>
            </div>
            <Toggle on={form.acceptsOffers} />
          </button>
        </main>

        {/* Sticky CTA */}
        <div class="cta-gradient shrink-0 px-5 py-4 pb-8">
          <button
            class="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canContinue()}
          >
            Continuar →
          </button>
        </div>
      </div>
    </MobileShell>
  );
};

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

const ChevronIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color-muted)"
    stroke-width="2"
    stroke-linecap="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default Sell;
