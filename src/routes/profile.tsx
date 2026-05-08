import { Title } from "@solidjs/meta";
import { type Component } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";

/*
  Profile — /profile

  TODO: Implementar con:
  - Avatar + nombre + barrio
  - Stats: Vendidos / Listados / Rating
  - Menú de opciones (Manage listings, Saved, History, etc.)
  - Botón de cerrar sesión

  Auth con Supabase:
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.auth.signOut();

  Para proteger rutas (redirect si no hay sesión),
  usar un middleware en src/middleware.ts con SolidStart.
*/

const Profile: Component = () => {
  return (
    <MobileShell>
      <Title>Stoop — Perfil</Title>
      <div class="flex h-full flex-col">
        <div class="flex flex-1 items-center justify-center text-muted">
          <p class="text-xs">— profile por implementar —</p>
        </div>
        <TabBar active="profile" />
      </div>
    </MobileShell>
  );
};

export default Profile;
