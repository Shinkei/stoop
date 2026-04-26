# Stoop — Neighborhood Marketplace

Marketplace de vecindario para vender cosas de segunda mano. Proyecto de aprendizaje construido con **SolidStart** y **Supabase**.

## Stack

| Capa | Tecnología | Docs |
|------|-----------|------|
| Framework | [SolidStart](https://docs.solidjs.com/solid-start) | SSR + routing file-based |
| Reactividad | [SolidJS](https://docs.solidjs.com) | Signals, no Virtual DOM |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com/docs/v4-beta) | Utility-first |
| Base de datos | [Supabase](https://supabase.com/docs) | PostgreSQL + Auth + Storage |
| Tipado | TypeScript | Estricto |

---

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# 3. Desarrollo
npm run dev
# → http://localhost:3000
```

### Obtener credenciales de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **Settings → API**
3. Copia `Project URL` → `VITE_SUPABASE_URL`
4. Copia `anon public` key → `VITE_SUPABASE_ANON_KEY`

---

## Estructura del proyecto

```
src/
├── routes/              # Rutas (file-based, como Next.js pages/)
│   ├── index.tsx        # / → Home feed
│   ├── search.tsx       # /search → Búsqueda y categorías
│   ├── sell.tsx         # /sell → Crear listing (wizard)
│   ├── offers.tsx       # /offers → Bandeja de ofertas
│   ├── manage.tsx       # /manage → Dashboard del vendedor
│   ├── profile.tsx      # /profile → Perfil de usuario
│   └── item/
│       └── [id].tsx     # /item/:id → Detalle del producto
│
├── components/
│   ├── layout/
│   │   ├── TabBar.tsx       # Navegación inferior con FAB central
│   │   └── MobileShell.tsx  # Wrapper mobile-first
│   └── ui/                  # Componentes reutilizables (Button, Badge…)
│
├── lib/
│   └── supabase.ts      # Cliente de Supabase (singleton)
│
├── types/
│   └── database.ts      # Tipos del schema de Supabase
│
├── styles/
│   └── app.css          # Tailwind + design tokens (@theme)
│
├── app.tsx              # Root component (Router + MetaProvider)
├── entry-client.tsx     # Hydration del cliente
└── entry-server.tsx     # SSR handler
```

---

## Conceptos clave: SolidJS vs React

Este es el corazón del aprendizaje. SolidJS tiene sintaxis JSX casi idéntica a React, pero el modelo mental es completamente diferente.

### 1. Signals en lugar de State

```tsx
// React
const [count, setCount] = useState(0);
// El componente se RE-RENDERIZA completo cuando cambia

// SolidJS
const [count, setCount] = createSignal(0);
// Solo actualiza el nodo del DOM que leyó `count()`
// El componente NO se vuelve a ejecutar
```

**Consecuencia importante:** en Solid accedes al valor con `count()` (es una función). Esto no es un detalle de sintaxis — es lo que hace posible el tracking automático de dependencias.

### 2. No hay re-renders

```tsx
// En React, esto imprime cada vez que el componente re-renderiza:
function Component() {
  console.log("render"); // se ejecuta en cada update
  const [x, setX] = useState(0);
  return <div>{x}</div>;
}

// En Solid, el componente se ejecuta UNA sola vez:
function Component() {
  console.log("setup"); // se ejecuta solo al montar
  const [x, setX] = createSignal(0);
  return <div>{x()}</div>; // solo este nodo se actualiza
}
```

### 3. Primitivas reactivas

```tsx
import { createSignal, createMemo, createEffect } from "solid-js";

// Estado local
const [price, setPrice] = createSignal(45);

// Valor derivado (como useMemo, pero sin array de dependencias)
const discounted = createMemo(() => price() * 0.9);
// Solid detecta automáticamente que depende de price()

// Efecto secundario (como useEffect, pero sin array de dependencias)
createEffect(() => {
  console.log("El precio cambió a:", price());
  // Se vuelve a ejecutar automáticamente cuando price() cambia
});
```

### 4. Componentes de control de flujo

```tsx
// En lugar de ternarios y .map(), Solid usa componentes:

// Condicional
<Show when={isLoggedIn()} fallback={<LoginButton />}>
  <Dashboard />
</Show>

// Listas (más eficiente que .map())
<For each={listings()}>
  {(item) => <ListingCard listing={item} />}
</For>

// Switch/case
<Switch>
  <Match when={status() === "loading"}><Spinner /></Match>
  <Match when={status() === "error"}><Error /></Match>
  <Match when={status() === "success"}><Content /></Match>
</Switch>
```

### 5. Server Functions (como Server Actions de Next)

```tsx
// En un archivo .tsx, puedes mezclar código de cliente y servidor:

// Esta función SOLO se ejecuta en el servidor
async function createListing(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const { data } = await supabase.from("listings").insert({ title }).select().single();
  return data;
}

// Y llamarla desde el cliente normalmente:
function SellForm() {
  return (
    <form action={createListing} method="post">
      <input name="title" />
      <button type="submit">Publicar</button>
    </form>
  );
}
```

### 6. Carga de datos con createAsync

```tsx
import { createAsync } from "@solidjs/router";

// Equivalente a fetch + useEffect o a React Server Components
async function getListings() {
  const { data } = await supabase.from("listings").select("*");
  return data;
}

function Home() {
  // createAsync retorna una señal — se actualiza cuando la promesa resuelve
  const listings = createAsync(() => getListings());

  return (
    <Suspense fallback={<Skeleton />}>
      <For each={listings()}>
        {(item) => <Card item={item} />}
      </For>
    </Suspense>
  );
}
```

---

## Design System

Colores definidos como tokens CSS en `src/styles/app.css`:

| Token | Valor | Uso |
|-------|-------|-----|
| `stoop-bg` | `#0F1F17` | Fondo principal |
| `stoop-card` | `#1F3028` | Tarjetas, inputs |
| `stoop-lime` | `#9FE870` | Acento, precios, CTAs |
| `stoop-cream` | `#F5F5F0` | Texto principal |
| `stoop-muted` | `rgba(245,245,240,0.6)` | Texto secundario |

Tipografía:
- Display: `font-display` → Instrument Serif
- UI: `font-ui` → Inter

Uso en Tailwind:
```html
<div class="bg-stoop-bg text-stoop-cream">
  <span class="text-stoop-lime font-semibold">$45</span>
</div>
```

---

## Schema de Supabase

Tablas a crear en el dashboard de Supabase (SQL Editor):

```sql
-- Perfiles de usuario (extiende auth.users)
create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  full_name text not null,
  neighborhood text,
  avatar_url text,
  rating numeric(2,1) default 5.0,
  total_sold int default 0,
  reply_time_minutes int default 60,
  created_at timestamptz default now()
);

-- Listings
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles not null,
  title text not null,
  description text,
  price numeric(10,2) not null,
  original_price numeric(10,2),
  category text not null,
  condition text not null,
  status text not null default 'draft',
  accepts_offers boolean default true,
  photos text[] default '{}',
  lat numeric(9,6),
  lng numeric(9,6),
  neighborhood text,
  views int default 0,
  created_at timestamptz default now()
);

-- Ofertas
create table offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings not null,
  buyer_id uuid references profiles not null,
  amount numeric(10,2) not null,
  status text not null default 'pending',
  message text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Habilitar Row Level Security
alter table profiles enable row level security;
alter table listings enable row level security;
alter table offers enable row level security;
```

---

## Screens por implementar

- [x] Home / Browse (estructura base)
- [ ] Item Detail (`/item/[id]`)
- [ ] Search & Categories (`/search`)
- [ ] Map / Nearby (`/map`)
- [ ] New Listing wizard (`/sell`)
- [ ] Manage Items (`/manage`)
- [ ] Offers Inbox (`/offers`)
- [ ] Profile (`/profile`)
- [ ] Auth (login / signup)

---

## Recursos de aprendizaje

- [Tutorial oficial de SolidJS](https://www.solidjs.com/tutorial/introduction_basics) — imprescindible, ~2h
- [SolidStart docs](https://docs.solidjs.com/solid-start/getting-started) — routing, server functions
- [Supabase + SolidJS guide](https://supabase.com/docs/guides/getting-started/quickstarts/solidjs)
- [Tailwind v4 migration guide](https://tailwindcss.com/docs/v4-beta) — @theme y nueva sintaxis
