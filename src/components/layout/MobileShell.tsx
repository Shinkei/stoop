import { A } from "@solidjs/router";
import { type Component, For, type JSX, Show } from "solid-js";

/*
  MobileShell — contenedor adaptativo de la app.

  Estrategia de layout (alineada con CLAUDE.md):
  - Mobile (<768): la pantalla es el "teléfono" — 100dvh, sin frame extra.
    La navegación vive abajo, en la <TabBar /> que cada página incluye.
  - md+ (≥768): cabecera superior con marca + nav inline + CTA "Vender".
    La <TabBar /> se oculta automáticamente (md:hidden), y el contenido
    expande hasta max-w-[1280px] centrado.

  Por qué un solo contenedor en lugar de dos layouts separados:
  - El árbol DOM se reordena con classes, no con conditional rendering.
    Eso evita remounts entre breakpoints (formularios mantienen estado,
    inputs no pierden el foco al rotar el dispositivo).
  - Cada página sigue siendo "flex h-full flex-col" + main scrollable +
    TabBar abajo. La shell solo amplía el frame en md+ y añade header.

  Props:
  - noNav: oculta la cabecera de escritorio. Útil en flujos a pantalla
    completa (login, sell wizard) donde la nav superior distrae.
*/

type Props = {
  children: JSX.Element;
  noNav?: boolean;
};

export const MobileShell: Component<Props> = (props) => (
  <div class="flex h-dvh flex-col bg-[#0a1510] md:bg-ink">
    <Show when={!props.noNav}>
      <DesktopHeader />
    </Show>
    <div class="mx-auto flex min-h-0 w-full max-w-[390px] flex-1 flex-col overflow-hidden bg-ink md:max-w-[1280px] md:bg-transparent">
      {props.children}
    </div>
  </div>
);

// ── Desktop header ──────────────────────────────────────────────

const NAV = [
  { href: "/", label: "Home", end: true },
  { href: "/search", label: "Buscar", end: false },
  { href: "/offers", label: "Ofertas", end: false },
  { href: "/manage", label: "Mis publicaciones", end: false },
  { href: "/profile", label: "Perfil", end: false },
];

const DesktopHeader: Component = () => (
  <header class="hidden h-16 shrink-0 border-b border-hairline bg-ink md:flex">
    <div class="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6">
      <A href="/" class="font-display text-[20px] leading-none tracking-tight">
        The stoop<span class="text-lime">.</span>
      </A>
      <nav class="flex items-center gap-1">
        <For each={NAV}>
          {(item) => (
            <A
              href={item.href}
              end={item.end}
              class="rounded-pill px-3 py-1.5 text-[13px] font-medium text-cream/70 transition-colors hover:text-cream"
              activeClass="!text-lime"
            >
              {item.label}
            </A>
          )}
        </For>
      </nav>
      <A
        href="/sell"
        class="rounded-pill bg-lime px-4 py-2 text-[13px] font-bold text-ink transition-opacity hover:opacity-90"
      >
        + Vender
      </A>
    </div>
  </header>
);
