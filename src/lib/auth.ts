import { createSignal } from "solid-js";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/*
  Auth — estado global de sesión.

  Conceptos de SolidJS que aparecen aquí:

  1. Señal a nivel de módulo
     - createSignal fuera de un componente crea una señal global,
       compartida entre todos los componentes que la importen.
     - Equivalente a un store de Zustand muy simple, o a Context en React
       (pero sin Provider — la reactividad viaja sola).
     - Cualquier nodo del DOM que llame a session() se suscribe automáticamente
       y se actualiza cuando setSession(...) ejecuta.

  2. Tri-estado: undefined / null / Session
     - undefined → todavía no sabemos (cargando la sesión inicial).
     - null      → no hay sesión (usuario no autenticado).
     - Session   → autenticado.
     - Este patrón evita el flicker "logged out → logged in" en el primer render.

  3. Inicialización idempotente
     - initAuth() solo corre una vez y solo en el cliente.
     - `typeof window` evita que se ejecute durante SSR, donde no hay
       localStorage para leer la sesión.

  Sobre SSR + Supabase:
  - Por defecto, supabase-js guarda los tokens en localStorage (cliente only).
  - Para SSR real con cookies, hay que usar @supabase/ssr. Para este proyecto
    de aprendizaje, auth client-side es más simple y suficiente.
*/

const [session, setSession] = createSignal<Session | null | undefined>(undefined);

let initialized = false;

export function initAuth() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Lectura inicial — recupera la sesión desde localStorage si existe.
  supabase.auth.getSession().then(({ data }) => setSession(data.session));

  // Suscripción a cambios — signin, signout, refresh de token.
  // La función se queda activa toda la vida de la app; no hace falta cleanup.
  supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession);
  });
}

export { session };

// Helpers de lectura derivados — los componentes los llaman como funciones.
export const currentUser = () => session()?.user ?? null;
export const isAuthLoading = () => session() === undefined;
export const isAuthenticated = () => !!session();

// ── Acciones ────────────────────────────────────────────────────

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUp(
  email: string,
  password: string,
  fullName: string,
  username: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    // `data` viaja al trigger handle_new_user (si está configurado en Supabase)
    // para poblar la fila en `profiles`. Si no, se crea manualmente más abajo.
    options: { data: { full_name: fullName, username } },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
