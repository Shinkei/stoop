import { type Component, type JSX } from "solid-js";

/*
  MobileShell — contenedor que define el "teléfono".

  Estrategia de layout:
  - Mobile: ocupa toda la pantalla (100dvh — dynamic viewport height,
    respeta la barra del browser en iOS/Android a diferencia de 100vh)
  - Desktop: centra un frame de 390x844 con bordes redondeados

  El inner div es flex-col para que las páginas puedan hacer:
    <main class="flex-1 overflow-y-auto">...</main>
    <TabBar />   ← se queda al fondo naturalmente, sin `fixed`

  Por qué NO usar `fixed` en TabBar:
  - En mobile funciona, pero en desktop el `fixed` es relativo al
    viewport, no al phone frame → se sale del contenedor.
  - Con flex-col + flex-1 en el contenido, TabBar siempre queda
    al fondo del frame en ambos breakpoints.
*/

type Props = {
  children: JSX.Element;
};

export const MobileShell: Component<Props> = (props) => {
  return (
    <div class="flex min-h-dvh justify-center bg-[#0a1510] md:items-center md:py-8">
      <div class="relative flex h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-ink md:h-[844px] md:rounded-[44px] md:shadow-2xl">
        {props.children}
      </div>
    </div>
  );
};
