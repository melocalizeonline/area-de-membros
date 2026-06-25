-- Visibilidade de PRODUTO no portal (mesma lógica de cursos)
alter table public.products
  add column if not exists portal_visibility text not null default 'hidden';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_portal_visibility_check') then
    alter table public.products
      add constraint products_portal_visibility_check
      check (portal_visibility in ('hidden','locked'));
  end if;
end $$;

-- Generaliza access_requests para curso OU produto
alter table public.access_requests alter column course_id drop not null;
alter table public.access_requests
  add column if not exists product_id uuid references public.products(id) on delete cascade;

-- Exatamente um alvo (curso XOR produto)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'access_requests_target_chk') then
    alter table public.access_requests
      add constraint access_requests_target_chk
      check ((course_id is not null) <> (product_id is not null));
  end if;
end $$;

-- Unicidade por produto (constraint normal: NULLs são distintos, não afeta cursos).
-- Constraint (não índice parcial) para que ON CONFLICT (product_id,user_id) funcione.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'access_requests_product_user_key') then
    alter table public.access_requests
      add constraint access_requests_product_user_key unique (product_id, user_id);
  end if;
end $$;
