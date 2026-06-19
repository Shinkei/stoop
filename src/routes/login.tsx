import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { type Component, createEffect, createSignal, Match, Show, Switch } from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { isAuthenticated, signInWithPassword, signUp } from "~/lib/auth";

/*
  Login — /login

  Pantalla combinada para iniciar sesión o crear cuenta.

  Nuevos conceptos de SolidJS aquí:

  1. createEffect para side effects basados en señales
     - Cuando isAuthenticated() pasa a true, navegamos fuera de /login.
     - createEffect rastrea las dependencias automáticamente — no hace falta
       array de deps como en React.

  2. useNavigate() del router
     - Equivalente a useRouter().push() de Next.
     - navigate("/profile", { replace: true }) reemplaza la entrada en el historial,
       así "Atrás" no vuelve a /login.

  3. Async handler con guardas
     - submit() lee del store con un await; aún así, dentro del handler accedemos
       a las señales como valores (email(), password()) — la captura se hace
       en el momento del click, no reactiva (es un callback, no un effect).

  4. <Switch>/<Match> para alternar modos
     - mode() es "signin" | "signup". Toggle simple sin re-renders innecesarios.
*/

type Mode = "signin" | "signup";

const Login: Component = () => {
  const navigate = useNavigate();

  const [mode, setMode] = createSignal<Mode>("signin");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [fullName, setFullName] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  // Si la sesión llega (login exitoso o ya autenticado al entrar), redirige.
  createEffect(() => {
    if (isAuthenticated()) {
      navigate("/profile", { replace: true });
    }
  });

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authError } =
        mode() === "signin"
          ? await signInWithPassword(email(), password())
          : await signUp(email(), password(), fullName(), username());

      if (authError) {
        setError(authError.message);
      }
      // Si fue exitoso, onAuthStateChange disparará el effect de arriba.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = () => {
    if (loading()) return false;
    if (!email().trim() || password().length < 6) return false;
    if (mode() === "signup" && (!fullName().trim() || !username().trim())) return false;
    return true;
  };

  return (
    <MobileShell noNav>
      <Title>Stoop — {mode() === "signin" ? "Iniciar sesión" : "Crear cuenta"}</Title>
      <div class="mx-auto flex h-full w-full max-w-md flex-col px-5 pt-14 pb-8 md:pt-16">
        {/* Header */}
        <div class="mb-8">
          <p class="mb-1 text-[11px] tracking-wider text-muted uppercase">
            <span class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lime" />
            Bienvenido
          </p>
          <h1 class="font-display text-[34px] leading-none tracking-tight">
            The stoop<span class="text-lime">.</span>
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={submit} class="flex flex-1 flex-col">
          <h2 class="mb-5 font-display text-[22px] tracking-tight">
            <Switch>
              <Match when={mode() === "signin"}>Inicia sesión</Match>
              <Match when={mode() === "signup"}>Crea tu cuenta</Match>
            </Switch>
          </h2>

          <Show when={mode() === "signup"}>
            <Field label="Nombre">
              <input
                type="text"
                value={fullName()}
                onInput={(e) => setFullName(e.currentTarget.value)}
                autocomplete="name"
                class="w-full bg-transparent text-[15px] text-cream outline-none"
              />
            </Field>
            <Field label="Usuario">
              <input
                type="text"
                value={username()}
                onInput={(e) =>
                  setUsername(e.currentTarget.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                autocapitalize="off"
                autocomplete="username"
                class="w-full bg-transparent text-[15px] text-cream outline-none"
              />
            </Field>
          </Show>

          <Field label="Email">
            <input
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              autocapitalize="off"
              autocomplete="email"
              class="w-full bg-transparent text-[15px] text-cream outline-none"
            />
          </Field>

          <Field label="Contraseña">
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              autocomplete={mode() === "signin" ? "current-password" : "new-password"}
              class="w-full bg-transparent text-[15px] text-cream outline-none"
            />
          </Field>

          <Show when={error()}>
            {(msg) => (
              <p class="mb-3 text-[12px] text-danger" role="alert">
                {msg()}
              </p>
            )}
          </Show>

          <button
            type="submit"
            disabled={!canSubmit()}
            class="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Switch>
              <Match when={loading()}>…</Match>
              <Match when={mode() === "signin"}>Entrar</Match>
              <Match when={mode() === "signup"}>Crear cuenta</Match>
            </Switch>
          </button>

          {/* Toggle modo */}
          <p class="mt-6 text-center text-[13px] text-muted">
            <Switch>
              <Match when={mode() === "signin"}>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  class="font-semibold text-lime"
                >
                  Crear una
                </button>
              </Match>
              <Match when={mode() === "signup"}>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  class="font-semibold text-lime"
                >
                  Iniciar sesión
                </button>
              </Match>
            </Switch>
          </p>
        </form>
      </div>
    </MobileShell>
  );
};

const Field: Component<{ label: string; children: import("solid-js").JSX.Element }> = (props) => (
  <div class="mb-2.5 rounded-md bg-card px-4 py-3">
    <p class="mb-1 text-[10px] tracking-wider text-muted uppercase">{props.label}</p>
    {props.children}
  </div>
);

export default Login;
