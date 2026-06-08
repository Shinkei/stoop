import { Title } from "@solidjs/meta";
import { createAsync, useNavigate } from "@solidjs/router";
import {
  type Component,
  createEffect,
  createSignal,
  Match,
  Show,
  Suspense,
  Switch,
} from "solid-js";
import { MobileShell } from "~/components/layout/MobileShell";
import { TabBar } from "~/components/layout/TabBar";
import {
  currentUser,
  isAuthenticated,
  isAuthLoading,
  signOut,
} from "~/lib/auth";
import { getProfile, type ProfileEdit, upsertProfile } from "~/lib/profiles";
import type { Tables } from "~/types/database";

/*
  Profile — /profile

  Nuevos conceptos / patrones aquí:

  1. Ruta protegida con createEffect
     - Cuando la sesión carga (isAuthLoading() → false) y no hay usuario,
       redirigimos a /login. Lo hacemos en un createEffect para no bloquear
       el render inicial: pintamos un loading mientras llega el estado.

  2. createAsync con dependencia de señal
     - El fetch del perfil depende de currentUser()?.id. Si la sesión cambia
       (logout/login), createAsync re-ejecuta automáticamente.
     - getProfile está envuelto en query() así que tras upsertProfile el
       caché se invalida y createAsync re-fetch sin intervención.

  3. <Suspense> + <Show> en cascada
     - Suspense gestiona el loading del fetch.
     - Show distingue entre "perfil cargado" y "no encontrado" (caso edge:
       usuario auth existe pero la fila en `profiles` no, p.ej. signup sin
       trigger). Cuando falta, mostramos el mismo formulario en modo crear.

  4. Edit inline con createSignal
     - editing() alterna entre vista y formulario. Reutilizamos ProfileForm
       para "completar" y "editar" — la diferencia es solo el copy.
*/

const Profile: Component = () => {
  const navigate = useNavigate();
  const [editing, setEditing] = createSignal(false);

  createEffect(() => {
    if (!isAuthLoading() && !isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  });

  const profile = createAsync(() => getProfile(currentUser()?.id));

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <MobileShell>
      <Title>Stoop — Perfil</Title>
      <div class="flex h-full flex-col">
        <Switch>
          <Match when={isAuthLoading()}>
            <ProfileSkeleton />
          </Match>
          <Match when={isAuthenticated()}>
            <main class="flex-1 overflow-y-auto">
              <Suspense fallback={<ProfileSkeleton />}>
                <Show
                  when={profile()}
                  fallback={
                    <CreateProfileFlow
                      email={currentUser()?.email}
                      onSaved={() => setEditing(false)}
                    />
                  }
                >
                  {(p) => (
                    <Show
                      when={editing()}
                      fallback={
                        <ProfileView
                          profile={p()}
                          onSignOut={handleSignOut}
                          onEdit={() => setEditing(true)}
                        />
                      }
                    >
                      <ProfileForm
                        title="Editar perfil"
                        initial={p()}
                        submitLabel="Guardar"
                        onSaved={() => setEditing(false)}
                        onCancel={() => setEditing(false)}
                      />
                    </Show>
                  )}
                </Show>
              </Suspense>
            </main>
          </Match>
        </Switch>
        <TabBar active="profile" />
      </div>
    </MobileShell>
  );
};

// ── View mode ────────────────────────────────────────────────────

const ProfileView: Component<{
  profile: Tables<"profiles">;
  onSignOut: () => void;
  onEdit: () => void;
}> = (props) => (
  <>
    <div class="px-5 pt-14 pb-6">
      <div class="mb-4 flex items-center gap-4">
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-ink"
          style={{ background: "oklch(0.75 0.14 80)" }}
        >
          {props.profile.full_name[0]?.toUpperCase() ?? "?"}
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="truncate font-display text-[26px] leading-none tracking-tight">
            {props.profile.full_name}
          </h1>
          <p class="mt-1 text-[13px] text-muted">@{props.profile.username}</p>
          <Show when={props.profile.neighborhood}>
            {(n) => (
              <p class="mt-1 text-[11px] tracking-wider text-muted uppercase">
                <span class="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lime" />
                {n()}
              </p>
            )}
          </Show>
        </div>
        <button
          onClick={() => props.onEdit()}
          class="rounded-pill border border-hairline px-3 py-1.5 text-[12px] font-semibold text-cream"
        >
          Editar
        </button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2 px-5 pb-6">
      <StatCard value={`${props.profile.total_sold ?? 0}`} label="Vendidos" />
      <StatCard
        value={props.profile.rating?.toFixed(1) ?? "—"}
        label="Rating"
        accent
      />
      <StatCard value={`${props.profile.reply_time_minutes ?? "—"}m`} label="Responde" />
    </div>

    <div class="px-5 pb-4">
      <MenuItem href="/manage" label="Mis publicaciones" />
      <MenuItem href="/offers" label="Bandeja de ofertas" />
      <MenuItem href="#" label="Guardados" />
      <MenuItem href="#" label="Historial" />
      <MenuItem href="#" label="Ajustes" isLast />
    </div>

    <div class="px-5 pb-8">
      <button
        type="button"
        onClick={() => props.onSignOut()}
        class="w-full rounded-md border border-hairline py-3.5 text-[13px] font-semibold text-danger"
      >
        Cerrar sesión
      </button>
    </div>
  </>
);

// ── Edit / Create ────────────────────────────────────────────────

const ProfileForm: Component<{
  title: string;
  intro?: string;
  initial?: Tables<"profiles">;
  submitLabel: string;
  onSaved: () => void;
  onCancel?: () => void;
}> = (props) => {
  const [fullName, setFullName] = createSignal(props.initial?.full_name ?? "");
  const [username, setUsername] = createSignal(props.initial?.username ?? "");
  const [neighborhood, setNeighborhood] = createSignal(props.initial?.neighborhood ?? "");
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const valid = () =>
    !saving() && fullName().trim().length > 0 && username().trim().length > 0;

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const user = currentUser();
    if (!user || !valid()) return;
    setSaving(true);
    setError(null);
    try {
      const edit: ProfileEdit = {
        full_name: fullName().trim(),
        username: username().trim(),
        neighborhood: neighborhood().trim() || null,
      };
      await upsertProfile(user.id, edit);
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} class="flex flex-col px-5 pt-14 pb-8">
      <h1 class="mb-1 font-display text-[26px] leading-none tracking-tight">{props.title}</h1>
      <Show when={props.intro}>
        {(t) => <p class="mb-5 text-[13px] text-muted">{t()}</p>}
      </Show>

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
      <Field label="Barrio">
        <input
          type="text"
          value={neighborhood()}
          onInput={(e) => setNeighborhood(e.currentTarget.value)}
          placeholder="Bedford-Stuyvesant"
          class="w-full bg-transparent text-[15px] text-cream outline-none placeholder:text-muted"
        />
      </Field>

      <Show when={error()}>
        {(msg) => (
          <p class="mb-3 text-[12px] text-danger" role="alert">
            {msg()}
          </p>
        )}
      </Show>

      <div class="mt-3 flex gap-2">
        <Show when={props.onCancel}>
          {(cancel) => (
            <button
              type="button"
              onClick={() => cancel()()}
              class="flex-1 rounded-pill border border-hairline py-3 text-[13px] font-semibold text-cream"
            >
              Cancelar
            </button>
          )}
        </Show>
        <button
          type="submit"
          disabled={!valid()}
          class="flex-1 rounded-pill bg-lime py-3 text-[13px] font-bold text-ink disabled:opacity-50"
        >
          {saving() ? "Guardando…" : props.submitLabel}
        </button>
      </div>
    </form>
  );
};

const CreateProfileFlow: Component<{
  email: string | undefined;
  onSaved: () => void;
}> = (props) => (
  <ProfileForm
    title="Completa tu perfil"
    intro={`Tu cuenta (${props.email ?? ""}) existe pero falta el perfil. Necesitamos un nombre y usuario para que tus vecinos te encuentren.`}
    submitLabel="Crear perfil"
    onSaved={props.onSaved}
  />
);

// ── Bits ─────────────────────────────────────────────────────────

const Field: Component<{ label: string; children: import("solid-js").JSX.Element }> = (
  props,
) => (
  <div class="mb-2.5 rounded-md bg-card px-4 py-3">
    <p class="mb-1 text-[10px] tracking-wider text-muted uppercase">{props.label}</p>
    {props.children}
  </div>
);

const StatCard: Component<{ value: string; label: string; accent?: boolean }> = (props) => (
  <div
    class="rounded-md p-3.5"
    classList={{
      "bg-lime text-ink": props.accent,
      "bg-card text-cream": !props.accent,
    }}
  >
    <p class="font-display text-[28px] leading-none tracking-tight">{props.value}</p>
    <p
      class="mt-1 text-[11px] tracking-wider uppercase"
      classList={{ "opacity-75": props.accent, "text-muted": !props.accent }}
    >
      {props.label}
    </p>
  </div>
);

const MenuItem: Component<{ href: string; label: string; isLast?: boolean }> = (props) => (
  <a
    href={props.href}
    class="flex items-center justify-between py-3.5"
    classList={{ "border-b border-hairline": !props.isLast }}
  >
    <span class="text-[14px] text-cream">{props.label}</span>
    <ChevronIcon />
  </a>
);

const ProfileSkeleton: Component = () => (
  <main class="flex-1 px-5 pt-14">
    <div class="animate-pulse">
      <div class="mb-4 flex items-center gap-4">
        <div class="h-16 w-16 rounded-full bg-card" />
        <div class="flex-1 space-y-2">
          <div class="h-6 w-1/2 rounded-md bg-card" />
          <div class="h-3 w-1/3 rounded-md bg-card" />
        </div>
      </div>
      <div class="mb-6 grid grid-cols-3 gap-2">
        <div class="h-20 rounded-md bg-card" />
        <div class="h-20 rounded-md bg-card" />
        <div class="h-20 rounded-md bg-card" />
      </div>
    </div>
  </main>
);

const ChevronIcon: Component = () => (
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

export default Profile;
