import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { type Component } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";

/*
  Item Detail — /item/:id

  Conceptos de SolidJS para implementar aquí:
  - useParams(): accede a los parámetros de ruta (como useParams de Next)
  - createAsync(): para cargar datos del item desde Supabase

  Ejemplo de cómo quedaría con datos reales:
    const item = createAsync(() => getListingById(params.id));
    // En el template: item()?.title (acceso reactivo)

  TODO: Implementar pantalla completa con:
  - Galería de fotos con dots
  - Información del vendedor
  - Grid de detalles (condición, dimensiones, etc.)
  - CTAs sticky: "Hacer oferta" + "Comprar · $XX"
*/

const ItemDetail: Component = () => {
  const params = useParams();

  return (
    <MobileShell>
      <Title>Stoop — Item</Title>
      <div class="flex h-full flex-col items-center justify-center gap-3 text-stoop-muted">
        <p class="text-sm">Item ID: {params.id}</p>
        <p class="text-xs">— pantalla por implementar —</p>
      </div>
    </MobileShell>
  );
};

export default ItemDetail;
