-- ============================================================
-- Migration: Régua de acesso por tempo (Nory produto digital)
--
-- Gateways como a Nory entregam produto digital com tempo de acesso
-- (vitalício / N meses / N dias) + trial opcional. Esta migração:
--   1. Guarda a regra na order (access_type/value/trial_days).
--   2. Adiciona expires_at em course_customers (NULL = vitalício).
--   3. reconcile_order_access calcula e grava expires_at no grant.
--   4. is_enrolled_in_course / can_view_showcase ignoram acessos expirados
--      (enforcement central — vale p/ portal, player de vídeo e RLS).
--
-- Retrocompatível: tudo NULL = comportamento atual (acesso vitalício).
-- Acessos concedidos por admin/equipe/manual continuam vitalícios (NULL).
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. Regra de acesso na order
-- ─────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS access_type       text,
  ADD COLUMN IF NOT EXISTS access_value      integer,
  ADD COLUMN IF NOT EXISTS access_trial_days integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_access_type_check'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_access_type_check
      CHECK (access_type IS NULL OR access_type IN ('vitalicio', 'meses', 'dias'));
  END IF;
END$$;

-- ─────────────────────────────────────────────
-- 2. expires_at em course_customers (NULL = vitalício)
-- ─────────────────────────────────────────────

ALTER TABLE public.course_customers
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Index parcial: só acessos com prazo (a maioria é vitalícia/NULL).
CREATE INDEX IF NOT EXISTS idx_course_customers_expires_at
  ON public.course_customers(expires_at)
  WHERE expires_at IS NOT NULL;

-- ─────────────────────────────────────────────
-- 3. Enforcement central: ignorar acessos expirados
-- ─────────────────────────────────────────────

-- is_enrolled_in_course — versão de 20260306120000 + filtro de expiração no Caso 1.
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(_course_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- Caso 1: acesso direto ao curso via course_customers (compra ou manual)
    SELECT 1
    FROM public.course_customers cc
    WHERE cc.course_id = _course_id
      AND cc.user_id = auth.uid()
      AND (cc.expires_at IS NULL OR cc.expires_at > now())
  )
  OR EXISTS (
    -- Caso 2: curso em vitrine pública + user é customer do tenant (legado)
    SELECT 1
    FROM public.showcase_courses sc
    JOIN public.showcases s ON s.id = sc.showcase_id
    WHERE sc.course_id = _course_id
      AND s.is_public = true
      AND public.is_tenant_customer(s.tenant_id)
  )
  OR EXISTS (
    -- Caso 3: user é membro da equipe do tenant (tenant_users)
    -- → acesso automático a todos os cursos do tenant
    SELECT 1
    FROM public.tenant_users tu
    JOIN public.courses c ON c.tenant_id = tu.tenant_id
    WHERE c.id = _course_id
      AND tu.user_id = auth.uid()
  )
$$;

-- can_view_showcase — versão de 20260301000000 + filtro de expiração.
CREATE OR REPLACE FUNCTION public.can_view_showcase(_showcase_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.showcases s
    WHERE s.id = _showcase_id
      AND (
        public.is_tenant_editor(s.tenant_id)
        OR public.is_admin()
        OR (
          public.is_tenant_member(s.tenant_id)
          AND (
            s.is_public = true
            OR EXISTS (
              -- User tem acesso (não expirado) a pelo menos 1 curso desta vitrine
              SELECT 1
              FROM public.showcase_courses sc
              JOIN public.course_customers cc ON cc.course_id = sc.course_id
              WHERE sc.showcase_id = s.id
                AND cc.user_id = auth.uid()
                AND (cc.expires_at IS NULL OR cc.expires_at > now())
            )
          )
        )
      )
  )
$$;

-- ─────────────────────────────────────────────
-- 4. reconcile_order_access — calcula e grava expires_at no grant
--    (versão de 20260314000000 + régua de acesso)
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reconcile_order_access(
  p_order_id uuid,
  p_trigger_source text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_order RECORD;
  v_customer RECORD;
  v_product RECORD;
  v_user_id uuid;
  v_auth_user_id uuid;
  v_courses_granted int := 0;
  v_courses_already_had int := 0;
  v_courses_revoked int := 0;
  v_product_has_courses boolean := false;
  v_is_active boolean;
  v_expires_at timestamptz;
  v_anchor timestamptz;
BEGIN
  -- 1. Buscar order (inclui régua de acesso + âncora de tempo)
  SELECT o.id, o.customer_id, o.product_id, o.status, o.tenant_id,
         o.access_type, o.access_value, o.access_trial_days,
         o.gateway_order_created_at
  INTO v_order
  FROM orders o
  WHERE o.id = p_order_id;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_message', 'Order não encontrada'
    );
  END IF;

  -- 2. Buscar product
  SELECT p.id, p.benefit, p.name
  INTO v_product
  FROM products p
  WHERE p.id = v_order.product_id;

  IF v_product IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_message', 'Produto não encontrado'
    );
  END IF;

  -- 3. Buscar customer (ANTES do check de benefit — necessário para todos os tipos)
  SELECT c.id, c.user_id, c.email, c.name
  INTO v_customer
  FROM customers c
  WHERE c.id = v_order.customer_id;

  IF v_customer IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'error_message', 'Customer não encontrado'
    );
  END IF;

  v_user_id := v_customer.user_id;

  -- 4. Se customer não tem user_id, tentar encontrar auth.user por email
  IF v_user_id IS NULL THEN
    SELECT au.id INTO v_auth_user_id
    FROM auth.users au
    WHERE lower(au.email) = lower(v_customer.email)
    LIMIT 1;

    IF v_auth_user_id IS NOT NULL THEN
      UPDATE customers SET user_id = v_auth_user_id WHERE id = v_customer.id;
      v_user_id := v_auth_user_id;
    ELSE
      RETURN jsonb_build_object(
        'status', 'needs_auth_user',
        'customer_id', v_customer.id,
        'customer_email', v_customer.email,
        'customer_name', v_customer.name,
        'user_id', null,
        'product_has_courses', (v_product.benefit = 'courses'),
        'courses_granted', 0,
        'courses_already_had', 0,
        'courses_revoked', 0
      );
    END IF;
  END IF;

  -- 5. Se produto não é de cursos: identidade resolvida, sem materializar acesso
  IF v_product.benefit != 'courses' THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'customer')
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
      'status', 'ok',
      'customer_id', v_customer.id,
      'user_id', v_user_id,
      'customer_email', v_customer.email,
      'customer_name', v_customer.name,
      'product_has_courses', false,
      'courses_granted', 0,
      'courses_already_had', 0,
      'courses_revoked', 0,
      'note', 'Produto não é do tipo courses — sem acesso a materializar'
    );
  END IF;

  -- 6. Produto é de cursos — verificar se tem cursos vinculados
  SELECT EXISTS(
    SELECT 1 FROM product_courses WHERE product_id = v_product.id
  ) INTO v_product_has_courses;

  IF NOT v_product_has_courses THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'customer')
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
      'status', 'ok',
      'customer_id', v_customer.id,
      'user_id', v_user_id,
      'customer_email', v_customer.email,
      'customer_name', v_customer.name,
      'product_has_courses', false,
      'courses_granted', 0,
      'courses_already_had', 0,
      'courses_revoked', 0,
      'note', 'Produto de cursos sem cursos vinculados em product_courses'
    );
  END IF;

  -- 6b. Calcular expiração a partir da régua da order.
  --     Âncora = data da compra no gateway (fallback: agora).
  --     vitalício / sem regra / valor <= 0  → NULL (acesso permanente).
  --     meses/dias → âncora + trial_days + (value meses|dias).
  IF v_order.access_type IN ('meses', 'dias')
     AND COALESCE(v_order.access_value, 0) > 0 THEN
    v_anchor := COALESCE(v_order.gateway_order_created_at, now());
    v_expires_at := v_anchor
      + (COALESCE(v_order.access_trial_days, 0) || ' days')::interval
      + CASE v_order.access_type
          WHEN 'meses' THEN (v_order.access_value || ' months')::interval
          WHEN 'dias'  THEN (v_order.access_value || ' days')::interval
        END;
  ELSE
    v_expires_at := NULL; -- vitalício
  END IF;

  -- 7. Materializar acesso baseado no status da order
  v_is_active := v_order.status IN ('approved', 'completed');

  IF v_is_active THEN
    -- Quantos o user já tinha (acesso atual, vivo ou expirado — pré-grant)
    SELECT count(*) INTO v_courses_already_had
    FROM course_customers cc
    JOIN product_courses pc ON pc.course_id = cc.course_id
    WHERE pc.product_id = v_order.product_id
      AND cc.user_id = v_user_id;

    -- GRANT/RENOVA: upsert course_customers com expires_at.
    -- Em conflito, ESTENDE o acesso (nunca encurta): vitalício (NULL) vence;
    -- entre dois prazos, fica o maior. xmax=0 ⇒ linha realmente inserida.
    WITH upserted AS (
      INSERT INTO course_customers (course_id, user_id, expires_at)
      SELECT pc.course_id, v_user_id, v_expires_at
      FROM product_courses pc
      WHERE pc.product_id = v_order.product_id
      ON CONFLICT (course_id, user_id) DO UPDATE
        SET expires_at = CASE
          WHEN course_customers.expires_at IS NULL OR EXCLUDED.expires_at IS NULL THEN NULL
          ELSE GREATEST(course_customers.expires_at, EXCLUDED.expires_at)
        END
      RETURNING (xmax = 0) AS was_insert
    )
    SELECT count(*) FILTER (WHERE was_insert) INTO v_courses_granted
    FROM upserted;

  ELSIF v_order.status IN ('cancelled', 'refunded', 'chargeback') THEN
    -- REVOKE: remover course_customers, protegendo cursos de outras orders ativas
    WITH deleted AS (
      DELETE FROM course_customers cc
      WHERE cc.user_id = v_user_id
        AND cc.course_id IN (
          SELECT pc.course_id FROM product_courses pc WHERE pc.product_id = v_order.product_id
        )
        AND cc.course_id NOT IN (
          SELECT pc2.course_id
          FROM orders o2
          JOIN product_courses pc2 ON pc2.product_id = o2.product_id
          WHERE o2.customer_id = v_order.customer_id
            AND o2.id != v_order.id
            AND o2.status IN ('approved', 'completed')
        )
      RETURNING 1
    )
    SELECT count(*) INTO v_courses_revoked FROM deleted;
  END IF;

  -- Garantir role customer
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'customer')
  ON CONFLICT DO NOTHING;

  -- 8. Retornar relatório
  RETURN jsonb_build_object(
    'status', 'ok',
    'customer_id', v_customer.id,
    'user_id', v_user_id,
    'customer_email', v_customer.email,
    'customer_name', v_customer.name,
    'product_has_courses', true,
    'courses_granted', v_courses_granted,
    'courses_already_had', v_courses_already_had,
    'courses_revoked', v_courses_revoked,
    'access_expires_at', v_expires_at
  );
END;
$$;
