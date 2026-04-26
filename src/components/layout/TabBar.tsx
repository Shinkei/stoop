import { A } from "@solidjs/router";
import { type Component, Show } from "solid-js";

/*
  TabBar — Navegación principal de la app.

  En SolidJS, <A> es el equivalente a <Link> de Next.js.
  La prop `activeClass` aplica estilos automáticamente cuando
  la ruta coincide con el `href`.

  Nota sobre SolidJS: este componente NO se re-renderiza cuando
  cambia `active`. En su lugar, Solid actualiza solo los nodos
  del DOM que cambian (el className del tab activo). Esto es
  la diferencia fundamental con React.
*/

type TabId = "home" | "search" | "sell" | "offers" | "profile";

type Props = {
  active: TabId;
};

export const TabBar: Component<Props> = (props) => {
  return (
    <nav class="fixed right-0 bottom-0 left-0 z-50 flex h-20 items-end justify-around bg-stoop-bg/95 pb-4 backdrop-blur-md">
      <TabItem href="/" icon="home" label="Home" active={props.active === "home"} />
      <TabItem href="/search" icon="search" label="Buscar" active={props.active === "search"} />

      {/* Botón central de vender — FAB */}
      <A
        href="/sell"
        class="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-stoop-lime shadow-lg transition-transform active:scale-95"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0F1F17"
          stroke-width="2.5"
          stroke-linecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </A>

      <TabItem href="/offers" icon="offers" label="Ofertas" active={props.active === "offers"} />
      <TabItem href="/profile" icon="profile" label="Perfil" active={props.active === "profile"} />
    </nav>
  );
};

const TabItem: Component<{
  href: string;
  icon: string;
  label: string;
  active: boolean;
}> = (props) => {
  const color = () => (props.active ? "#9FE870" : "rgba(245,245,240,0.45)");

  return (
    <A href={props.href} class="flex flex-col items-center gap-1 px-3 py-1">
      <TabIcon name={props.icon} color={color()} />
      <span class="text-[10px] font-medium transition-colors" style={{ color: color() }}>
        {props.label}
      </span>
    </A>
  );
};

const TabIcon: Component<{ name: string; color: string }> = (props) => {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={props.color}
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <Show when={props.name === "home"}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </Show>
      <Show when={props.name === "search"}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </Show>
      <Show when={props.name === "offers"}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
      </Show>
      <Show when={props.name === "profile"}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </Show>
    </svg>
  );
};
