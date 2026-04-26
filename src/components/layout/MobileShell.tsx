import { type Component, type JSX } from "solid-js";

/*
  MobileShell — Contenedor que centra la app en desktop
  y la limita al ancho de un móvil (390px).

  En móvil real ocupa toda la pantalla.
  En desktop se ve como un teléfono centrado.
*/
type Props = {
  children: JSX.Element;
};

export const MobileShell: Component<Props> = (props) => {
  return (
    <div class="flex min-h-screen items-center justify-center bg-[#0a1510]">
      <div class="relative h-screen w-full max-w-[390px] overflow-hidden bg-stoop-bg shadow-2xl md:h-[844px] md:rounded-[44px]">
        {props.children}
      </div>
    </div>
  );
};
