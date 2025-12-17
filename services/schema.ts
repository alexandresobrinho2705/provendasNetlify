
export const SUPABASE_SCHEMA_SQL = `
-- Habilita a extensão de UUID
create extension if not exists "uuid-ossp";

-- =========================================================
-- 1. FUNÇÕES AUXILIARES (SEGURANÇA)
-- =========================================================

-- Função para obter ID da empresa de forma segura (Bypassing RLS via security definer)
-- Isso previne a recursão infinita nas políticas
create or replace function get_my_company_id() returns uuid as $$
  select owner_id 
  from public.user_profiles 
  where user_id = auth.uid()
  limit 1;
$$ language sql security definer stable;

-- =========================================================
-- 2. FAXINA DE DADOS (CRÍTICO - EXECUTE ISSO)
-- =========================================================

-- Remove perfis duplicados (mantém o mais antigo)
DELETE FROM public.user_profiles
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
        ROW_NUMBER() OVER (partition BY lower(email) ORDER BY created_at ASC) as rnum
        FROM public.user_profiles
    ) t
    WHERE t.rnum > 1
);

-- Reconecta perfis desconectados do Auth
UPDATE public.user_profiles up
SET user_id = au.id
FROM auth.users au
WHERE lower(trim(up.email)) = lower(trim(au.email))
AND up.user_id IS NULL;

-- CORREÇÃO DE REGISTROS "ÓRFÃOS" (PEDIDOS/ORÇAMENTOS INVISÍVEIS)
-- Vincula registros criados pelo vendedor ao ID do Admin da empresa
UPDATE public.orders o
SET owner_id = up.owner_id
FROM public.user_profiles up
WHERE o.owner_id = up.user_id 
  AND up.owner_id IS NOT NULL 
  AND up.owner_id != up.user_id;

UPDATE public.quotes q
SET owner_id = up.owner_id
FROM public.user_profiles up
WHERE q.owner_id = up.user_id 
  AND up.owner_id IS NOT NULL 
  AND up.owner_id != up.user_id;

-- =========================================================
-- 3. ESTRUTURA E MIGRAÇÕES
-- =========================================================

-- Garante existência das tabelas (se não existirem)
create table if not exists public.user_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete set null,
  owner_id uuid,
  full_name text not null,
  email text not null,
  cellphone text,
  role text default 'Vendedor',
  allowed_routes jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrações de Colunas (Idempotente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'owner_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN owner_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'allowed_routes') THEN
        ALTER TABLE public.user_profiles ADD COLUMN allowed_routes jsonb default '[]'::jsonb;
    END IF;
END $$;

-- Trigger para Novos Usuários
create or replace function public.handle_new_user()
returns trigger as $$
declare
  profile_id uuid;
begin
  select id into profile_id 
  from public.user_profiles 
  where lower(trim(email)) = lower(trim(new.email)) 
  limit 1;

  if profile_id is not null then
    update public.user_profiles
    set user_id = new.id,
        updated_at = now(),
        full_name = coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), full_name),
        cellphone = coalesce(nullif(new.raw_user_meta_data->>'phone', ''), cellphone)
    where id = profile_id;
  else
    insert into public.user_profiles (user_id, owner_id, full_name, email, cellphone, role, allowed_routes)
    values (
      new.id,
      new.id, 
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      new.email,
      new.raw_user_meta_data->>'phone',
      coalesce(new.raw_user_meta_data->>'role', 'Admin'),
      '[]'::jsonb
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- 4. POLÍTICAS DE SEGURANÇA (RLS) REFEITAS
-- =========================================================

alter table public.companies enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.industries enable row level security;
alter table public.carriers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.system_parameters enable row level security;
alter table public.user_profiles enable row level security;

-- LIMPANDO POLÍTICAS ANTIGAS
drop policy if exists "Profiles Visibility" on public.user_profiles;
drop policy if exists "Company Data Access" on public.clients;
drop policy if exists "Company Data Access" on public.products;
drop policy if exists "Company Data Access" on public.industries;
drop policy if exists "Company Data Access" on public.carriers;
drop policy if exists "Company Data Access" on public.orders;
drop policy if exists "Company Data Access" on public.quotes;
drop policy if exists "Company Data Access" on public.companies;
drop policy if exists "Company Data Access" on public.system_parameters;
drop policy if exists "Items Access" on public.order_items;
drop policy if exists "Items Access" on public.quote_items;
drop policy if exists "Enable read access for all authenticated users" on public.user_profiles;
drop policy if exists "Enable write access for authenticated users" on public.user_profiles;
drop policy if exists "Enable update access for authenticated users" on public.user_profiles;
drop policy if exists "Enable delete access for authenticated users" on public.user_profiles;

-- NOVAS POLÍTICAS OTIMIZADAS

-- Usuário vê seu perfil OU perfis da mesma empresa (Usando função Security Definer para evitar recursão)
create policy "Profiles Visibility" on public.user_profiles
  for all using (
    user_id = auth.uid() 
    OR 
    owner_id = get_my_company_id()
  );

-- Dados da Empresa (Acesso via owner_id retornado pela função)
create policy "Company Data Access" on public.clients for all using ( owner_id = get_my_company_id() );
create policy "Company Data Access" on public.products for all using ( owner_id = get_my_company_id() );
create policy "Company Data Access" on public.industries for all using ( owner_id = get_my_company_id() );
create policy "Company Data Access" on public.carriers for all using ( owner_id = get_my_company_id() );
create policy "Company Data Access" on public.orders for all using ( owner_id = get_my_company_id() );
create policy "Company Data Access" on public.quotes for all using ( owner_id = get_my_company_id() );
create policy "Company Data Access" on public.companies for all using ( owner_id = get_my_company_id() );
create policy "Company Data Access" on public.system_parameters for all using ( owner_id = get_my_company_id() );

-- Itens (Acesso livre para autenticados, filtragem é feita pelo Pai)
create policy "Items Access" on public.order_items for all using (true);
create policy "Items Access" on public.quote_items for all using (true);

-- =========================================================
-- 5. FUNÇÃO PARA EXCLUSÃO
-- =========================================================

create or replace function public.delete_user_by_profile_id(profile_id_input uuid)
returns void as $$
declare
  target_auth_id uuid;
begin
  select user_id into target_auth_id from public.user_profiles where id = profile_id_input;
  delete from public.user_profiles where id = profile_id_input;
  if target_auth_id is not null then
    delete from auth.users where id = target_auth_id;
  end if;
end;
$$ language plpgsql security definer;

-- Configura Storage
insert into storage.buckets (id, name, public) values ('logos', 'logos', true) on conflict (id) do nothing;
`;
