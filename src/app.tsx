import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { initAuth } from "~/lib/auth";
import "~/styles/app.css";

// Arranca la suscripción a Supabase auth en el cliente.
// initAuth() es idempotente y no hace nada en SSR.
initAuth();

/*
  app.tsx es el punto de entrada de SolidStart.
  - <Router> maneja la navegación (como el App Router de Next)
  - <FileRoutes /> genera las rutas automáticamente desde src/routes/
  - <Suspense> envuelve las rutas para manejar loading states
  - <MetaProvider> permite usar <Title>, <Meta> en cualquier ruta
*/
export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>Stoop — Neighborhood Marketplace</Title>
          <Suspense>{props.children}</Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
