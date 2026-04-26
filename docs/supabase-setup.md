# Supabase Setup — Stoop

Guía de todo lo que se configuró en Supabase para este proyecto y por qué.
Útil para entender la arquitectura backend y reproducirlo en un proyecto futuro.

---

## 1. Crear el proyecto

**Qué:** Un proyecto de Supabase es una instancia de PostgreSQL dedicada con una API REST, Auth y Storage incluidos.

**Por qué eu-central-1 (Frankfurt):** Menor latencia para usuarios en Europa/España. Supabase no tiene región en Latinoamérica aún — si el público fuera latam, `us-east-1` daría mejor latencia allí.

**Resultado:** Se genera una URL (`https://<id>.supabase.co`) y dos keys:
- `anon` key — pública, va en el frontend (VITE_SUPABASE_ANON_KEY)
- `service_role` key — privada, NUNCA va al frontend, solo en server functions

---

## 2. Tablas (Schema de base de datos)

Supabase es PostgreSQL. Las tablas se crean con SQL estándar.

### `profiles`
Extiende la tabla interna `auth.users` de Supabase. Cuando un usuario se registra,
Supabase crea un registro en `auth.users`; nosotros creamos el perfil público en `profiles`.

```sql
create table profiles (
  id         uuid references auth.users primary key,
  username   text unique not null,
  full_name  text not null,
  neighborhood text,
  avatar_url text,
  rating     numeric(2,1) default 5.0,
  total_sold int default 0,
  reply_time_minutes int default 60,
  created_at timestamptz default now()
);
```

### `listings`
Los productos publicados en el marketplace.

```sql
create table listings (
  id             uuid primary key default gen_random_uuid(),
  seller_id      uuid references profiles not null,
  title          text not null,
  description    text,
  price          numeric(10,2) not null,
  original_price numeric(10,2),
  category       text not null,
  condition      text not null,
  status         text not null default 'draft',
  accepts_offers boolean default true,
  photos         text[] default '{}',    -- array de URLs de Supabase Storage
  lat            numeric(9,6),           -- coordenadas para el mapa
  lng            numeric(9,6),
  neighborhood   text,
  views          int default 0,
  created_at     timestamptz default now()
);

-- Índice para búsquedas de texto completo (título + descripción)
create index listings_search_idx
  on listings using gin(to_tsvector('spanish', title || ' ' || coalesce(description, '')));

-- Índice para filtrar por seller
create index listings_seller_idx on listings(seller_id);

-- Índice para filtrar por status (active/draft/sold)
create index listings_status_idx on listings(status);
```

### `offers`
Las ofertas que hacen los compradores sobre un listing.

```sql
create table offers (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid references listings on delete cascade not null,
  buyer_id   uuid references profiles not null,
  amount     numeric(10,2) not null,
  status     text not null default 'pending',  -- pending/accepted/declined/countered/expired
  message    text,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create index offers_listing_idx on offers(listing_id);
create index offers_buyer_idx on offers(buyer_id);
```

---

## 3. Row Level Security (RLS)

**Qué es RLS:** PostgreSQL permite definir políticas que controlan qué filas puede leer/escribir cada usuario. Supabase lo usa para que la `anon key` (que está en el frontend) no dé acceso a datos que no corresponden.

**Regla de oro:** Habilitar RLS en TODAS las tablas y luego abrir solo lo necesario.

### Políticas de `profiles`
```sql
alter table profiles enable row level security;

-- Cualquiera puede ver perfiles públicos
create policy "profiles: lectura pública"
  on profiles for select using (true);

-- Solo el propio usuario puede editar su perfil
create policy "profiles: edición propia"
  on profiles for update using (auth.uid() = id);

-- El sistema crea el perfil al registrarse (via trigger)
create policy "profiles: inserción propia"
  on profiles for insert with check (auth.uid() = id);
```

### Políticas de `listings`
```sql
alter table listings enable row level security;

-- Cualquiera puede ver listings activos
create policy "listings: lectura pública de activos"
  on listings for select using (status = 'active');

-- El vendedor ve todos sus listings (incluidos drafts)
create policy "listings: vendedor ve todos los suyos"
  on listings for select using (auth.uid() = seller_id);

-- Solo el vendedor puede crear/editar/borrar sus listings
create policy "listings: CRUD del vendedor"
  on listings for all using (auth.uid() = seller_id);
```

### Políticas de `offers`
```sql
alter table offers enable row level security;

-- El comprador ve sus propias ofertas
-- El vendedor ve las ofertas de sus listings
create policy "offers: lectura del involucrado"
  on offers for select using (
    auth.uid() = buyer_id or
    auth.uid() = (select seller_id from listings where id = listing_id)
  );

-- Solo el comprador puede hacer una oferta
create policy "offers: inserción del comprador"
  on offers for insert with check (auth.uid() = buyer_id);

-- El vendedor puede actualizar el status (accept/decline)
-- El comprador puede cancelar la suya
create policy "offers: actualización del involucrado"
  on offers for update using (
    auth.uid() = buyer_id or
    auth.uid() = (select seller_id from listings where id = listing_id)
  );
```

---

## 4. Trigger: crear perfil al registrarse

Cuando un usuario se registra, `auth.users` recibe un registro automáticamente.
Este trigger crea el perfil público correspondiente en nuestra tabla `profiles`.

```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

---

## 5. Storage bucket: fotos de productos

**Qué es Storage:** Supabase incluye un S3-compatible para subir archivos. Las fotos de listings se guardan aquí y la URL pública va en el array `listings.photos`.

```sql
-- Bucket público (las fotos son visibles sin autenticación)
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true);

-- Solo el dueño puede subir/borrar sus fotos
create policy "storage: subida autenticada"
  on storage.objects for insert
  with check (bucket_id = 'listing-photos' and auth.role() = 'authenticated');

create policy "storage: borrado propio"
  on storage.objects for delete
  using (bucket_id = 'listing-photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Lectura pública
create policy "storage: lectura pública"
  on storage.objects for select
  using (bucket_id = 'listing-photos');
```

**Convención de paths:** `{user_id}/{listing_id}/{filename}`
Esto permite que la política de borrado funcione comprobando el primer segmento del path.

---

## 6. Tipos TypeScript generados

Supabase puede generar automáticamente los tipos TypeScript a partir del schema real:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

Esto reemplaza los tipos escritos a mano en `src/types/database.ts` con los exactos del schema.
Se recomienda re-ejecutar cada vez que cambies el schema.

---

## Resumen de lo creado

| Recurso | Descripción |
|---------|-------------|
| Proyecto | `stoop` en `eu-central-1` |
| Tablas | `profiles`, `listings`, `offers` |
| Índices | Full-text search en listings, índices por seller/status/buyer |
| RLS | Habilitado en las 3 tablas con políticas granulares |
| Trigger | Auto-crea perfil al registrarse un usuario |
| Storage | Bucket `listing-photos` público con políticas de escritura |
| Tipos TS | Generados desde el schema real de Supabase |
