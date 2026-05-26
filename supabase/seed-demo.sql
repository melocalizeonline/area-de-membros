-- Conteudo inicial para visualizar a experiencia premium.
-- Ajuste o e-mail abaixo para o usuario que deve receber o acesso.

do $$
declare
  v_email text := 'melocalize.online@gmail.com';
  v_user uuid;
  v_product uuid;
  v_course uuid;
  v_module_intro uuid;
  v_module_tools uuid;
begin
  select id into v_user from auth.users where email = v_email;

  if v_user is null then
    raise notice 'Usuario % ainda nao existe em auth.users', v_email;
    return;
  end if;

  insert into public.profiles (id, name, email, is_admin, active)
  values (v_user, 'Bergson', v_email, true, true)
  on conflict (id) do update
    set is_admin = true, active = true, email = excluded.email;

  insert into public.products (name, slug, description, status, external_product_id)
  values (
    'Area de Membros Premium',
    'area-de-membros-premium',
    'Acesso principal com curso, ferramentas e materiais operacionais.',
    'active',
    'demo-premium'
  )
  on conflict (slug) do update
    set description = excluded.description
  returning id into v_product;

  insert into public.member_products (member_id, product_id, source, active)
  values (v_user, v_product, 'manual', true)
  on conflict (member_id, product_id) do update set active = true;

  insert into public.courses (product_id, title, slug, description, cover_url, published, sort_order)
  values (
    v_product,
    'Curso Principal',
    'curso-principal',
    'Aulas organizadas para transformar compra em execucao pratica.',
    null,
    true,
    1
  )
  on conflict (slug) do update
    set product_id = excluded.product_id, published = true, description = excluded.description
  returning id into v_course;

  insert into public.course_modules (course_id, title, sort_order)
  values (v_course, 'Comece por aqui', 1)
  returning id into v_module_intro;

  insert into public.course_modules (course_id, title, sort_order)
  values (v_course, 'Ferramentas e operacao', 2)
  returning id into v_module_tools;

  insert into public.lessons
    (module_id, title, description, video_provider, video_url, duration_seconds, published, sort_order)
  values
    (v_module_intro, 'Boas-vindas e mapa da area', 'Entenda como navegar, consumir aulas e usar as ferramentas.', 'youtube', 'https://youtube.com', 420, true, 1),
    (v_module_intro, 'Como usar os materiais liberados', 'Organize sua rotina e acompanhe os recursos principais.', 'youtube', 'https://youtube.com', 560, true, 2),
    (v_module_tools, 'Fluxo de ferramentas', 'Como acessar calculadoras, geradores e links externos.', 'youtube', 'https://youtube.com', 680, true, 1);

  insert into public.tools
    (product_id, name, slug, description, tool_type, external_url, published, sort_order)
  values
    (v_product, 'Gerador de Diagnostico', 'gerador-diagnostico', 'Monte uma analise rapida com passos claros para executar.', 'internal', null, true, 1),
    (v_product, 'Checklist Operacional', 'checklist-operacional', 'Lista guiada para revisar campanhas, paginas e entregas.', 'internal', null, true, 2),
    (v_product, 'Biblioteca de Links', 'biblioteca-links', 'Links externos e referencias importantes em um so lugar.', 'external', 'https://melocalize.online', true, 3);
end $$;
