

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "archive";


ALTER SCHEMA "archive" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'admin',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."class_band" AS ENUM (
    'A',
    'AB',
    'ABC',
    'B',
    'BC',
    'C',
    'CD',
    'D',
    'E',
    'ND',
    'ABCD'
);


ALTER TYPE "public"."class_band" OWNER TO "postgres";


CREATE TYPE "public"."marco_status" AS ENUM (
    'pendente',
    'em_andamento',
    'concluido',
    'atrasado'
);


ALTER TYPE "public"."marco_status" OWNER TO "postgres";


CREATE TYPE "public"."proposal_status" AS ENUM (
    'rascunho',
    'enviada',
    'em_analise',
    'aceita',
    'rejeitada'
);


ALTER TYPE "public"."proposal_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."proposal_status" IS 'Status das propostas: rascunho -> enviada -> em_analise -> aceita/rejeitada';



CREATE TYPE "public"."role_kind" AS ENUM (
    'user',
    'manager',
    'admin',
    'super_admin'
);


ALTER TYPE "public"."role_kind" OWNER TO "postgres";


CREATE TYPE "public"."tipo_insercao" AS ENUM (
    'manual',
    'automatica'
);


ALTER TYPE "public"."tipo_insercao" OWNER TO "postgres";


CREATE TYPE "public"."tipo_insercao_enum" AS ENUM (
    'Tipo 1',
    'Tipo 2',
    'Tipo 3',
    'Tipo 4'
);


ALTER TYPE "public"."tipo_insercao_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_strip_state_noise"("src" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE PARALLEL SAFE
    AS $_$
DECLARE
  s TEXT := src;
BEGIN
  IF s IS NULL THEN
    RETURN NULL;
  END IF;

  -- normaliza espaços
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := btrim(s);

  -- remove prefixos/sufixos comuns (usar flags no 4º parâmetro)
  s := regexp_replace(s, '^\s*(estado( do| da| de)?\s+)', '', 'gi');
  s := regexp_replace(s, '\s*,?\s*brasil\s*$', '', 'gi');

  RETURN s;
END;
$_$;


ALTER FUNCTION "public"."_strip_state_noise"("src" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accounts_admin_list"() RETURNS TABLE("id" "uuid", "email" "text", "email_verified" boolean, "display_name" "text", "avatar_url" "text", "providers" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT
    u.id,
    u.email,
    (u.email_confirmed_at IS NOT NULL) AS email_verified,
    p.display_name,
    p.avatar_url,
    COALESCE(
      ARRAY_AGG(i.provider ORDER BY i.provider)
        FILTER (WHERE i.provider IS NOT NULL),
      '{}'
    ) AS providers,
    p.created_at,
    p.updated_at
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  LEFT JOIN auth.identities i ON i.user_id = u.id
  WHERE public.is_admin()               -- gate de permissão
  GROUP BY
    u.id, u.email, u.email_confirmed_at,
    p.display_name, p.avatar_url, p.created_at, p.updated_at
  ORDER BY p.display_name NULLS LAST, u.email;
$$;


ALTER FUNCTION "public"."accounts_admin_list"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_screen_as_admin"("screen_data" "jsonb") RETURNS "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_screen record;
BEGIN
  -- PASSO 1: VERIFICAR SE O CHAMADOR É REALMENTE UM ADMIN
  -- Mesmo sendo SECURITY DEFINER, a função precisa se autoproteger.
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Forbidden: Not an admin';
  END IF;

  -- PASSO 2: INSERIR OS DADOS NA TABELA 'screens'
  -- Usamos os dados passados pelo frontend via JSONB
  INSERT INTO public.screens (
    code,
    name,
    venue_id,
    lat,
    lng,
    active,
    -- Adicione outros campos que vêm do JSONB aqui
    display_name,
    board_format,
    category
  )
  VALUES (
    screen_data->>'code',
    screen_data->>'name',
    (screen_data->>'venue_id')::bigint,
    (screen_data->>'lat')::double precision,
    (screen_data->>'lng')::double precision,
    (screen_data->>'active')::boolean,
    screen_data->>'display_name',
    screen_data->>'board_format',
    screen_data->>'category'
  )
  RETURNING * INTO new_screen; -- Retorna a linha recém-criada

  RETURN new_screen;
END;
$$;


ALTER FUNCTION "public"."add_screen_as_admin"("screen_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."array_distinct_nonempty"("a" "text"[]) RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case when a is null then array[]::text[] 
              else (select coalesce(array_agg(distinct x) filter (where x is not null and length(trim(x))>0), array[]::text[])
                    from unnest(a) as x)
         end;
$$;


ALTER FUNCTION "public"."array_distinct_nonempty"("a" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."business_days_between"("p_start" "date", "p_end" "date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  d int := 0;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start THEN
    RETURN 0;
  END IF;

  WITH days AS (
    SELECT dd::date AS d
    FROM generate_series(p_start, p_end, interval '1 day') dd
  )
  SELECT COUNT(*)
    INTO d
  FROM days
  LEFT JOIN public.holidays h
    ON h.day = days.d AND h.scope = 'national'
  WHERE EXTRACT(DOW FROM days.d) NOT IN (0,6)
    AND h.id IS NULL;

  RETURN d;
END$$;


ALTER FUNCTION "public"."business_days_between"("p_start" "date", "p_end" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."business_days_between"("p_start" "date", "p_end" "date") IS 'Calcula dias úteis entre duas datas, excluindo fins de semana e feriados nacionais. SECURITY DEFINER para uso em triggers.';



CREATE OR REPLACE FUNCTION "public"."check_auth"() RETURNS TABLE("is_authenticated" boolean, "user_id" "uuid", "user_email" "text", "user_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, 'user'::text;
  ELSE
    RETURN QUERY 
    SELECT 
      true,
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'role', 'user')
    FROM auth.users u
    WHERE u.id = current_user_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."check_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_text_array"("arr" "text"[]) RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select coalesce(
    array_agg(distinct v) filter (where v is not null and v <> ''),
    '{}'
  )
  from unnest(coalesce(arr, '{}')) a(x)
  cross join lateral (select public.strip_braces_quotes(a.x)) s(v);
$$;


ALTER FUNCTION "public"."clean_text_array"("arr" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_email_log"("p_proposal_id" bigint, "p_email_type" character varying, "p_recipient_email" character varying, "p_recipient_type" character varying, "p_subject" "text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_log_id BIGINT;
BEGIN
    INSERT INTO public.email_logs (
        proposal_id,
        email_type,
        recipient_email,
        recipient_type,
        subject,
        created_by
    ) VALUES (
        p_proposal_id,
        p_email_type,
        p_recipient_email,
        p_recipient_type,
        p_subject,
        auth.uid()
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END$$;


ALTER FUNCTION "public"."create_email_log"("p_proposal_id" bigint, "p_email_type" character varying, "p_recipient_email" character varying, "p_recipient_type" character varying, "p_subject" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_email_log"("p_proposal_id" bigint, "p_email_type" character varying, "p_recipient_email" character varying, "p_recipient_type" character varying, "p_subject" "text") IS 'Cria um log de email para ser processado pelo sistema de envio';



CREATE OR REPLACE FUNCTION "public"."create_project"("p_nome_projeto" "text", "p_agencia_id" "uuid", "p_deal_id" "uuid" DEFAULT NULL::"uuid", "p_status_projeto" "text" DEFAULT 'ativo'::"text", "p_orcamento_projeto" numeric DEFAULT 0, "p_valor_gasto" numeric DEFAULT 0, "p_data_inicio" "date" DEFAULT NULL::"date", "p_data_fim" "date" DEFAULT NULL::"date", "p_cliente_final" "text" DEFAULT NULL::"text", "p_responsavel_projeto" "uuid" DEFAULT NULL::"uuid", "p_prioridade" "text" DEFAULT 'media'::"text", "p_progresso" integer DEFAULT 0, "p_descricao" "text" DEFAULT NULL::"text", "p_briefing" "text" DEFAULT NULL::"text", "p_objetivos" "text"[] DEFAULT '{}'::"text"[], "p_tags" "text"[] DEFAULT '{}'::"text"[], "p_arquivos_anexos" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_project_id UUID;
  result JSONB;
BEGIN
  -- Insert project directly (bypassing RLS due to SECURITY DEFINER)
  INSERT INTO public.agencia_projetos (
    nome_projeto,
    agencia_id,
    deal_id,
    status_projeto,
    orcamento_projeto,
    valor_gasto,
    data_inicio,
    data_fim,
    cliente_final,
    responsavel_projeto,
    prioridade,
    progresso,
    descricao,
    briefing,
    objetivos,
    tags,
    arquivos_anexos,
    created_by
  ) VALUES (
    p_nome_projeto,
    p_agencia_id,
    p_deal_id,
    p_status_projeto,
    p_orcamento_projeto,
    p_valor_gasto,
    p_data_inicio,
    p_data_fim,
    p_cliente_final,
    p_responsavel_projeto,
    p_prioridade,
    p_progresso,
    p_descricao,
    p_briefing,
    p_objetivos,
    p_tags,
    p_arquivos_anexos,
    auth.uid()
  ) RETURNING id INTO new_project_id;

  -- Return the created project data
  SELECT to_jsonb(ap.*) INTO result
  FROM public.agencia_projetos ap
  WHERE ap.id = new_project_id;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;


ALTER FUNCTION "public"."create_project"("p_nome_projeto" "text", "p_agencia_id" "uuid", "p_deal_id" "uuid", "p_status_projeto" "text", "p_orcamento_projeto" numeric, "p_valor_gasto" numeric, "p_data_inicio" "date", "p_data_fim" "date", "p_cliente_final" "text", "p_responsavel_projeto" "uuid", "p_prioridade" "text", "p_progresso" integer, "p_descricao" "text", "p_briefing" "text", "p_objetivos" "text"[], "p_tags" "text"[], "p_arquivos_anexos" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_project"("p_nome_projeto" "text", "p_agencia_id" "uuid", "p_deal_id" "uuid", "p_status_projeto" "text", "p_orcamento_projeto" numeric, "p_valor_gasto" numeric, "p_data_inicio" "date", "p_data_fim" "date", "p_cliente_final" "text", "p_responsavel_projeto" "uuid", "p_prioridade" "text", "p_progresso" integer, "p_descricao" "text", "p_briefing" "text", "p_objetivos" "text"[], "p_tags" "text"[], "p_arquivos_anexos" "jsonb") IS 'Creates a project bypassing RLS policies - SECURITY DEFINER function';



CREATE OR REPLACE FUNCTION "public"."debug_permissions"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_id', auth.uid(),
    'email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'is_super_admin', public.is_super_admin(),
    'is_manager_or_above', public.is_manager_or_above(),
    'profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = auth.uid()),
    'roles', (SELECT json_agg(r.role) FROM public.user_roles r WHERE r.user_id = auth.uid())
  ) INTO result;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."debug_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_screen_as_admin"("screen_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Verificar se o usuário é admin
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Se não for admin, retornar erro
    IF user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Apenas administradores podem deletar telas';
    END IF;
    
    -- Deletar a tela
    DELETE FROM public.screens
    WHERE id = screen_id;
    
    -- Retornar true se a operação foi bem-sucedida
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."delete_screen_as_admin"("screen_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."ensure_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_profile"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (id, email, full_name, display_name, role)
  SELECT 
    auth.uid(),
    auth.jwt() ->> 'email',
    COALESCE(auth.jwt() ->> 'full_name', auth.jwt() ->> 'email'),
    COALESCE(auth.jwt() ->> 'full_name', auth.jwt() ->> 'email'),
    'user'
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
  );

  -- Insert user role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  SELECT auth.uid(), 'user'
  WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
  )
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."ensure_profile"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_profile"() IS 'Ensure user profile exists - SECURITY DEFINER for RLS';



CREATE OR REPLACE FUNCTION "public"."find_nearby_screens"("lat_in" double precision, "lng_in" double precision, "radius_meters_in" double precision) RETURNS TABLE("id" bigint, "name" "text", "display_name" "text", "city" "text", "state" "text", "lat" double precision, "lng" double precision, "active" boolean, "clase" "text", "address_raw" "text", "venue_name" "text", "distance" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.name,
        s.display_name,
        s.city,
        s.state,
        s.lat,
        s.lng,
        s.active,
        s.clase, -- <--- CORRIGIDO
        s.address_raw,
        v.name as venue_name,
        -- Calcula a distância em metros e a converte para KM
        ST_Distance(s.geom, ST_SetSRID(ST_MakePoint(lng_in, lat_in), 4326)::geography) / 1000.0 as distance
    FROM
        public.screens AS s
    LEFT JOIN
        public.venues AS v ON s.venue_id = v.id
    WHERE
        s.active = TRUE
        AND s.geom IS NOT NULL
        -- ST_DWithin é a função mágica que usa o índice para filtrar por raio de forma ultra-rápida
        AND ST_DWithin(
            s.geom,
            ST_SetSRID(ST_MakePoint(lng_in, lat_in), 4326)::geography,
            radius_meters_in
        )
    ORDER BY
        distance -- Ordena pelos mais próximos
    LIMIT 20; -- Limita o resultado
END;
$$;


ALTER FUNCTION "public"."find_nearby_screens"("lat_in" double precision, "lng_in" double precision, "radius_meters_in" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_screens_count_v1"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean DEFAULT true) RETURNS bigint
    LANGUAGE "sql" STABLE
    AS $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(lng_in, lat_in), 4326)::geography as g
  )
  select count(*)
  from public.screens s
  cross join origin o
  where
    (city_in is null or norm_text_imm(s.city) = norm_text_imm(city_in))
    and (class_in is null or s.class::text = class_in)
    and s.geom_geog is not null
    and ST_DWithin(s.geom_geog, o.g, radius_km_in * 1000.0)
    and (not only_active or coalesce(s.active, true));
$$;


ALTER FUNCTION "public"."find_screens_count_v1"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean DEFAULT true) RETURNS TABLE("screen_id" bigint, "screen_code" "text", "display_name" "text", "city" "text", "class" "text", "active" boolean, "lat" double precision, "lng" double precision, "distance_m" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(lng_in, lat_in), 4326)::geography as g
  )
  select
    s.id,
    s.code,
    s.display_name,
    s.city,
    s.class::text as class,              -- enum -> texto
    s.active,
    s.lat,
    s.lng,
    ST_Distance(s.geom, o.g) as distance_m
  from screens s
  cross join origin o
  where
    s.geom is not null
    and ST_DWithin(s.geom, o.g, radius_km_in * 1000.0)              -- km -> metros
    and (
      city_in is null
      or unaccent(lower(s.city)) = unaccent(lower(city_in))          -- ignora acento/caixa
    )
    and (
      class_in is null
      or s.class::text = upper(class_in)                             -- enum comparado com texto
    )
    and (
      only_active is false
      or s.active is true
    )
  order by ST_Distance(s.geom, o.g);
$$;


ALTER FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "public"."class_band", "lat_in" double precision, "lng_in" double precision, "radius_km_in" numeric, "only_active" boolean DEFAULT true) RETURNS TABLE("id" bigint, "code" "text", "name" "text", "city" "text", "state" "text", "class" "public"."class_band", "distance_m" numeric)
    LANGUAGE "sql" STABLE
    AS $$
  with origin as (
    select geography(ST_SetSRID(ST_MakePoint(lng_in, lat_in),4326)) g
  )
  select s.id, s.code, s.name, s.city, s.state, s.class,
         ST_Distance(s.geom, o.g) as distance_m
  from public.screens s
  cross join origin o
  where s.geom is not null
    and (city_in  is null or s.city_norm = public.norm_text_imm(city_in))
    and (class_in is null or s.class = class_in)
    and (only_active is false or s.active is true)
    and ST_DWithin(s.geom, o.g, (radius_km_in * 1000.0));
$$;


ALTER FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "public"."class_band", "lat_in" double precision, "lng_in" double precision, "radius_km_in" numeric, "only_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_screens_v2"("in_city" "text", "in_class" "public"."class_band", "in_center_lat" double precision, "in_center_lng" double precision, "in_radius_km" double precision, "in_start_date" "date" DEFAULT NULL::"date", "in_end_date" "date" DEFAULT NULL::"date", "in_specialty_any" "text"[] DEFAULT NULL::"text"[], "in_exclude_ids" bigint[] DEFAULT NULL::bigint[]) RETURNS TABLE("screen_id" bigint, "code" "text", "name" "text", "address_norm" "text", "lat" double precision, "lng" double precision, "class" "public"."class_band", "distance_m" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  with center as (
    select ST_SetSRID(ST_MakePoint(in_center_lng, in_center_lat), 4326)::geography as g
  ),
  eligible as (
    select s.*
    from public.screens s, center c
    where s.active
      and (in_city is null or s.city ilike in_city)
      and (in_class is null or s.class = in_class)
      and (in_exclude_ids is null or s.id <> all(in_exclude_ids))
      and (in_specialty_any is null or s.specialty && in_specialty_any)
      and s.geom is not null
      and ST_DWithin(s.geom, c.g, in_radius_km * 1000.0)
  ),
  free_window as (
    select e.*
    from eligible e
    where (in_start_date is null or in_end_date is null)
       or public.is_screen_free(e.id, in_start_date, in_end_date)
  )
  select
    f.id, f.code, f.name, f.address_norm, f.lat, f.lng, f.class,
    ST_DistanceSphere(
      ST_SetSRID(ST_MakePoint(f.lng, f.lat), 4326),
      ST_SetSRID(ST_MakePoint(in_center_lng, in_center_lat), 4326)
    ) as distance_m
  from free_window f
  order by distance_m asc;
$$;


ALTER FUNCTION "public"."find_screens_v2"("in_city" "text", "in_class" "public"."class_band", "in_center_lat" double precision, "in_center_lng" double precision, "in_radius_km" double precision, "in_start_date" "date", "in_end_date" "date", "in_specialty_any" "text"[], "in_exclude_ids" bigint[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_screens_v3"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean DEFAULT true) RETURNS TABLE("screen_id" bigint, "venue_id" bigint, "city" "text", "state" "text", "class" "text", "distance_m" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  with origin as (
    select ST_SetSRID(ST_MakePoint(lng_in, lat_in), 4326)::geography as g
  )
  select
    s.id as screen_id,
    s.venue_id,
    s.city,
    s.state,
    s.class::text as class,
    ST_Distance(s.geom_geog, o.g) as distance_m
  from public.screens s
  cross join origin o
  where
    (city_in is null or norm_text_imm(s.city) = norm_text_imm(city_in))
    and (class_in is null or s.class::text = class_in)
    and s.geom_geog is not null
    and ST_DWithin(s.geom_geog, o.g, radius_km_in * 1000.0)
    and (not only_active or coalesce(s.active, true))
  order by ST_Distance(s.geom_geog, o.g) asc, s.id asc;
$$;


ALTER FUNCTION "public"."find_screens_v3"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_screens_v4"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean DEFAULT true, "sort_by_distance" boolean DEFAULT true, "limit_in" integer DEFAULT 200, "offset_in" integer DEFAULT 0) RETURNS TABLE("screen_id" bigint, "venue_id" bigint, "city" "text", "state" "text", "class" "text", "distance_m" double precision)
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  return query
  with origin as (
    select ST_SetSRID(ST_MakePoint(lng_in, lat_in), 4326)::geography as g
  )
  select
    s.id, s.venue_id, s.city, s.state, s.class::text,
    ST_Distance(s.geom_geog, o.g) as distance_m
  from public.screens s
  cross join origin o
  where
    (city_in is null or norm_text_imm(s.city) = norm_text_imm(city_in))
    and (class_in is null or s.class::text = class_in)
    and s.geom_geog is not null
    and ST_DWithin(s.geom_geog, o.g, radius_km_in * 1000.0)
    and (not only_active or coalesce(s.active, true))
  order by case when sort_by_distance then ST_Distance(s.geom_geog, o.g) end asc nulls last, s.id
  limit limit_in offset offset_in;
end;
$$;


ALTER FUNCTION "public"."find_screens_v4"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean, "sort_by_distance" boolean, "limit_in" integer, "offset_in" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END
    $$;


ALTER FUNCTION "public"."fn_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_sync_user_email_to_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Quando email for alterado em auth.users, atualiza profiles
    UPDATE public.profiles
    SET email = NEW.email
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."fn_sync_user_email_to_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gen_codigo_agencia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
declare
  next_num int;
begin
  if new.codigo_agencia is null or new.codigo_agencia = '' then
    next_num := nextval('agencias_codigo_seq');
    new.codigo_agencia := 'A' || lpad(next_num::text, 3, '0');
  else
    if new.codigo_agencia !~ '^A[0-9]{3}$' then
      raise exception 'codigo_agencia deve seguir o padrão A000 (ex.: A200)';
    end if;
  end if;
  return new;
end;
$_$;


ALTER FUNCTION "public"."gen_codigo_agencia"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_cities"("p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("city" "text", "screen_count" bigint, "proposal_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.city,
    COUNT(DISTINCT s.id) AS screen_count,
    COUNT(DISTINCT ps.proposal_id) AS proposal_count
  FROM
    public.screens AS s
  JOIN
    public.proposal_screens AS ps ON s.id = ps.screen_id
  JOIN
    public.proposals AS p ON ps.proposal_id = p.id
  WHERE
    s.lat IS NOT NULL 
    AND s.lng IS NOT NULL
    AND s.city IS NOT NULL
    AND (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date)
  GROUP BY
    s.city
  ORDER BY
    proposal_count DESC;
END;
$$;


ALTER FUNCTION "public"."get_available_cities"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_cities"("p_start_date" "date", "p_end_date" "date") IS 'Função para obter lista de cidades disponíveis no heatmap';



CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Get current user role
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Return the role or 'user' as default
    RETURN COALESCE(user_role, 'user');
EXCEPTION
    WHEN OTHERS THEN
        -- Return default role in case of any error
        RETURN 'user';
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_role"() IS 'Get current authenticated user role - SECURITY DEFINER for RLS';



CREATE OR REPLACE FUNCTION "public"."get_equipe_stats"("projeto_uuid" "uuid") RETURNS TABLE("total_membros" bigint, "total_coordenadores" bigint, "total_gerentes" bigint, "total_diretores" bigint, "membros_ativos" bigint)
    LANGUAGE "sql" STABLE
    AS $$
  SELECT 
    COUNT(*) FILTER (WHERE papel = 'membro') as total_membros,
    COUNT(*) FILTER (WHERE papel = 'coordenador') as total_coordenadores,
    COUNT(*) FILTER (WHERE papel = 'gerente') as total_gerentes,
    COUNT(*) FILTER (WHERE papel = 'diretor') as total_diretores,
    COUNT(*) FILTER (WHERE ativo = true) as membros_ativos
  FROM agencia_projeto_equipe 
  WHERE projeto_id = projeto_uuid;
$$;


ALTER FUNCTION "public"."get_equipe_stats"("projeto_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_equipe_stats"("projeto_uuid" "uuid") IS 'Get team statistics for a project';



CREATE OR REPLACE FUNCTION "public"."get_heatmap_data"("p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_city" "text" DEFAULT NULL::"text", "p_normalize" boolean DEFAULT false) RETURNS TABLE("screen_id" bigint, "lat" double precision, "lng" double precision, "name" "text", "city" "text", "class" "text", "proposal_count" bigint, "normalized_intensity" double precision, "total_proposals_in_period" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_proposals BIGINT;
BEGIN
  -- Calcular total de propostas no período (para normalização)
  SELECT COUNT(DISTINCT p.id)
  INTO v_total_proposals
  FROM public.proposals p
  WHERE (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date);

  -- Se não há propostas no período, retornar vazio
  IF v_total_proposals = 0 THEN
    RETURN;
  END IF;

  -- Retornar dados filtrados
  RETURN QUERY
  SELECT
    s.id AS screen_id,
    s.lat,
    s.lng,
    s.name,
    s.city,
    'ND'::text AS class, -- Valor padrão
    COUNT(DISTINCT ps.proposal_id) AS proposal_count,
    CASE 
      WHEN p_normalize AND v_total_proposals > 0 THEN 
        (COUNT(DISTINCT ps.proposal_id)::DOUBLE PRECISION / v_total_proposals::DOUBLE PRECISION)
      ELSE 
        COUNT(DISTINCT ps.proposal_id)::DOUBLE PRECISION
    END AS normalized_intensity,
    v_total_proposals AS total_proposals_in_period
  FROM
    public.screens AS s
  JOIN
    public.proposal_screens AS ps ON s.id = ps.screen_id
  JOIN
    public.proposals AS p ON ps.proposal_id = p.id
  WHERE
    s.lat IS NOT NULL 
    AND s.lng IS NOT NULL
    AND (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date)
    AND (p_city IS NULL OR s.city ILIKE '%' || p_city || '%')
  GROUP BY
    s.id, s.lat, s.lng, s.name, s.city
  ORDER BY
    proposal_count DESC;
END;
$$;


ALTER FUNCTION "public"."get_heatmap_data"("p_start_date" "date", "p_end_date" "date", "p_city" "text", "p_normalize" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_heatmap_data"("p_start_date" "date", "p_end_date" "date", "p_city" "text", "p_normalize" boolean) IS 'Função para obter dados do heatmap com filtros de data e cidade';



CREATE OR REPLACE FUNCTION "public"."get_heatmap_stats"("p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_city" "text" DEFAULT NULL::"text") RETURNS TABLE("total_screens" bigint, "total_proposals" bigint, "max_intensity" bigint, "avg_intensity" double precision, "cities_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH heatmap_data AS (
    SELECT * FROM public.get_heatmap_data(p_start_date, p_end_date, p_city, false)
  )
  SELECT
    COUNT(*) AS total_screens,
    COALESCE(SUM(proposal_count), 0) AS total_proposals,
    COALESCE(MAX(proposal_count), 0) AS max_intensity,
    COALESCE(AVG(proposal_count), 0) AS avg_intensity,
    COUNT(DISTINCT city) AS cities_count
  FROM heatmap_data;
END;
$$;


ALTER FUNCTION "public"."get_heatmap_stats"("p_start_date" "date", "p_end_date" "date", "p_city" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_heatmap_stats"("p_start_date" "date", "p_end_date" "date", "p_city" "text") IS 'Função para obter estatísticas do heatmap';



CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Tenta buscar o role do usuário atual
  -- Se o usuário não tiver um role definido, retorna um valor padrão 'user'
  RETURN COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()),
    'user'
  );
END;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_emails"("p_limit" integer DEFAULT 10) RETURNS TABLE("log_id" bigint, "proposal_id" bigint, "email_type" character varying, "recipient_email" character varying, "recipient_type" character varying, "subject" "text", "customer_name" character varying, "proposal_type" character varying, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT 
        el.id as log_id,
        el.proposal_id,
        el.email_type,
        el.recipient_email,
        el.recipient_type,
        el.subject,
        COALESCE(el.customer_name, p.customer_name) as customer_name,
        COALESCE(el.proposal_type, p.proposal_type) as proposal_type,
        el.created_at
    FROM public.email_logs el
    LEFT JOIN public.proposals p ON p.id = el.proposal_id
    WHERE el.status = 'pending'
    ORDER BY el.created_at ASC
    LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_pending_emails"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_proposal_details"("p_proposal_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    proposal_data RECORD;
    inventario_summary JSONB;
    cidade_summary JSONB;
BEGIN
    -- 1. Pega os dados principais da proposta
    SELECT
        p.id,
        p.customer_name as name,
        p.status,
        p.customer_name as client_name,
        COALESCE(a.nome_agencia, 'Agência não definida') as agency_name,
        COALESCE(p.net_calendar, 0) as total_value,
        CASE 
            WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL THEN
                EXTRACT(DAY FROM (p.end_date::date - p.start_date::date)) + 1
            ELSE 30
        END as period_months,
        -- Correção do valor mensal
        CASE 
            WHEN p.start_date IS NOT NULL AND p.end_date IS NOT NULL THEN
                COALESCE(p.net_calendar, 0) / NULLIF(EXTRACT(DAY FROM (p.end_date::date - p.start_date::date)) + 1, 0)
            ELSE COALESCE(p.net_calendar, 0) / 30
        END as monthly_investment,
        -- Correção da contagem de telas
        (SELECT COUNT(*) FROM proposal_screens pi WHERE pi.proposal_id = p.id) as screens_count
    INTO proposal_data
    FROM proposals p
    LEFT JOIN agencias a ON p.agencia_id = a.id
    WHERE p.id = p_proposal_id;

    -- 2. Agrega os dados do inventário (locais, cidades, etc.)
    SELECT jsonb_agg(
        jsonb_build_object(
            'city', s.city,
            'state', s.state,
            'screens_in_city', COUNT(s.id)
        )
    )
    INTO cidade_summary
    FROM proposal_screens pi
    JOIN screens s ON pi.screen_id = s.id
    WHERE pi.proposal_id = p_proposal_id
    GROUP BY s.city, s.state;

    -- 3. Monta o JSON final de retorno
    RETURN jsonb_build_object(
        'proposal', to_jsonb(proposal_data),
        'inventory_summary_by_city', COALESCE(cidade_summary, '[]'::jsonb)
    );
END;
$$;


ALTER FUNCTION "public"."get_proposal_details"("p_proposal_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_proposal_stats"("p_proposal_id" bigint) RETURNS TABLE("screens_count" bigint, "cities_count" bigint, "states_count" bigint, "total_audience" numeric, "avg_cpm" numeric, "estimated_daily_impacts" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT 
        COUNT(ps.screen_id)::bigint as screens_count,
        COUNT(DISTINCT s.city)::bigint as cities_count,
        COUNT(DISTINCT s.state)::bigint as states_count,
        COALESCE(SUM(COALESCE(vam.audience, 0)), 0) as total_audience,
        AVG(COALESCE(ps.custom_cpm, sr.cpm, pr.cpm, 0)) as avg_cpm,
        COALESCE(SUM(COALESCE(ps.daily_traffic_override, vam.audience, 0)), 0) as estimated_daily_impacts
    FROM public.proposal_screens ps
    JOIN public.screens s ON s.id = ps.screen_id
    LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
    LEFT JOIN public.screen_rates sr ON sr.screen_id = s.id
    LEFT JOIN public.price_rules pr ON pr.screen_id = s.id
    WHERE ps.proposal_id = p_proposal_id;
$$;


ALTER FUNCTION "public"."get_proposal_stats"("p_proposal_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_proposal_stats"("p_proposal_id" bigint) IS 'Função para obter estatísticas rápidas de uma proposta (telas, cidades, audiência, etc.)';



CREATE OR REPLACE FUNCTION "public"."get_screens_by_grupo_cpm"("grupo_id" "uuid") RETURNS TABLE("screen_id" bigint, "tag" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    grupo_rec RECORD;
BEGIN
    SELECT * INTO grupo_rec FROM grupos_cpm WHERE id = grupo_id AND ativo = true;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    CASE grupo_rec.tipo_selecao
        WHEN 'incluir_tags' THEN
            RETURN QUERY
            SELECT s.id, s.tag 
            FROM screens s 
            WHERE s.active = true 
              AND s.tag = ANY(grupo_rec.tags_incluir);
              
        WHEN 'excluir_tags' THEN
            RETURN QUERY
            SELECT s.id, s.tag 
            FROM screens s 
            WHERE s.active = true 
              AND NOT (s.tag = ANY(grupo_rec.tags_excluir));
              
        WHEN 'todas_exceto' THEN
            RETURN QUERY
            SELECT s.id, s.tag 
            FROM screens s 
            WHERE s.active = true 
              AND NOT (s.tag = ANY(COALESCE(grupo_rec.tags_excluir, ARRAY[]::text[])));
    END CASE;
END;
$$;


ALTER FUNCTION "public"."get_screens_by_grupo_cpm"("grupo_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role text;
  user_id uuid;
BEGIN
  -- Verificar se o usuário está autenticado
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN 'user';
  END IF;
  
  -- Primeiro tentar pegar do metadata do usuário
  SELECT raw_user_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  -- Se não encontrar, tentar pegar da tabela user_roles
  IF user_role IS NULL THEN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = user_id
    LIMIT 1;
  END IF;
  
  -- Se ainda não encontrar, retornar 'user' como padrão
  RETURN COALESCE(user_role, 'user');
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Return null if no user_id provided
    IF _user_id IS NULL THEN
        RETURN 'user';
    END IF;

    -- Check if super admin in profiles
    SELECT CASE WHEN super_admin THEN 'super_admin' ELSE NULL END
    INTO user_role
    FROM public.profiles
    WHERE id = _user_id;

    -- If not super admin, check user_roles table
    IF user_role IS NULL THEN
        SELECT role::TEXT
        INTO user_role
        FROM public.user_roles
        WHERE user_id = _user_id
        ORDER BY CASE role
            WHEN 'super_admin' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'user' THEN 3
        END
        LIMIT 1;
    END IF;

    -- Return default role if none found
    RETURN COALESCE(user_role, 'user');
END;
$$;


ALTER FUNCTION "public"."get_user_role"("_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_role"("_user_id" "uuid") IS 'Get user role by user ID - SECURITY DEFINER for RLS';



CREATE OR REPLACE FUNCTION "public"."get_venue_details"("venue_id_in" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  result jsonb;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  SELECT jsonb_build_object(
    'id', v.id,
    'code', v.code,
    'name', v.name,
    'district', v.district,
    'state', v.state,
    'country', v.country,
    'lat', v.lat,
    'lng', v.lng,
    'created_at', v.created_at,
    'updated_at', v.updated_at,
    'screens', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'code', s.code,
          'name', s.name,
          'display_name', s.display_name,
          'city', s.city,
          'state', s.state,
          'cep', s.cep,
          'class', s.class,
          'specialty', s.specialty,
          'address_raw', s.address_raw,
          'active', s.active,
          'asset_url', s.asset_url,
          'venue_type_parent', s.venue_type_parent,
          'venue_type_child', s.venue_type_child,
          'venue_type_grandchildren', s.venue_type_grandchildren,
          'facing', s.facing,
          'screen_facing', s.screen_facing,
          'screen_start_time', s.screen_start_time,
          'screen_end_time', s.screen_end_time,
          'lat', s.lat,
          'lng', s.lng,
          'created_at', s.created_at,
          'updated_at', s.updated_at
        )
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::jsonb
    )
  )
  INTO result
  FROM public.venues v
  LEFT JOIN public.screens s ON v.id = s.venue_id
  WHERE v.id = venue_id_in
  GROUP BY v.id, v.code, v.name, v.district, v.state, v.country, v.lat, v.lng, v.created_at, v.updated_at;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_venue_details"("venue_id_in" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- UPSERT no profiles
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_from_staging"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_month date := date_trunc('month', now())::date;
begin
  -- 1) VENUES por código único (dedup)
  with ranked as (
    select
      trim(p.codigo_de_ponto) as code,
      trim(p.ponto_de_cuidado) as name,
      row_number() over (
        partition by trim(p.codigo_de_ponto)
        order by p.imported_at desc nulls last, p.raw_id desc
      ) as rn
    from public.stg_ponto p
    where coalesce(trim(p.codigo_de_ponto),'') <> ''
  )
  insert into public.venues (code, name)
  select code, name
  from ranked
  where rn = 1
  on conflict (code) do update
    set name = excluded.name;

  -- 2) Completar atributos do venue com coords do billboard (quando houver)
  with stg as (
    select * from public.stg_billboard_enriched
  )
  update public.venues v
  set country = coalesce(v.country, s.country),
      state   = coalesce(v.state,   s.state),
      district= coalesce(v.district,s.district),
      lat     = coalesce(v.lat,     s.latitude),
      lng     = coalesce(v.lng,     s.longitude)
  from stg s
  where v.code = s.codigo_de_ponto_guess
    and (v.lat is null or v.lng is null)
    and s.latitude is not null and s.longitude is not null;

  update public.venues
  set geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  where geom is null and lat is not null and lng is not null;

  -- 3) Inserir SCREENS novas (dedup no lote + pular existentes)
  with stg as (select * from public.stg_billboard_enriched),
  src as (
    select
      md5(
        coalesce(s.codigo_de_ponto_guess,'') || '|' ||
        coalesce(s.display_name,'')         || '|' ||
        coalesce(s.latitude::text,'')       || '|' ||
        coalesce(s.longitude::text,'')
      ) as screen_code,
      s.*
    from stg s
    where s.latitude is not null and s.longitude is not null
  ),
  dedup as (
    select distinct on (screen_code) * from src order by screen_code
  ),
  new_only as (
    select d.*
    from dedup d
    left join public.screens sc on sc.code = d.screen_code
    where sc.id is null
  )
  insert into public.screens (
    code, name, display_name, city, state, lat, lng, class, venue_id,
    venue_type_parent, venue_type_child, venue_type_grandchildren,
    facing, screen_facing, screen_start_time, screen_end_time,
    asset_url, active
  )
  select
    n.screen_code,
    n.board_name as name,
    n.display_name,
    n.district as city,
    n.state,
    n.latitude, n.longitude,
    'ND'::class_band as class,
    v.id as venue_id,
    n.venue_type_parent, n.venue_type_child, n.venue_type_grandchildren,
    n.facing, n.screen_facing, n.screen_start_time, n.screen_end_time,
    n.asset_url,
    (lower(coalesce(n.active,'')) in ('true','yes','sim','1')) as active
  from new_only n
  join public.venues v on v.code = n.codigo_de_ponto_guess;

  update public.screens
  set geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  where geom is null and lat is not null and lng is not null;

  -- 4) Atualizar SCREENS existentes (light upsert)
  with stg as (select * from public.stg_billboard_enriched),
  target as (
    select
      md5(
        coalesce(s.codigo_de_ponto_guess,'') || '|' ||
        coalesce(s.display_name,'')         || '|' ||
        coalesce(s.latitude::text,'')       || '|' ||
        coalesce(s.longitude::text,'')
      ) as screen_code,
      s.*
    from stg s
  )
  update public.screens sc
  set city   = coalesce(t.district, sc.city),
      state  = coalesce(t.state, sc.state),
      lat    = coalesce(t.latitude, sc.lat),
      lng    = coalesce(t.longitude, sc.lng),
      name   = coalesce(t.board_name, sc.name),
      display_name = coalesce(t.display_name, sc.display_name),
      venue_type_parent = coalesce(t.venue_type_parent, sc.venue_type_parent),
      venue_type_child  = coalesce(t.venue_type_child, sc.venue_type_child),
      venue_type_grandchildren = coalesce(t.venue_type_grandchildren, sc.venue_type_grandchildren),
      facing = coalesce(t.facing, sc.facing),
      screen_facing = coalesce(t.screen_facing, sc.screen_facing),
      screen_start_time = coalesce(t.screen_start_time, sc.screen_start_time),
      screen_end_time   = coalesce(t.screen_end_time, sc.screen_end_time),
      asset_url = coalesce(t.asset_url, sc.asset_url),
      updated_at = now()
  from target t
  left join public.venues v on v.code = t.codigo_de_ponto_guess
  where sc.code = t.screen_code;

  -- 5) Rates (evitar duplicidade por dia)
  with stg as (select * from public.stg_billboard_enriched),
  s as (select code, id as screen_id from public.screens),
  src as (
    select
      s.screen_id,
      b.standard_rates_month as standard_rate_month,
      b.selling_rate_month   as selling_rate_month,
      b.cpm,
      b.spot_duration_secs,
      b.spots_per_hour,
      b.minimum_spots_per_day as min_spots_per_day,
      b.maximum_spots_per_day as max_spots_per_day,
      b.mode_of_operation,
      current_date::date as effective_from
    from stg b
    join s
      on s.code = md5(
        coalesce(b.codigo_de_ponto_guess,'') || '|' ||
        coalesce(b.display_name,'')         || '|' ||
        coalesce(b.latitude::text,'')       || '|' ||
        coalesce(b.longitude::text,'')
      )
    where coalesce(b.selling_rate_month, b.standard_rates_month, b.cpm) is not null
  )
  insert into public.screen_rates(
    screen_id, standard_rate_month, selling_rate_month, cpm,
    spot_duration_secs, spots_per_hour, min_spots_per_day, max_spots_per_day,
    mode_of_operation, effective_from
  )
  select *
  from src x
  where not exists (
    select 1 from public.screen_rates r
    where r.screen_id = x.screen_id
      and r.effective_from = x.effective_from
  );

  -- 6) Audiência mensal
  insert into public.venue_audience_monthly (venue_id, month, audience)
  select v.id, v_month, p.audiencia
  from public.stg_ponto p
  join public.venues v on v.code = trim(p.codigo_de_ponto)
  on conflict (venue_id, month) do update set audience = excluded.audience;

end;
$$;


ALTER FUNCTION "public"."import_from_staging"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT public.get_user_role() IN ('admin', 'super_admin');
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_manager_or_above"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (super_admin = true OR role IN ('admin', 'super_admin'))) OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
END;
$$;


ALTER FUNCTION "public"."is_manager_or_above"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_screen_free"("in_screen_id" bigint, "in_from" "date", "in_to" "date") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select not exists (
    select 1
    from public.screen_bookings b
    where b.screen_id = in_screen_id
      and daterange(b.booked_from, b.booked_to, '[]')
          && daterange(in_from, in_to, '[]')
      and b.status in ('confirmed','hold')
  );
$$;


ALTER FUNCTION "public"."is_screen_free"("in_screen_id" bigint, "in_from" "date", "in_to" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(
    (select super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"("uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT public.get_user_role() = 'super_admin';
$$;


ALTER FUNCTION "public"."is_super_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."jwt_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role','anonymous')
$$;


ALTER FUNCTION "public"."jwt_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_venue_summaries"("search" "text" DEFAULT NULL::"text", "limit_count" integer DEFAULT 20, "offset_count" integer DEFAULT 0) RETURNS TABLE("venue_id" bigint, "venue_code" "text", "venue_name" "text", "city" "text", "state" "text", "cep" "text", "class" "public"."class_band", "specialty" "text"[], "active" boolean, "screens_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    v.id as venue_id,
    v.code as venue_code,
    v.name as venue_name,
    COALESCE(s.city, '') as city,
    COALESCE(s.state, '') as state,
    COALESCE(s.cep, '') as cep,
    COALESCE(s.class, 'ND'::class_band) as class,
    COALESCE(array_agg(DISTINCT s.specialty) FILTER (WHERE s.specialty IS NOT NULL AND array_length(s.specialty, 1) > 0), ARRAY[]::text[]) as specialty,
    COALESCE(bool_or(s.active), false) as active,
    COUNT(s.id) as screens_count
  FROM public.venues v
  LEFT JOIN public.screens s ON v.id = s.venue_id
  WHERE (search IS NULL OR 
         v.code ILIKE '%' || search || '%' OR
         v.name ILIKE '%' || search || '%' OR
         s.city ILIKE '%' || search || '%' OR
         s.state ILIKE '%' || search || '%')
  GROUP BY v.id, v.code, v.name, s.city, s.state, s.cep, s.class
  ORDER BY v.name
  LIMIT limit_count OFFSET offset_count;
END;
$$;


ALTER FUNCTION "public"."list_venue_summaries"("search" "text", "limit_count" integer, "offset_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."make_proposal_snapshot"("p_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare payload jsonb;
begin
  with head as (
    select p.* from public.proposals p where p.id = p_id
  ),
  items as (
    select jsonb_agg(jsonb_build_object(
      'screen_id', screen_id,
      'code', code,
      'screen_name', screen_name,
      'city', screen_city,
      'state', screen_state,
      'spots_per_hour', spots_per_hour,
      'base_daily_traffic', base_daily_traffic,
      'custom_cpm', custom_cpm,
      'hours_on_override', hours_on_override,
      'daily_traffic_override', daily_traffic_override
    ) order by code) as arr
    from public.v_proposal_pdf
    where proposal_id = p_id
  )
  select jsonb_build_object('header', to_jsonb(h.*), 'items', coalesce(i.arr,'[]'::jsonb))
  into payload
  from head h, items i;

  insert into public.proposal_snapshots(proposal_id, payload)
  values (p_id, payload)
  on conflict (proposal_id) do update set payload = excluded.payload;

  return payload;
end; $$;


ALTER FUNCTION "public"."make_proposal_snapshot"("p_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_account"() RETURNS TABLE("id" "uuid", "email" "text", "email_verified" boolean, "display_name" "text", "avatar_url" "text", "providers" "text"[])
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT
    u.id,
    u.email,
    (u.email_confirmed_at IS NOT NULL) AS email_verified,
    p.display_name,
    p.avatar_url,
    COALESCE(
      ARRAY_AGG(i.provider ORDER BY i.provider)
        FILTER (WHERE i.provider IS NOT NULL),
      '{}'
    ) AS providers
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  LEFT JOIN auth.identities i ON i.user_id = u.id
  WHERE u.id = auth.uid()
  GROUP BY u.id, u.email, u.email_confirmed_at, p.display_name, p.avatar_url;
$$;


ALTER FUNCTION "public"."my_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_identities"() RETURNS TABLE("provider" "text", "provider_id" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT i.provider, i.provider_id
  FROM auth.identities i
  WHERE i.user_id = auth.uid();
$$;


ALTER FUNCTION "public"."my_identities"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."norm_blank_to_null"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.display_name is not null and btrim(new.display_name) = '' then
    new.display_name := null;
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."norm_blank_to_null"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."norm_specialty_term"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT trim(
           regexp_replace(
             regexp_replace(
               upper(unaccent(coalesce(p,''))),
               '\s+', ' ', 'g'              -- espaços múltiplos
             ),
             '([A-Z])[,\.]([A-Z])', '\1\2', 'g'  -- vírgula/ponto perdidos: CARDIOLOGI,A -> CARDIOLOGIA
           )
         );
$$;


ALTER FUNCTION "public"."norm_specialty_term"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."norm_text_imm"("t" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    AS $$
  select public.unaccent(lower(coalesce(t,'')));
$$;


ALTER FUNCTION "public"."norm_text_imm"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."norm_txt"("t" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select trim(both ' ' from lower(unaccent(coalesce(t,''))));
$$;


ALTER FUNCTION "public"."norm_txt"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."norm_uf_br"("src" "text") RETURNS character
    LANGUAGE "plpgsql" IMMUTABLE PARALLEL SAFE
    AS $$
DECLARE
  s TEXT := trim(both from src);
BEGIN
  IF s IS NULL OR s = '' THEN
    RETURN NULL;
  END IF;

  -- normaliza acentos e caixa
  s := lower(
        translate(
          s,
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
        )
      );

  -- já é sigla válida?
  IF length(s) = 2 THEN
    s := upper(s);
    IF s IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
             'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') THEN
      RETURN s;
    END IF;
  END IF;

  -- mapeamento de nomes -> UF
  CASE s
    WHEN 'acre' THEN RETURN 'AC';
    WHEN 'alagoas' THEN RETURN 'AL';
    WHEN 'amapa' THEN RETURN 'AP';
    WHEN 'amazonas' THEN RETURN 'AM';
    WHEN 'bahia' THEN RETURN 'BA';
    WHEN 'ceara' THEN RETURN 'CE';
    WHEN 'distrito federal' THEN RETURN 'DF';
    WHEN 'espirito santo' THEN RETURN 'ES';
    WHEN 'goias' THEN RETURN 'GO';
    WHEN 'maranhao' THEN RETURN 'MA';
    WHEN 'mato grosso' THEN RETURN 'MT';
    WHEN 'mato grosso do sul' THEN RETURN 'MS';
    WHEN 'minas gerais' THEN RETURN 'MG';
    WHEN 'para' THEN RETURN 'PA';
    WHEN 'paraiba' THEN RETURN 'PB';
    WHEN 'parana' THEN RETURN 'PR';
    WHEN 'pernambuco' THEN RETURN 'PE';
    WHEN 'piaui' THEN RETURN 'PI';
    WHEN 'rio de janeiro' THEN RETURN 'RJ';
    WHEN 'rio grande do norte' THEN RETURN 'RN';
    WHEN 'rio grande do sul' THEN RETURN 'RS';
    WHEN 'rondonia' THEN RETURN 'RO';
    WHEN 'roraima' THEN RETURN 'RR';
    WHEN 'santa catarina' THEN RETURN 'SC';
    WHEN 'sao paulo' THEN RETURN 'SP';
    WHEN 'sergipe' THEN RETURN 'SE';
    WHEN 'tocantins' THEN RETURN 'TO';
    ELSE
      RETURN NULL;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."norm_uf_br"("src" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."norm_uf_br_smart"("src" "text") RETURNS character
    LANGUAGE "plpgsql" IMMUTABLE PARALLEL SAFE
    AS $_$
DECLARE
  s TEXT;
  m TEXT;
BEGIN
  IF src IS NULL OR btrim(src) = '' THEN
    RETURN NULL;
  END IF;

  -- normaliza
  s := lower(
        translate(
          public._strip_state_noise(src),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'
        )
      );

  -- captura UF cercada por delimitadores (início/fim, espaço, -, /, parênteses)
  SELECT upper(match[2]) INTO m
  FROM regexp_matches(
         s,
         '(^|[\s\-/\(\)])(ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to)($|[\s\-/\)])',
         'gi'
       ) AS match
  LIMIT 1;

  IF m IS NOT NULL THEN
    RETURN m::CHAR(2);
  END IF;

  -- fallback: nome por extenso
  RETURN public.norm_uf_br(s);
END;
$_$;


ALTER FUNCTION "public"."norm_uf_br_smart"("src" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_medical_specialties"("specialty_text" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    medical_specialties TEXT[] := ARRAY[
        'OTORRINOLARINGOLOGIA', 'CIRURGIA GERAL', 'CLINICO GERAL', 'MEDICINA NUCLEAR', 
        'MEDICINA DO TRABALHO', 'MEDICINA ESPORTIVA', 'GASTROENTEROLOGIA', 
        'ENDOCRINOLOGIA', 'INFECTOLOGIA', 'OBSTETRICIA', 'REUMATOLOGIA', 
        'OFTALMOLOGIA', 'CARDIOLOGIA', 'DERMATOLOGIA', 'GINECOLOGIA', 
        'NEUROLOGIA', 'ORTOPEDIA', 'PEDIATRIA', 'ONCOLOGIA', 'TRANSPLANTE',
        'PSIQUIATRIA', 'UROLOGIA', 'ANESTESIOLOGIA', 'RADIOLOGIA', 'PATOLOGIA',
        'HEMATOLOGIA', 'NEFROLOGIA', 'PNEUMOLOGIA', 'GERIATRIA', 'UTI',
        'COLOPROCTOLOGIA', 'CIRURGIA PLASTICA', 'MASTOLOGIA', 'REABILITACAO',
        'NEONATOLOGIA', 'OBSTETRICIA', 'TRAUMATOLOGIA', 'PATOLOGIA'
    ];
    
    normalized_text TEXT;
    remaining_text TEXT;
    result_array TEXT[] := ARRAY[]::TEXT[];
    specialty TEXT;
    found_specialty TEXT;
    i INTEGER;
BEGIN
    -- Se o input é nulo ou vazio, retornar array vazio
    IF specialty_text IS NULL OR TRIM(specialty_text) = '' THEN
        RETURN ARRAY[]::TEXT[];
    END IF;
    
    -- Se já tem vírgulas, fazer split simples
    IF specialty_text LIKE '%,%' THEN
        SELECT ARRAY(
            SELECT TRIM(unnest(string_to_array(specialty_text, ',')))
        ) INTO result_array;
        RETURN result_array;
    END IF;
    
    -- Normalizar texto para maiúsculas
    normalized_text := UPPER(TRIM(specialty_text));
    remaining_text := normalized_text;
    
    -- Ordenar especialidades por tamanho (maiores primeiro)
    FOR i IN 1..array_length(medical_specialties, 1) LOOP
        specialty := medical_specialties[i];
        
        -- Verificar se a especialidade existe no texto
        IF remaining_text LIKE '%' || specialty || '%' THEN
            result_array := array_append(result_array, specialty);
            -- Remover a especialidade encontrada
            remaining_text := REPLACE(remaining_text, specialty, ' ');
            remaining_text := TRIM(regexp_replace(remaining_text, '\s+', ' ', 'g'));
        END IF;
    END LOOP;
    
    -- Se não encontrou nenhuma especialidade conhecida, retornar o texto original como array
    IF array_length(result_array, 1) IS NULL OR array_length(result_array, 1) = 0 THEN
        result_array := ARRAY[specialty_text];
    END IF;
    
    RETURN result_array;
END;
$$;


ALTER FUNCTION "public"."normalize_medical_specialties"("specialty_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."period_label"("p_start" "date", "p_end" "date") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  with d as (
    select case
      when p_start is null or p_end is null then null
      else (p_end - p_start) end as days
  )
  select case
    when days is null then 'A definir'
    when days <= 7 then 'Semanal'
    when days <= 15 then 'Quinzenal'
    when days <= 31 then 'Mensal'
    when days <= 92 then 'Trimestral'
    else 'Personalizado'
  end from d;
$$;


ALTER FUNCTION "public"."period_label"("p_start" "date", "p_end" "date") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."price_rules" (
    "id" bigint NOT NULL,
    "city" "text",
    "base_monthly" numeric(12,2) DEFAULT 0 NOT NULL,
    "uplift" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "min_months" integer DEFAULT 1,
    "setup_fee" numeric(12,2) DEFAULT 0,
    "logistics_km_price" numeric(12,2) DEFAULT 0,
    "city_norm" "text" GENERATED ALWAYS AS ("public"."norm_text_imm"("city")) STORED,
    "created_by" "uuid",
    "screen_id" bigint,
    "venue_id" bigint,
    "cpm" numeric,
    "audience" numeric,
    "tipo_insercao" "public"."tipo_insercao_enum",
    "tipo_insercao_manual" "text",
    CONSTRAINT "price_rules_tipo_insercao_manual_check" CHECK (("tipo_insercao_manual" = ANY (ARRAY['Tipo 1'::"text", 'Tipo 2'::"text", 'Tipo 3'::"text", 'Tipo 4'::"text"])))
);


ALTER TABLE "public"."price_rules" OWNER TO "postgres";


COMMENT ON TABLE "public"."price_rules" IS 'Pricing rules based on city and screen class';



COMMENT ON COLUMN "public"."price_rules"."tipo_insercao_manual" IS 'Tipo de inserção para diferenciar faixas de preço: Tipo 1, Tipo 2, Tipo 3, Tipo 4';



CREATE OR REPLACE FUNCTION "public"."pick_price_rule"("city_in" "text", "class_in" "public"."class_band") RETURNS "public"."price_rules"
    LANGUAGE "sql" STABLE
    AS $$
  with norm as (
    select public.norm_text_imm(city_in) as c
  ),
  cands as (
    select
      pr as row,  -- coluna ÚNICA do tipo composto price_rules
      (
        case when pr.city_norm = (select c from norm) then 4
             when pr.city_norm is null                   then 2
             else 0 end
      )
      + (case when pr.class = class_in then 1 else 0 end) as score
    from public.price_rules pr
    where pr.class = class_in or pr.city_norm is null
  )
  -- Retorna exatamente 1 coluna (row) do tipo price_rules
  select row
  from cands
  order by score desc, (row).created_at desc, (row).id desc
  limit 1;
$$;


ALTER FUNCTION "public"."pick_price_rule"("city_in" "text", "class_in" "public"."class_band") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."populate_email_logs_missing_fields"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Atualizar registros que não têm customer_name ou proposal_type
    UPDATE public.email_logs el
    SET 
        customer_name = COALESCE(el.customer_name, p.customer_name),
        proposal_type = COALESCE(el.proposal_type, p.proposal_type)
    FROM public.proposals p
    WHERE el.proposal_id = p.id
      AND (el.customer_name IS NULL OR el.proposal_type IS NULL);
      
    RAISE NOTICE 'Campos faltantes populados com sucesso';
END;
$$;


ALTER FUNCTION "public"."populate_email_logs_missing_fields"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."populate_email_logs_missing_fields"() IS 'Popula campos faltantes nos logs de email';



CREATE OR REPLACE FUNCTION "public"."prevent_role_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    -- Only allow super_admin to change roles
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        IF NOT has_role(auth.uid(), 'super_admin') THEN
            RAISE EXCEPTION 'Only super administrators can change user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_role_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."promote_to_super_admin"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Atualiza se já existir
  UPDATE public.user_roles
  SET role = 'super_admin'::app_role
  WHERE user_id = p_user_id;

  -- Se não existir, insere
  INSERT INTO public.user_roles (user_id, role)
  SELECT p_user_id, 'super_admin'::app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."promote_to_super_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."proposal_summary"("p_id" bigint) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  js json;
begin
  -- cabeçalho + agência/projeto
  with head as (
    select
      p.id, p.customer_name, p.customer_email,
      p.start_date, p.end_date,
      public.period_label(p.start_date, p.end_date) as period_label,
      p.cpm_mode, p.cpm_value,
      p.discount_pct, p.discount_fixed,
      ag.nome_agencia, ag.cnpj, ag.site,
      prj.nome_projeto, prj.cliente_final
    from public.proposals p
    left join public.agencias ag on ag.id = p.agencia_id
    left join public.agencia_projetos prj on prj.id = p.projeto_id
    where p.id = p_id
  ),
  base as (
    select *
    from public.v_proposal_items
    where proposal_id = p_id
  ),
  by_city as (
    select city, count(*) as qty
    from base
    group by city
    order by qty desc, city asc
  ),
  by_state as (
    select state, count(*) as qty
    from base
    group by state
    order by qty desc, state asc
  ),
  by_category as (
    select category, count(*) as qty
    from base
    group by category
    order by qty desc, category asc
  ),
  specs as (
    -- explode specialties (array) e dedup
    select array_agg(distinct trim(s)) filter (where s is not null and length(trim(s))>0) as specialties
    from (
      select unnest(b.specialties) as s
      from base b
    ) t
  )
  select json_build_object(
    'header', (select row_to_json(h) from head h),
    'city_summary', (select json_agg(row_to_json(c)) from by_city c),
    'state_summary', (select json_agg(row_to_json(s)) from by_state s),
    'category_summary', (select json_agg(row_to_json(k)) from by_category k),
    'specialties', coalesce((select specialties from specs), array[]::text[]),
    'totals', json_build_object(
        'screens', (select count(*) from base),
        'cities',  (select count(distinct city) from base),
        'states',  (select count(distinct state) from base),
        'categories', (select count(distinct category) from base)
    )
  )
  into js;

  return js;
end;
$$;


ALTER FUNCTION "public"."proposal_summary"("p_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quote_price_detailed"("city_in" "text", "class_in" "public"."class_band", "qty_in" integer, "months_in" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_base numeric := 0;
  v_setup numeric := 0;
  v_uplift numeric := 1.0;
  v_min_months int := 1;
  v_total numeric := 0;
begin
  -- preço médio por tela/mês
  select coalesce(avg(coalesce(sr.selling_rate_month, sr.standard_rate_month)), 0)
  into v_base
  from public.screens s
  join public.screen_rates sr on sr.screen_id = s.id
  where (city_in is null or norm_txt(s.city) = norm_txt(city_in))
    and (class_in is null or s.class = class_in);

  -- price_rules
  select
    coalesce(avg(base_monthly), v_base),
    coalesce(max(setup_fee), 0),
    coalesce(max(uplift), 1.0),
    coalesce(max(min_months), 1)
  into v_base, v_setup, v_uplift, v_min_months
  from public.price_rules pr
  where (city_in is null or norm_txt(pr.city) = norm_txt(city_in))
    and (class_in is null or pr.class = class_in);

  if months_in < v_min_months then
    months_in := v_min_months;
  end if;

  v_total := (v_base * qty_in * months_in * v_uplift) + v_setup;

  return jsonb_build_object(
    'inputs', jsonb_build_object(
      'city', city_in, 'class', class_in,
      'qty', qty_in, 'months', months_in
    ),
    'pricing', jsonb_build_object(
      'base_monthly_per_screen', v_base,
      'setup_fee', v_setup,
      'uplift', v_uplift,
      'min_months_enforced', v_min_months
    ),
    'total', v_total
  );
end;
$$;


ALTER FUNCTION "public"."quote_price_detailed"("city_in" "text", "class_in" "public"."class_band", "qty_in" integer, "months_in" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_proposal_kpis"("p_proposal_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_days_calendar int;
  v_days_business int;
  v_cpm numeric;
  v_insertions int;
  v_formula text;
  v_disc_pct numeric;
  v_disc_fixed numeric;
  v_impacts_day numeric := 0;
  v_impacts_calendar numeric;
  v_impacts_business numeric;
  v_gross_calendar numeric;
  v_gross_business numeric;
  v_net_calendar numeric;
  v_net_business numeric;
BEGIN
  SELECT
    GREATEST(1, (end_date - start_date) + 1),
    public.business_days_between(start_date, end_date),
    COALESCE(public.resolve_effective_cpm(id), cpm_value),
    COALESCE(insertions_per_hour, 6),
    COALESCE(impact_formula, 'A'),
    COALESCE(discount_pct, 0),
    COALESCE(discount_fixed, 0)
  INTO
    v_days_calendar, v_days_business, v_cpm, v_insertions, v_formula, v_disc_pct, v_disc_fixed
  FROM public.proposals WHERE id = p_proposal_id;

  WITH per_screen AS (
    SELECT
      COALESCE(ps.daily_traffic_override, vam.audience, 0)::numeric AS daily_traffic,
      COALESCE(ps.hours_on_override,
               NULLIF(s.screen_end_time,'')::int - NULLIF(s.screen_start_time,'')::int,
               10) AS hours_on
    FROM public.proposal_screens ps
    JOIN public.screens s ON s.id = ps.screen_id
    LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
    WHERE ps.proposal_id = p_proposal_id
  )
  SELECT
    COALESCE(SUM(daily_traffic * v_insertions *
      CASE WHEN v_formula = 'A' THEN 1 ELSE hours_on END), 0)
  INTO v_impacts_day
  FROM per_screen;

  v_impacts_calendar := v_impacts_day * COALESCE(v_days_calendar, 0);
  v_impacts_business := v_impacts_day * COALESCE(v_days_business, 0);

  v_gross_calendar := ROUND((v_impacts_calendar / 1000.0) * COALESCE(v_cpm,0), 2);
  v_gross_business := ROUND((v_impacts_business / 1000.0) * COALESCE(v_cpm,0), 2);

  v_net_calendar := GREATEST(v_gross_calendar - (v_gross_calendar * v_disc_pct/100.0) - v_disc_fixed, 0);
  v_net_business := GREATEST(v_gross_business - (v_gross_business * v_disc_pct/100.0) - v_disc_fixed, 0);

  UPDATE public.proposals
  SET
    days_calendar     = v_days_calendar,
    days_business     = v_days_business,
    impacts_calendar  = v_impacts_calendar,
    impacts_business  = v_impacts_business,
    gross_calendar    = v_gross_calendar,
    gross_business    = v_gross_business,
    net_calendar      = v_net_calendar,
    net_business      = v_net_business,
    updated_at        = now()
  WHERE id = p_proposal_id;
END$$;


ALTER FUNCTION "public"."recalc_proposal_kpis"("p_proposal_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."recalc_proposal_kpis"("p_proposal_id" bigint) IS 'Recalcula todos os KPIs de uma proposta (dias, impactos, valores). SECURITY DEFINER para uso em triggers.';



CREATE OR REPLACE FUNCTION "public"."resolve_effective_cpm"("p_proposal_id" bigint) RETURNS numeric
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH base AS (
    SELECT
      p.cpm_mode, p.cpm_value, ps.custom_cpm,
      COALESCE(sr.cpm, pr.cpm) AS cpm_rule,
      COALESCE(vam.audience, 0)::numeric AS weight
    FROM public.proposals p
    JOIN public.proposal_screens ps ON ps.proposal_id = p.id
    JOIN public.screens s ON s.id = ps.screen_id
    LEFT JOIN public.screen_rates sr ON sr.screen_id = s.id
    LEFT JOIN public.price_rules pr ON pr.screen_id = s.id
    LEFT JOIN public.venue_audience_monthly vam ON vam.venue_id = s.venue_id
    WHERE p.id = p_proposal_id
  ),
  aggregated AS (
    SELECT 
      MAX(cpm_mode) as cpm_mode,
      MAX(cpm_value) as cpm_value,
      SUM(COALESCE(custom_cpm, cpm_rule, cpm_value) * NULLIF(weight,0)) as weighted_sum,
      SUM(NULLIF(weight,0)) as total_weight
    FROM base
  )
  SELECT CASE
           WHEN cpm_mode = 'manual' THEN cpm_value
           ELSE NULLIF(weighted_sum / NULLIF(total_weight,0), 0)
         END
  FROM aggregated;
$$;


ALTER FUNCTION "public"."resolve_effective_cpm"("p_proposal_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_effective_cpm"("p_proposal_id" bigint) IS 'Resolve o CPM efetivo de uma proposta baseado no modo (manual/blended). SECURITY DEFINER para uso em triggers.';



CREATE OR REPLACE FUNCTION "public"."screens_norm_sync"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.city is distinct from old.city then
    new.city_norm := norm_text_imm(new.city);
  end if;
  if new.state is distinct from old.state then
    new.state_norm := norm_text_imm(new.state);
  end if;
  return new;
end; $$;


ALTER FUNCTION "public"."screens_norm_sync"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_accounts_admin"("search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "email" "text", "email_verified" boolean, "display_name" "text", "avatar_url" "text", "providers" "text"[], "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT *
  FROM public.accounts_admin_list() v
  WHERE public.is_admin()   -- redundante, mas explícito
    AND (
      search IS NULL
      OR v.email ILIKE '%'||search||'%'
      OR v.display_name ILIKE '%'||search||'%'
      OR EXISTS (
        SELECT 1 FROM unnest(v.providers) pr
        WHERE pr ILIKE '%'||search||'%'
      )
    );
$$;


ALTER FUNCTION "public"."search_accounts_admin"("search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_agencia_projeto_marcos_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_agencia_projeto_marcos_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Se created_by não foi definido, usar o usuário atual
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END$$;


ALTER FUNCTION "public"."set_created_by"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_created_by"() IS 'Função para definir automaticamente created_by como auth.uid() em triggers BEFORE INSERT.';



CREATE OR REPLACE FUNCTION "public"."set_email_log_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    proposal_data RECORD;
BEGIN
    -- Se customer_name ou proposal_type não foram fornecidos, buscar da proposta
    IF NEW.customer_name IS NULL OR NEW.proposal_type IS NULL THEN
        SELECT customer_name, proposal_type
        INTO proposal_data
        FROM public.proposals
        WHERE id = NEW.proposal_id;
        
        NEW.customer_name := COALESCE(NEW.customer_name, proposal_data.customer_name);
        NEW.proposal_type := COALESCE(NEW.proposal_type, proposal_data.proposal_type);
    END IF;
    
    -- Definir created_by se não foi fornecido
    IF NEW.created_by IS NULL THEN
        NEW.created_by := auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_email_log_fields"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_email_log_fields"() IS 'Trigger para definir campos automaticamente nos logs de email';



CREATE OR REPLACE FUNCTION "public"."set_geom_from_lat_lng"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if NEW.lat is not null and NEW.lng is not null then
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  else
    NEW.geom := null;
  end if;
  return NEW;
end $$;


ALTER FUNCTION "public"."set_geom_from_lat_lng"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_geom_from_lat_lng_venues"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.lat is not null and new.lng is not null then
    new.geom := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  else
    new.geom := null;
  end if;
  return new;
end$$;


ALTER FUNCTION "public"."set_geom_from_lat_lng_venues"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."strip_braces_quotes"("t" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(
           regexp_replace(
             regexp_replace(coalesce(t,''), '[\{\}\[\]"''“”]+', '', 'g'),  -- tira chaves/aspas
             '\s+', ' ', 'g'                                              -- espaços múltiplos -> 1
           )::text
         , ''
       );
$$;


ALTER FUNCTION "public"."strip_braces_quotes"("t" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_super_admin_to_auth"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_super_admin', NEW.super_admin)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_super_admin_to_auth"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_norm_specialty_array"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.specialty := public.clean_text_array(new.specialty);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_norm_specialty_array"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_norm_staging_spec"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.spec := public.strip_braces_quotes(new.spec);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_norm_staging_spec"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_proposal_screens_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_prop bigint; BEGIN
  v_prop := COALESCE(NEW.proposal_id, OLD.proposal_id);
  IF v_prop IS NOT NULL THEN
    PERFORM public.recalc_proposal_kpis(v_prop);
  END IF;
  RETURN COALESCE(NEW, OLD);
END$$;


ALTER FUNCTION "public"."trg_proposal_screens_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_proposals_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  PERFORM public.recalc_proposal_kpis(NEW.id);
  RETURN NEW;
END$$;


ALTER FUNCTION "public"."trg_proposals_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_proposal_email_notifications"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_email TEXT;
    v_client_email TEXT;
    v_user_name TEXT;
    v_proposal_id BIGINT;
    v_customer_name TEXT;
    v_old_status TEXT;
    v_new_status TEXT;
BEGIN
    v_proposal_id := COALESCE(NEW.id, OLD.id);
    v_client_email := COALESCE(NEW.customer_email, OLD.customer_email);
    v_customer_name := COALESCE(NEW.customer_name, OLD.customer_name);
    v_old_status := OLD.status;
    v_new_status := NEW.status;
    
    -- Buscar informações do usuário
    SELECT 
        u.email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email) as name
    INTO v_user_email, v_user_name
    FROM auth.users u
    WHERE u.id = COALESCE(NEW.created_by, OLD.created_by, auth.uid());
    
    -- CASO 1: Nova proposta criada
    IF TG_OP = 'INSERT' THEN
        -- Log para email do cliente
        PERFORM public.create_email_log(
            v_proposal_id,
            'proposal_created',
            v_client_email,
            'client',
            'Nova Proposta Comercial - Proposta #' || v_proposal_id
        );
        
        -- Log para email do usuário (se diferente)
        IF v_user_email IS NOT NULL AND v_user_email != v_client_email THEN
            PERFORM public.create_email_log(
                v_proposal_id,
                'proposal_created',
                v_user_email,
                'user',
                'Proposta #' || v_proposal_id || ' criada com sucesso'
            );
        END IF;
    END IF;
    
    -- CASO 2: Status da proposta alterado
    IF TG_OP = 'UPDATE' AND v_old_status IS DISTINCT FROM v_new_status THEN
        -- Log para email do cliente (apenas se status for relevante para cliente)
        IF v_new_status IN ('enviada', 'aceita', 'rejeitada') THEN
            PERFORM public.create_email_log(
                v_proposal_id,
                'status_changed',
                v_client_email,
                'client',
                'Proposta #' || v_proposal_id || ' - Status: ' || 
                CASE v_new_status
                    WHEN 'enviada' THEN 'Proposta Enviada'
                    WHEN 'aceita' THEN 'Proposta Aceita'
                    WHEN 'rejeitada' THEN 'Proposta Rejeitada'
                    ELSE INITCAP(v_new_status)
                END
            );
        END IF;
        
        -- Log para email do usuário
        IF v_user_email IS NOT NULL THEN
            PERFORM public.create_email_log(
                v_proposal_id,
                'status_changed',
                v_user_email,
                'user',
                'Proposta #' || v_proposal_id || ' - Status alterado para ' || v_new_status
            );
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END$$;


ALTER FUNCTION "public"."trigger_proposal_email_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_proposal_email_notifications"() IS 'Trigger que cria logs de email quando propostas são criadas ou têm status alterado';



CREATE OR REPLACE FUNCTION "public"."update_email_status"("p_log_id" bigint, "p_status" character varying, "p_error_message" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE public.email_logs
    SET 
        status = p_status,
        error_message = p_error_message,
        sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END
    WHERE id = p_log_id;
    
    -- Se o email foi enviado com sucesso, atualizar proposta
    IF p_status = 'sent' THEN
        UPDATE public.proposals
        SET email_sent_at = now()
        WHERE id = (
            SELECT proposal_id 
            FROM public.email_logs 
            WHERE id = p_log_id
        );
    END IF;
    
    RETURN FOUND;
END$$;


ALTER FUNCTION "public"."update_email_status"("p_log_id" bigint, "p_status" character varying, "p_error_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_email_status"("p_log_id" bigint, "p_status" character varying, "p_error_message" "text") IS 'Atualiza o status de um email (pending -> sent/failed)';



CREATE OR REPLACE FUNCTION "public"."update_geom_from_latlng"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_geom_from_latlng"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_proposal_status"("p_proposal_id" bigint, "p_new_status" "public"."proposal_status", "p_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_current_status public.proposal_status;
    v_can_update boolean := false;
BEGIN
    -- Verificar se usuário pode editar esta proposta
    SELECT status INTO v_current_status
    FROM public.proposals
    WHERE id = p_proposal_id
    AND (
        is_admin() OR 
        created_by = auth.uid() OR
        created_by IS NULL
    );
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Proposta não encontrada ou sem permissão para editar';
    END IF;
    
    -- Validar transições de status (regras de negócio)
    CASE v_current_status
        WHEN 'rascunho' THEN
            v_can_update := p_new_status IN ('enviada', 'rascunho');
        WHEN 'enviada' THEN
            v_can_update := p_new_status IN ('em_analise', 'aceita', 'rejeitada');
        WHEN 'em_analise' THEN
            v_can_update := p_new_status IN ('aceita', 'rejeitada', 'enviada');
        WHEN 'aceita' THEN
            v_can_update := is_admin(); -- Só admin pode alterar proposta aceita
        WHEN 'rejeitada' THEN
            v_can_update := p_new_status IN ('enviada', 'rascunho'); -- Pode reenviar
    END CASE;
    
    IF NOT v_can_update THEN
        RAISE EXCEPTION 'Transição de status inválida de % para %', v_current_status, p_new_status;
    END IF;
    
    -- Atualizar status e notas
    UPDATE public.proposals
    SET 
        status = p_new_status,
        notes = COALESCE(p_notes, notes),
        updated_at = now()
    WHERE id = p_proposal_id;
    
    RETURN true;
END$$;


ALTER FUNCTION "public"."update_proposal_status"("p_proposal_id" bigint, "p_new_status" "public"."proposal_status", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_proposal_status"("p_proposal_id" bigint, "p_new_status" "public"."proposal_status", "p_notes" "text") IS 'Função segura para alterar status de proposta com validação de regras de negócio';



CREATE OR REPLACE FUNCTION "public"."update_proposal_status_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Se o status mudou, atualizar timestamp
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_updated_at = now();
    END IF;
    RETURN NEW;
END$$;


ALTER FUNCTION "public"."update_proposal_status_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Função para atualizar automaticamente a coluna updated_at em triggers BEFORE UPDATE.';



CREATE TABLE IF NOT EXISTS "archive"."stg_billboard_data_text" (
    "board_name" "text",
    "display_name" "text",
    "facing" "text",
    "screen_facing" "text",
    "board_format" "text",
    "category" "text",
    "venue_type_parent" "text",
    "venue_type_child" "text",
    "venue_type_grandchildren" "text",
    "latitude" "text",
    "longitude" "text",
    "country" "text",
    "state" "text",
    "district" "text",
    "active" "text",
    "available" "text",
    "screen_start_time" "text",
    "screen_end_time" "text",
    "spot_duration_secs" "text",
    "spots_per_hour" "text",
    "no_of_clients_per_loop" "text",
    "minimum_spots_per_day" "text",
    "maximum_spots_per_day" "text",
    "mode_of_operation" "text",
    "spots_reserved_for_mw" "text",
    "expose_to_max" "text",
    "expose_to_mad" "text",
    "standard_rates_month" "text",
    "selling_rate_month" "text",
    "asset_url" "text",
    "cpm" "text",
    "audiences_monthly" "text"
);


ALTER TABLE "archive"."stg_billboard_data_text" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo_agencia" "text" NOT NULL,
    "nome_agencia" "text" NOT NULL,
    "cnpj" "text" NOT NULL,
    "site" "text",
    "rua_av" "text",
    "numero" "text",
    "cidade" "text",
    "estado" "text",
    "cep" "text",
    "email_empresa" "text",
    "telefone_empresa" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "taxa_porcentagem" numeric(5,2) DEFAULT 0.00,
    "estado_uf" character(2),
    CONSTRAINT "agencias_codigo_agencia_format_chk" CHECK (("codigo_agencia" ~ '^A[0-9]{3}$'::"text")),
    CONSTRAINT "agencias_taxa_porcentagem_check" CHECK (("taxa_porcentagem" >= (0)::numeric))
);


ALTER TABLE "public"."agencias" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agencias"."taxa_porcentagem" IS 'Taxa de porcentagem adicional aplicada nas propostas desta agência (ex: 15.50 para 15.5%)';



COMMENT ON COLUMN "public"."agencias"."estado_uf" IS 'UF normalizada (FK -> br_states.uf). Fonte: estado/cidade com norm_uf_br_smart()';



CREATE TABLE IF NOT EXISTS "public"."br_states" (
    "uf" character(2) NOT NULL,
    "nome" "text" NOT NULL,
    "regiao" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."br_states" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."_audit_agencias_state_unmapped" AS
 SELECT "id",
    "nome_agencia",
    "cidade",
    "estado" AS "raw_estado"
   FROM "public"."agencias"
  WHERE (("estado_uf" IS NULL) OR (NOT ("estado_uf" IN ( SELECT "br_states"."uf"
           FROM "public"."br_states"))));


ALTER VIEW "public"."_audit_agencias_state_unmapped" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."holidays" (
    "id" bigint NOT NULL,
    "day" "date" NOT NULL,
    "name" "text",
    "scope" "text" DEFAULT 'national'::"text",
    "state" "text",
    "city" "text",
    "state_uf" character(2)
);


ALTER TABLE "public"."holidays" OWNER TO "postgres";


COMMENT ON COLUMN "public"."holidays"."state_uf" IS 'UF normalizada (FK -> br_states.uf). Fonte: state/city com norm_uf_br_smart()';



CREATE OR REPLACE VIEW "public"."_audit_holidays_state_unmapped" AS
 SELECT "id",
    "name",
    "city",
    "state" AS "raw_state"
   FROM "public"."holidays"
  WHERE (("state_uf" IS NULL) OR (NOT ("state_uf" IN ( SELECT "br_states"."uf"
           FROM "public"."br_states"))));


ALTER VIEW "public"."_audit_holidays_state_unmapped" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."screens" (
    "id" bigint NOT NULL,
    "code" "text",
    "name" "text",
    "address_raw" "text",
    "address_norm" "text",
    "city" "text",
    "state" "text",
    "cep" "text",
    "lat" double precision,
    "lng" double precision,
    "geom" "public"."geography"(Point,4326) GENERATED ALWAYS AS (
CASE
    WHEN (("lat" IS NOT NULL) AND ("lng" IS NOT NULL)) THEN ("public"."st_setsrid"("public"."st_makepoint"("lng", "lat"), 4326))::"public"."geography"
    ELSE NULL::"public"."geography"
END) STORED,
    "specialty" "text"[] DEFAULT ARRAY[]::"text"[],
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "venue_id" bigint,
    "display_name" "text",
    "board_format" "text",
    "category" "text",
    "venue_type_parent" "text",
    "venue_type_child" "text",
    "venue_type_grandchildren" "text" DEFAULT 'TV Doutor'::"text" NOT NULL,
    "facing" "text",
    "screen_facing" "text",
    "screen_start_time" "text",
    "screen_end_time" "text",
    "asset_url" "text",
    "city_norm" "text" GENERATED ALWAYS AS ("public"."norm_text_imm"("city")) STORED,
    "state_norm" "text" GENERATED ALWAYS AS ("public"."norm_text_imm"("state")) STORED,
    "tag" "text" DEFAULT 'TV Doutor'::"text" NOT NULL,
    "google_place_id" "text",
    "google_formatted_address" "text",
    "base_daily_traffic" bigint,
    "spots_per_hour" integer DEFAULT 6,
    "state_uf" character(2),
    "class" "public"."class_band" DEFAULT 'ND'::"public"."class_band",
    "cep_norm" character(8),
    "geo" "public"."geography"(Point,4326),
    "endereco_completo" "text",
    "geom_geog" "public"."geography"(Point,4326),
    CONSTRAINT "screens_address_norm_not_blank" CHECK ((("address_norm" IS NULL) OR ("length"(TRIM(BOTH FROM "address_norm")) > 0))),
    CONSTRAINT "screens_cep_digits_8" CHECK ((("cep" IS NULL) OR ("regexp_replace"("cep", '[^0-9]'::"text", ''::"text", 'g'::"text") ~ '^[0-9]{8}$'::"text"))),
    CONSTRAINT "screens_code_format_check" CHECK (("code" ~ '^P[0-9]{4,5}(\.[0-9]+)?$'::"text")),
    CONSTRAINT "screens_lat_chk" CHECK ((("lat" IS NULL) OR (("lat" >= ('-90'::integer)::double precision) AND ("lat" <= (90)::double precision)))),
    CONSTRAINT "screens_lng_chk" CHECK ((("lng" IS NULL) OR (("lng" >= ('-180'::integer)::double precision) AND ("lng" <= (180)::double precision))))
);


ALTER TABLE "public"."screens" OWNER TO "postgres";


COMMENT ON TABLE "public"."screens" IS 'Digital screens/billboards for advertising';



COMMENT ON COLUMN "public"."screens"."code" IS 'Unique screen code following pattern P[0-9]{4,5}(\.[0-9]+)?';



COMMENT ON COLUMN "public"."screens"."geom" IS 'Geographic location as PostGIS geography point';



COMMENT ON COLUMN "public"."screens"."tag" IS 'Screen tag/brand identifier';



COMMENT ON COLUMN "public"."screens"."state_uf" IS 'UF normalizada (FK -> br_states.uf). Fonte: state/city com norm_uf_br_smart()';



COMMENT ON COLUMN "public"."screens"."class" IS 'Classificação da tela (ND=Não Definido, A=Classe A, AB=Classe AB, ABC=Classe ABC, B=Classe B, BC=Classe BC, C=Classe C, CD=Classe CD, D=Classe D, E=Classe E)';



COMMENT ON COLUMN "public"."screens"."endereco_completo" IS 'Endereço completo do cliente';



CREATE OR REPLACE VIEW "public"."_audit_screens_state_unmapped" AS
 SELECT "id",
    "name",
    "city",
    "state" AS "raw_state"
   FROM "public"."screens"
  WHERE (("state_uf" IS NULL) OR (NOT ("state_uf" IN ( SELECT "br_states"."uf"
           FROM "public"."br_states"))));


ALTER VIEW "public"."_audit_screens_state_unmapped" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venues" (
    "id" bigint NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "country" "text",
    "state" "text",
    "district" "text",
    "lat" double precision,
    "lng" double precision,
    "geom" "public"."geography",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "google_place_id" "text",
    "google_formatted_address" "text",
    "rua_av" "text",
    "numero" "text",
    "cep" "text",
    "cidade" "text",
    "network_id" "uuid",
    "aceita_convenio" boolean DEFAULT false,
    "state_uf" character(2),
    "type" character varying(100),
    CONSTRAINT "venues_lat_chk" CHECK ((("lat" IS NULL) OR (("lat" >= ('-90'::integer)::double precision) AND ("lat" <= (90)::double precision)))),
    CONSTRAINT "venues_lng_chk" CHECK ((("lng" IS NULL) OR (("lng" >= ('-180'::integer)::double precision) AND ("lng" <= (180)::double precision))))
);


ALTER TABLE "public"."venues" OWNER TO "postgres";


COMMENT ON TABLE "public"."venues" IS 'Venues/locations where screens are installed';



COMMENT ON COLUMN "public"."venues"."state_uf" IS 'UF normalizada (FK -> br_states.uf). Fonte: state/city com norm_uf_br_smart()';



COMMENT ON COLUMN "public"."venues"."type" IS 'Tipo do venue - adicionado para corrigir erro de views antigas';



CREATE OR REPLACE VIEW "public"."_audit_venues_state_unmapped" AS
 SELECT "id",
    "name",
    "cidade",
    "state" AS "raw_state"
   FROM "public"."venues"
  WHERE (("state_uf" IS NULL) OR (NOT ("state_uf" IN ( SELECT "br_states"."uf"
           FROM "public"."br_states"))));


ALTER VIEW "public"."_audit_venues_state_unmapped" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."acoes_especiais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "servico_id" "uuid" NOT NULL,
    "nome_acao" "text" NOT NULL,
    "descricao" "text",
    "preco_adicional" numeric(10,2) DEFAULT 0,
    "percentual_desconto" numeric(5,2) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "acoes_especiais_percentual_desconto_check" CHECK ((("percentual_desconto" >= (0)::numeric) AND ("percentual_desconto" <= (100)::numeric)))
);


ALTER TABLE "public"."acoes_especiais" OWNER TO "postgres";


COMMENT ON TABLE "public"."acoes_especiais" IS 'Ações especiais vinculadas aos serviços (Sample, Promoção CS, etc.)';



COMMENT ON COLUMN "public"."acoes_especiais"."percentual_desconto" IS 'Percentual de desconto aplicado pela ação (0-100%)';



CREATE TABLE IF NOT EXISTS "public"."agencia_contatos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agencia_id" "uuid" NOT NULL,
    "nome_contato" "text" NOT NULL,
    "email_contato" "text",
    "telefone_contato" "text",
    "cargo" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agencia_contatos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agencia_deals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_deal" character varying(255) NOT NULL,
    "agencia_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "valor_estimado" numeric(12,2),
    "data_inicio" "date",
    "data_fim" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agencia_deals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'pausado'::character varying, 'concluido'::character varying])::"text"[])))
);


ALTER TABLE "public"."agencia_deals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agencia_projeto_equipe" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid" NOT NULL,
    "pessoa_id" "uuid" NOT NULL,
    "papel" character varying(50) DEFAULT 'membro'::character varying,
    "data_entrada" "date" DEFAULT CURRENT_DATE,
    "data_saida" "date",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "agencia_projeto_equipe_papel_check" CHECK ((("papel")::"text" = ANY ((ARRAY['coordenador'::character varying, 'membro'::character varying, 'consultor'::character varying])::"text"[])))
);


ALTER TABLE "public"."agencia_projeto_equipe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agencia_projeto_marcos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "projeto_id" "uuid" NOT NULL,
    "nome_marco" character varying(255) NOT NULL,
    "descricao" "text",
    "data_prevista" "date" NOT NULL,
    "data_conclusao" "date",
    "status" "text" DEFAULT 'pendente'::character varying,
    "responsavel_id" "uuid",
    "ordem" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agencia_projeto_marcos_status_check" CHECK (("status" = ANY (ARRAY[('pendente'::character varying)::"text", ('em_andamento'::character varying)::"text", ('concluido'::character varying)::"text", ('atrasado'::character varying)::"text"])))
);


ALTER TABLE "public"."agencia_projeto_marcos" OWNER TO "postgres";


COMMENT ON TABLE "public"."agencia_projeto_marcos" IS 'Marcos de projeto - políticas RLS corrigidas para permitir CRUD por usuários autenticados';



CREATE TABLE IF NOT EXISTS "public"."agencia_projetos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_projeto" character varying(255) NOT NULL,
    "deal_id" "uuid",
    "agencia_id" "uuid" NOT NULL,
    "status_projeto" character varying(20) DEFAULT 'planejamento'::character varying,
    "data_inicio" "date",
    "data_fim" "date",
    "orcamento_projeto" numeric(12,2) DEFAULT 0,
    "valor_gasto" numeric(12,2) DEFAULT 0,
    "responsavel_projeto" "uuid",
    "cliente_final" character varying(255),
    "prioridade" character varying(10) DEFAULT 'media'::character varying,
    "progresso" integer DEFAULT 0,
    "descricao" "text",
    "briefing" "text",
    "objetivos" "text"[],
    "tags" "text"[],
    "arquivos_anexos" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "agencia_projetos_prioridade_check" CHECK ((("prioridade")::"text" = ANY ((ARRAY['baixa'::character varying, 'media'::character varying, 'alta'::character varying, 'urgente'::character varying])::"text"[]))),
    CONSTRAINT "agencia_projetos_progresso_check" CHECK ((("progresso" >= 0) AND ("progresso" <= 100))),
    CONSTRAINT "agencia_projetos_status_projeto_check" CHECK ((("status_projeto")::"text" = ANY ((ARRAY['planejamento'::character varying, 'ativo'::character varying, 'pausado'::character varying, 'concluido'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "public"."agencia_projetos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."agencias_codigo_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."agencias_codigo_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audience_estimates" (
    "id" integer NOT NULL,
    "city_norm" "text" NOT NULL,
    "specialty" "text" NOT NULL,
    "clinic_count" integer DEFAULT 0 NOT NULL,
    "estimated_patients_monthly" numeric DEFAULT 0 NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audience_estimates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audience_estimates_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audience_estimates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audience_estimates_id_seq" OWNED BY "public"."audience_estimates"."id";



CREATE TABLE IF NOT EXISTS "public"."audit_constraints_log" (
    "id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "constraint_name" "text" NOT NULL,
    "column_name" "text" NOT NULL,
    "old_reference" "text",
    "new_reference" "text",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "changed_by" "text" DEFAULT CURRENT_USER
);


ALTER TABLE "public"."audit_constraints_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_constraints_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_constraints_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_constraints_log_id_seq" OWNED BY "public"."audit_constraints_log"."id";



CREATE TABLE IF NOT EXISTS "public"."audit_orphans_log" (
    "id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "column_name" "text" NOT NULL,
    "orphan_value" "text",
    "detected_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_orphans_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_orphans_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_orphans_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_orphans_log_id_seq" OWNED BY "public"."audit_orphans_log"."id";



CREATE TABLE IF NOT EXISTS "public"."audit_screens_deleted" (
    "id" bigint,
    "name" "text",
    "code" "text",
    "city" "text",
    "state" "text",
    "created_at" timestamp with time zone,
    "deleted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_screens_deleted" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."br_states_fullname" (
    "name" "text" NOT NULL,
    "uf" character(2) NOT NULL
);


ALTER TABLE "public"."br_states_fullname" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_screens" (
    "id" bigint NOT NULL,
    "campaign_id" bigint NOT NULL,
    "screen_id" bigint NOT NULL,
    "quantity" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    CONSTRAINT "campaign_screens_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."campaign_screens" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."campaign_screens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."campaign_screens_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."campaign_screens_id_seq" OWNED BY "public"."campaign_screens"."id";



CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "customer_name" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "start_date" "date",
    "end_date" "date",
    "budget" numeric(12,2),
    "notes" "text",
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."campaigns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."campaigns_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."campaigns_id_seq" OWNED BY "public"."campaigns"."id";



CREATE TABLE IF NOT EXISTS "public"."cep_geocode" (
    "cep_int" bigint NOT NULL,
    "lat" double precision,
    "lng" double precision,
    "place_id" "text",
    "formatted_address" "text",
    "partial_match" boolean,
    "source" "text" DEFAULT 'google'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cep_geocode" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cep_geocode_stg" (
    "cep_int" bigint,
    "lat" double precision,
    "lng" double precision,
    "formatted_address" "text",
    "place_id" "text",
    "partial_match" boolean,
    "status" "text",
    "source" "text",
    "generated_at" "text"
);


ALTER TABLE "public"."cep_geocode_stg" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" integer NOT NULL,
    "name" character(1) NOT NULL
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."classes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."classes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."classes_id_seq" OWNED BY "public"."classes"."id";



CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" bigint NOT NULL,
    "proposal_id" bigint,
    "email_type" character varying(50) NOT NULL,
    "recipient_email" character varying(255) NOT NULL,
    "recipient_type" character varying(50) NOT NULL,
    "subject" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "customer_name" "text",
    "proposal_type" "text",
    "log_id" bigint GENERATED ALWAYS AS ("id") STORED
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_logs" IS 'Logs de emails enviados pelo sistema';



COMMENT ON COLUMN "public"."email_logs"."id" IS 'ID único do log de email';



COMMENT ON COLUMN "public"."email_logs"."proposal_id" IS 'ID da proposta relacionada';



COMMENT ON COLUMN "public"."email_logs"."email_type" IS 'Tipo do email (proposal_created, status_changed, etc.)';



COMMENT ON COLUMN "public"."email_logs"."recipient_email" IS 'Email do destinatário';



COMMENT ON COLUMN "public"."email_logs"."status" IS 'Status do email (pending, sent, failed)';



COMMENT ON COLUMN "public"."email_logs"."customer_name" IS 'Nome do cliente (copiado da proposta)';



COMMENT ON COLUMN "public"."email_logs"."proposal_type" IS 'Tipo da proposta (avulsa/projeto)';



CREATE SEQUENCE IF NOT EXISTS "public"."email_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."email_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."email_logs_id_seq" OWNED BY "public"."email_logs"."id";



CREATE OR REPLACE VIEW "public"."email_stats" AS
 SELECT "email_type",
    "status",
    "count"(*) AS "total",
    "count"(
        CASE
            WHEN ("created_at" >= CURRENT_DATE) THEN 1
            ELSE NULL::integer
        END) AS "today",
    "count"(
        CASE
            WHEN ("created_at" >= (CURRENT_DATE - '7 days'::interval)) THEN 1
            ELSE NULL::integer
        END) AS "last_7_days"
   FROM "public"."email_logs"
  GROUP BY "email_type", "status";


ALTER VIEW "public"."email_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."grupos_cpm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_grupo" "text" NOT NULL,
    "descricao" "text",
    "tipo_selecao" "text" NOT NULL,
    "tags_incluir" "text"[],
    "tags_excluir" "text"[],
    "cpm_valor" numeric(10,2),
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "grupos_cpm_tipo_selecao_check" CHECK (("tipo_selecao" = ANY (ARRAY['incluir_tags'::"text", 'excluir_tags'::"text", 'todas_exceto'::"text"])))
);


ALTER TABLE "public"."grupos_cpm" OWNER TO "postgres";


COMMENT ON TABLE "public"."grupos_cpm" IS 'Grupos para cálculo de CPM baseado em TAGs das telas';



COMMENT ON COLUMN "public"."grupos_cpm"."tipo_selecao" IS 'Como selecionar telas: incluir_tags, excluir_tags, ou todas_exceto';



COMMENT ON COLUMN "public"."grupos_cpm"."tags_incluir" IS 'Array de TAGs a incluir no grupo';



COMMENT ON COLUMN "public"."grupos_cpm"."tags_excluir" IS 'Array de TAGs a excluir do grupo';



CREATE SEQUENCE IF NOT EXISTS "public"."holidays_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."holidays_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."holidays_id_seq" OWNED BY "public"."holidays"."id";



CREATE TABLE IF NOT EXISTS "public"."networks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."networks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pessoas_projeto" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text",
    "telefone" "text",
    "cargo" "text",
    "agencia_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pessoas_projeto" OWNER TO "postgres";


COMMENT ON TABLE "public"."pessoas_projeto" IS 'Pessoas ou contatos que podem ser responsáveis por projetos, não necessariamente usuários do sistema.';



CREATE SEQUENCE IF NOT EXISTS "public"."price_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."price_rules_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."price_rules_id_seq" OWNED BY "public"."price_rules"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "role" "public"."role_kind" DEFAULT 'user'::"public"."role_kind" NOT NULL,
    "phone" "text",
    "organization" "text",
    "email" "text",
    "super_admin" boolean DEFAULT false NOT NULL,
    "full_name" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."super_admin" IS 'Indica se o usuário tem privilégios de super administrador';



CREATE TABLE IF NOT EXISTS "public"."proposal_screens" (
    "id" bigint NOT NULL,
    "proposal_id" bigint NOT NULL,
    "screen_id" bigint NOT NULL,
    "quantidade" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custom_cpm" numeric,
    "hours_on_override" integer,
    "daily_traffic_override" numeric
);


ALTER TABLE "public"."proposal_screens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proposals" (
    "id" bigint NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "customer_name" "text" NOT NULL,
    "customer_email" "text",
    "city" "text",
    "filters" "jsonb" NOT NULL,
    "quote" "jsonb" NOT NULL,
    "pdf_path" "text",
    "pdf_url" "text",
    "clicksign_document_key" "text",
    "clicksign_sign_url" "text",
    "pipedrive_deal_id" bigint,
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "agencia_id" "uuid",
    "proposal_type" "text" DEFAULT 'avulsa'::"text",
    "start_date" "date",
    "end_date" "date",
    "insertions_per_hour" integer DEFAULT 6,
    "film_seconds" integer DEFAULT 15,
    "impact_formula" "text" DEFAULT 'A'::"text",
    "cpm_mode" "text" DEFAULT 'blended'::"text",
    "cpm_value" numeric,
    "discount_pct" numeric DEFAULT 0,
    "discount_fixed" numeric DEFAULT 0,
    "days_calendar" integer,
    "days_business" integer,
    "impacts_calendar" numeric,
    "impacts_business" numeric,
    "gross_calendar" numeric,
    "gross_business" numeric,
    "net_calendar" numeric,
    "net_business" numeric,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email_sent_at" timestamp with time zone,
    "notes" "text",
    "status_updated_at" timestamp with time zone DEFAULT "now"(),
    "projeto_id" "uuid",
    CONSTRAINT "proposals_cpm_mode_check" CHECK (("cpm_mode" = ANY (ARRAY['manual'::"text", 'blended'::"text"]))),
    CONSTRAINT "proposals_discount_fixed_check" CHECK (("discount_fixed" >= (0)::numeric)),
    CONSTRAINT "proposals_discount_pct_check" CHECK ((("discount_pct" >= (0)::numeric) AND ("discount_pct" <= (100)::numeric))),
    CONSTRAINT "proposals_film_seconds_check" CHECK (("film_seconds" > 0)),
    CONSTRAINT "proposals_impact_formula_check" CHECK (("impact_formula" = ANY (ARRAY['A'::"text", 'B'::"text"]))),
    CONSTRAINT "proposals_insertions_per_hour_check" CHECK ((("insertions_per_hour" >= 1) AND ("insertions_per_hour" <= 12))),
    CONSTRAINT "proposals_proposal_type_check" CHECK (("proposal_type" = ANY (ARRAY['avulsa'::"text", 'projeto'::"text"])))
);


ALTER TABLE "public"."proposals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."proposals"."status" IS 'Status atual da proposta seguindo fluxo de aprovação';



COMMENT ON COLUMN "public"."proposals"."email_sent_at" IS 'Timestamp de quando o email da proposta foi enviado ao cliente';



COMMENT ON COLUMN "public"."proposals"."notes" IS 'Observações e notas sobre a proposta';



COMMENT ON COLUMN "public"."proposals"."status_updated_at" IS 'Timestamp da última alteração de status';



CREATE OR REPLACE VIEW "public"."proposal_kpis" AS
 SELECT "id",
    "proposal_type",
    "start_date",
    "end_date",
    "cpm_mode",
    "cpm_value",
    "discount_pct",
    "discount_fixed",
    "days_calendar",
    "days_business",
    "impacts_calendar",
    "impacts_business",
    "gross_calendar",
    "gross_business",
    "net_calendar",
    "net_business",
        CASE
            WHEN ("cpm_mode" = 'manual'::"text") THEN "cpm_value"
            ELSE COALESCE("cpm_value", (0)::numeric)
        END AS "effective_cpm",
    COALESCE("net_business", "gross_business", (0)::numeric) AS "total_value",
    "created_by",
    "created_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."proposal_screens" "ps"
          WHERE ("ps"."proposal_id" = "p"."id")) AS "total_screens",
        CASE
            WHEN ("end_date" < CURRENT_DATE) THEN 'expired'::"text"
            WHEN ("start_date" > CURRENT_DATE) THEN 'future'::"text"
            WHEN ("status" = 'aceita'::"text") THEN 'active'::"text"
            WHEN ("status" = 'enviada'::"text") THEN 'active'::"text"
            WHEN ("status" = 'em_analise'::"text") THEN 'active'::"text"
            ELSE 'draft'::"text"
        END AS "status"
   FROM "public"."proposals" "p";


ALTER VIEW "public"."proposal_kpis" OWNER TO "postgres";


COMMENT ON VIEW "public"."proposal_kpis" IS 'View consolidada para KPIs de propostas - usado pelo dashboard';



CREATE OR REPLACE VIEW "public"."proposal_locales" AS
 SELECT DISTINCT "ps"."proposal_id",
    "s"."city",
    "s"."state",
    "s"."city_norm",
    "s"."state_norm",
    "count"("ps"."screen_id") OVER (PARTITION BY "ps"."proposal_id", "s"."city", "s"."state") AS "screens_count"
   FROM ("public"."proposal_screens" "ps"
     JOIN "public"."screens" "s" ON (("s"."id" = "ps"."screen_id")))
  ORDER BY "ps"."proposal_id", "s"."state", "s"."city";


ALTER VIEW "public"."proposal_locales" OWNER TO "postgres";


COMMENT ON VIEW "public"."proposal_locales" IS 'View que lista todas as localidades (cidades/estados) de uma proposta com contagem de telas';



CREATE OR REPLACE VIEW "public"."proposal_locations_summary" AS
 SELECT "proposal_id",
    "count"(DISTINCT "state") AS "states_count",
    "count"(DISTINCT "city") AS "cities_count",
    "sum"("screens_count") AS "total_screens",
    "string_agg"(DISTINCT "state", ', '::"text" ORDER BY "state") AS "states_list",
    "string_agg"(DISTINCT "city", ', '::"text" ORDER BY "city") AS "cities_list"
   FROM "public"."proposal_locales"
  GROUP BY "proposal_id";


ALTER VIEW "public"."proposal_locations_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."proposal_locations_summary" IS 'Resumo agregado das localidades por proposta para visão executiva';



CREATE SEQUENCE IF NOT EXISTS "public"."proposal_screens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."proposal_screens_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."proposal_screens_id_seq" OWNED BY "public"."proposal_screens"."id";



CREATE TABLE IF NOT EXISTS "public"."proposal_snapshots" (
    "proposal_id" bigint NOT NULL,
    "payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."proposal_snapshots" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."proposals_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."proposals_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."proposals_id_seq" OWNED BY "public"."proposals"."id";



CREATE TABLE IF NOT EXISTS "public"."proposta_servicos_especiais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "proposta_id" bigint NOT NULL,
    "servico_id" "uuid" NOT NULL,
    "acao_id" "uuid",
    "quantidade" integer DEFAULT 1,
    "preco_unitario" numeric(10,2) NOT NULL,
    "preco_total" numeric(10,2) NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "proposta_servicos_especiais_quantidade_check" CHECK (("quantidade" > 0))
);


ALTER TABLE "public"."proposta_servicos_especiais" OWNER TO "postgres";


COMMENT ON TABLE "public"."proposta_servicos_especiais" IS 'Relacionamento entre propostas e serviços especiais contratados';



CREATE TABLE IF NOT EXISTS "public"."user_profiles_secure" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles_secure" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" DEFAULT 'user'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."safe_user_profiles" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."display_name",
    "p"."avatar_url",
    (COALESCE("r"."role", 'user'::"public"."app_role"))::"text" AS "effective_role"
   FROM ("public"."user_profiles_secure" "p"
     LEFT JOIN "public"."user_roles" "r" ON (("r"."user_id" = "p"."id")));


ALTER VIEW "public"."safe_user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."safe_venues" WITH ("security_invoker"='true') AS
 SELECT "id",
    "name",
    "code",
    "country",
    "state",
    "district",
    "lat",
    "lng",
    "created_at"
   FROM "public"."venues";


ALTER VIEW "public"."safe_venues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."screen_availability" (
    "id" bigint NOT NULL,
    "screen_id" bigint NOT NULL,
    "available_from" "date" NOT NULL,
    "available_to" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "available_period" "daterange" GENERATED ALWAYS AS ("daterange"("available_from", "available_to", '[]'::"text")) STORED,
    CONSTRAINT "screen_availability_date_chk" CHECK (("available_from" <= "available_to"))
);


ALTER TABLE "public"."screen_availability" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."screen_availability_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."screen_availability_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."screen_availability_id_seq" OWNED BY "public"."screen_availability"."id";



CREATE TABLE IF NOT EXISTS "public"."screen_bookings" (
    "id" bigint NOT NULL,
    "screen_id" bigint NOT NULL,
    "booked_from" "date" NOT NULL,
    "booked_to" "date" NOT NULL,
    "status" "text" DEFAULT 'confirmed'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "booked_period" "daterange" GENERATED ALWAYS AS ("daterange"("booked_from", "booked_to", '[]'::"text")) STORED,
    CONSTRAINT "screen_bookings_date_chk" CHECK (("booked_from" <= "booked_to"))
);


ALTER TABLE "public"."screen_bookings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."screen_bookings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."screen_bookings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."screen_bookings_id_seq" OWNED BY "public"."screen_bookings"."id";



CREATE TABLE IF NOT EXISTS "public"."screen_classes" (
    "screen_id" bigint NOT NULL,
    "class_id" integer NOT NULL
);


ALTER TABLE "public"."screen_classes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."screen_proposal_popularity" AS
 SELECT "s"."id" AS "screen_id",
    "s"."lat",
    "s"."lng",
    "s"."name",
    "s"."city",
    'ND'::"text" AS "class",
    "count"("ps"."id") AS "proposal_count"
   FROM ("public"."screens" "s"
     JOIN "public"."proposal_screens" "ps" ON (("s"."id" = "ps"."screen_id")))
  WHERE (("s"."lat" IS NOT NULL) AND ("s"."lng" IS NOT NULL))
  GROUP BY "s"."id", "s"."lat", "s"."lng", "s"."name", "s"."city"
  ORDER BY ("count"("ps"."id")) DESC;


ALTER VIEW "public"."screen_proposal_popularity" OWNER TO "postgres";


COMMENT ON VIEW "public"."screen_proposal_popularity" IS 'View que calcula a popularidade de cada tela baseada no número de propostas';



CREATE TABLE IF NOT EXISTS "public"."screen_rates" (
    "id" bigint NOT NULL,
    "screen_id" bigint,
    "standard_rate_month" numeric,
    "selling_rate_month" numeric,
    "cpm" numeric,
    "spot_duration_secs" numeric,
    "spots_per_hour" numeric,
    "min_spots_per_day" numeric,
    "max_spots_per_day" numeric,
    "mode_of_operation" "text",
    "effective_from" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "effective_to" "date",
    "rate_period" "daterange",
    CONSTRAINT "chk_screen_rates_dates" CHECK ((("effective_from" IS NULL) OR ("effective_to" IS NULL) OR ("effective_from" <= "effective_to")))
);


ALTER TABLE "public"."screen_rates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."screen_rates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."screen_rates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."screen_rates_id_seq" OWNED BY "public"."screen_rates"."id";



CREATE TABLE IF NOT EXISTS "public"."screens_backup_20250919" (
    "id" bigint,
    "code" "text",
    "name" "text",
    "address_raw" "text",
    "address_norm" "text",
    "city" "text",
    "state" "text",
    "cep" "text",
    "lat" double precision,
    "lng" double precision,
    "geom" "public"."geography"(Point,4326),
    "specialty" "text"[],
    "active" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "venue_id" bigint,
    "display_name" "text",
    "board_format" "text",
    "category" "text",
    "venue_type_parent" "text",
    "venue_type_child" "text",
    "venue_type_grandchildren" "text",
    "facing" "text",
    "screen_facing" "text",
    "screen_start_time" "text",
    "screen_end_time" "text",
    "asset_url" "text",
    "city_norm" "text",
    "state_norm" "text",
    "tag" "text",
    "google_place_id" "text",
    "google_formatted_address" "text",
    "base_daily_traffic" integer,
    "spots_per_hour" integer,
    "state_uf" character(2),
    "class" "public"."class_band"
);


ALTER TABLE "public"."screens_backup_20250919" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."screens_backup_20250919_144453" (
    "id" bigint,
    "code" "text",
    "name" "text",
    "address_raw" "text",
    "address_norm" "text",
    "city" "text",
    "state" "text",
    "cep" "text",
    "lat" double precision,
    "lng" double precision,
    "geom" "public"."geography"(Point,4326),
    "specialty" "text"[],
    "active" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "venue_id" bigint,
    "display_name" "text",
    "board_format" "text",
    "category" "text",
    "venue_type_parent" "text",
    "venue_type_child" "text",
    "venue_type_grandchildren" "text",
    "facing" "text",
    "screen_facing" "text",
    "screen_start_time" "text",
    "screen_end_time" "text",
    "asset_url" "text",
    "city_norm" "text",
    "state_norm" "text",
    "tag" "text",
    "google_place_id" "text",
    "google_formatted_address" "text",
    "base_daily_traffic" integer,
    "spots_per_hour" integer,
    "state_uf" character(2),
    "class" "public"."class_band"
);


ALTER TABLE "public"."screens_backup_20250919_144453" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."screens_backup_geo_utc_now" (
    "id" bigint,
    "code" "text",
    "name" "text",
    "address_raw" "text",
    "address_norm" "text",
    "city" "text",
    "state" "text",
    "cep" "text",
    "lat" double precision,
    "lng" double precision,
    "geom" "public"."geography"(Point,4326),
    "specialty" "text"[],
    "active" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "venue_id" bigint,
    "display_name" "text",
    "board_format" "text",
    "category" "text",
    "venue_type_parent" "text",
    "venue_type_child" "text",
    "venue_type_grandchildren" "text",
    "facing" "text",
    "screen_facing" "text",
    "screen_start_time" "text",
    "screen_end_time" "text",
    "asset_url" "text",
    "city_norm" "text",
    "state_norm" "text",
    "tag" "text",
    "google_place_id" "text",
    "google_formatted_address" "text",
    "base_daily_traffic" integer,
    "spots_per_hour" integer,
    "state_uf" character(2),
    "class" "public"."class_band",
    "cep_norm" character(8)
);


ALTER TABLE "public"."screens_backup_geo_utc_now" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."screens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."screens_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."screens_id_seq" OWNED BY "public"."screens"."id";



CREATE TABLE IF NOT EXISTS "public"."servicos_especiais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome_servico" "text" NOT NULL,
    "descricao" "text",
    "preco_base" numeric(10,2) DEFAULT 0 NOT NULL,
    "tipo_cobranca" "text" DEFAULT 'fixo'::"text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "servicos_especiais_tipo_cobranca_check" CHECK (("tipo_cobranca" = ANY (ARRAY['fixo'::"text", 'por_tela'::"text", 'por_mes'::"text", 'personalizado'::"text"])))
);


ALTER TABLE "public"."servicos_especiais" OWNER TO "postgres";


COMMENT ON TABLE "public"."servicos_especiais" IS 'Serviços adicionais para propostas (Produção de Vídeo, Quadros e VTs, etc.)';



COMMENT ON COLUMN "public"."servicos_especiais"."tipo_cobranca" IS 'Como cobrar o serviço: fixo, por_tela, por_mes, personalizado';



CREATE TABLE IF NOT EXISTS "public"."specialties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."specialties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialty_term_map" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "term_original" "text" NOT NULL,
    "term_norm" "text" NOT NULL,
    "specialty_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."specialty_term_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staging_screens" (
    "code" "text",
    "display_name" "text",
    "address_raw" "text",
    "city" "text",
    "state" "text",
    "class" "text",
    "specialty" "text",
    "category" "text",
    "lat" "text",
    "lng" "text",
    "base_daily_traffic" "text",
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "cep" "text"
);


ALTER TABLE "public"."staging_screens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stg_billboard_data" (
    "raw_id" bigint NOT NULL,
    "board_name" "text",
    "display_name" "text",
    "facing" "text",
    "screen_facing" "text",
    "board_format" "text",
    "category" "text",
    "venue_type_parent" "text",
    "venue_type_child" "text",
    "venue_type_grandchildren" "text",
    "latitude" double precision,
    "longitude" double precision,
    "country" "text",
    "state" "text",
    "district" "text",
    "active" "text",
    "available" "text",
    "screen_start_time" "text",
    "screen_end_time" "text",
    "spot_duration_secs" numeric,
    "spots_per_hour" numeric,
    "no_of_clients_per_loop" numeric,
    "minimum_spots_per_day" numeric,
    "maximum_spots_per_day" numeric,
    "mode_of_operation" "text",
    "spots_reserved_for_mw" "text",
    "expose_to_max" "text",
    "expose_to_mad" "text",
    "standard_rates_month" numeric,
    "selling_rate_month" numeric,
    "asset_url" "text",
    "cpm" numeric,
    "audiences_monthly" numeric,
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "imported_by" "uuid"
);


ALTER TABLE "public"."stg_billboard_data" OWNER TO "postgres";


COMMENT ON TABLE "public"."stg_billboard_data" IS 'Staging table for billboard data imports';



CREATE SEQUENCE IF NOT EXISTS "public"."stg_billboard_data_raw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stg_billboard_data_raw_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stg_billboard_data_raw_id_seq" OWNED BY "public"."stg_billboard_data"."raw_id";



CREATE TABLE IF NOT EXISTS "public"."stg_ponto" (
    "raw_id" bigint NOT NULL,
    "codigo_de_ponto" "text",
    "ponto_de_cuidado" "text",
    "audiencia" numeric,
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "imported_by" "uuid",
    "screen_id" bigint
);


ALTER TABLE "public"."stg_ponto" OWNER TO "postgres";


COMMENT ON TABLE "public"."stg_ponto" IS 'Staging table for point/screen data imports';



CREATE OR REPLACE VIEW "public"."stg_billboard_enriched" WITH ("security_invoker"='true') AS
 WITH "map_code" AS (
         SELECT "public"."norm_txt"("p"."ponto_de_cuidado") AS "k_name",
            TRIM(BOTH FROM "p"."codigo_de_ponto") AS "code"
           FROM "public"."stg_ponto" "p"
          WHERE (COALESCE(TRIM(BOTH FROM "p"."codigo_de_ponto"), ''::"text") <> ''::"text")
        )
 SELECT "b"."raw_id",
    "b"."board_name",
    "b"."display_name",
    "b"."facing",
    "b"."screen_facing",
    "b"."board_format",
    "b"."category",
    "b"."venue_type_parent",
    "b"."venue_type_child",
    "b"."venue_type_grandchildren",
    "b"."latitude",
    "b"."longitude",
    "b"."country",
    "b"."state",
    "b"."district",
    "b"."active",
    "b"."available",
    "b"."screen_start_time",
    "b"."screen_end_time",
    "b"."spot_duration_secs",
    "b"."spots_per_hour",
    "b"."no_of_clients_per_loop",
    "b"."minimum_spots_per_day",
    "b"."maximum_spots_per_day",
    "b"."mode_of_operation",
    "b"."spots_reserved_for_mw",
    "b"."expose_to_max",
    "b"."expose_to_mad",
    "b"."standard_rates_month",
    "b"."selling_rate_month",
    "b"."asset_url",
    "b"."cpm",
    "b"."audiences_monthly",
    "b"."imported_at",
    "m"."code" AS "codigo_de_ponto_guess"
   FROM ("public"."stg_billboard_data" "b"
     LEFT JOIN "map_code" "m" ON (("public"."norm_txt"(COALESCE("b"."display_name", "b"."board_name")) = "m"."k_name")));


ALTER VIEW "public"."stg_billboard_enriched" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stg_ceps" (
    "CEP" "text",
    "UF" "text",
    "CIDADE" "text",
    "BAIRRO" "text",
    "LOGRADOURO" "text",
    "cep_int" integer GENERATED ALWAYS AS ((NULLIF("regexp_replace"("CEP", '[^0-9]'::"text", ''::"text", 'g'::"text"), ''::"text"))::integer) STORED,
    "logradouro_norm" "text",
    "cidade_norm" "text",
    "bairro_norm" "text"
);


ALTER TABLE "public"."stg_ceps" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."stg_ponto_raw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stg_ponto_raw_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stg_ponto_raw_id_seq" OWNED BY "public"."stg_ponto"."raw_id";



CREATE TABLE IF NOT EXISTS "public"."stg_screens_new" (
    "REDE" "text",
    "UF" "text",
    "REGIÃO" "text",
    "CIDADE" "text",
    "CAPITAL/INTERIOR" "text",
    "LATITUDE" "text",
    "LONGITUDE" "text",
    "CÓDIGO DE PONTO" "text",
    "Nome do Ponto" "text",
    "Tipo de Espaço" "text",
    "CLASSE" "text",
    "display_name" "text",
    "AUDIÊNCIA" "text",
    "RESTRIÇÕES" "text",
    "PROGRAMÁTICA" "text",
    "endereco_completo" "text",
    "CEP" "text",
    "ACEITA CONVÊNIO" "text",
    "ESPECIALIDADES ATENDIDAS" "text",
    "ESPECIALIDADE 1" "text",
    "ESPECIALIDADE 2" "text",
    "ESPECIALIDADE 3" "text",
    "ESPECIALIDADE 4" "text",
    "ESPECIALIDADE 5" "text",
    "code_norm" "text" GENERATED ALWAYS AS ("regexp_replace"("CÓDIGO DE PONTO", '[^A-Za-z0-9]'::"text", ''::"text", 'g'::"text")) STORED
);


ALTER TABLE "public"."stg_screens_new" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stg_venue_specialties_pairs" (
    "code" "text",
    "spec" "text"
);


ALTER TABLE "public"."stg_venue_specialties_pairs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stg_venue_specs_raw" (
    "code" "text",
    "raw" "text"
);


ALTER TABLE "public"."stg_venue_specs_raw" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tmp_ceps_uf" (
    "cep" "text",
    "cidade_norm" "text",
    "logradouro_norm" "text"
);


ALTER TABLE "public"."tmp_ceps_uf" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_profiles" WITH ("security_invoker"='true') AS
 SELECT "id",
    "display_name",
    "avatar_url",
    "created_at"
   FROM "public"."user_profiles_secure";


ALTER VIEW "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_profiles_admin" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."display_name",
    "p"."avatar_url",
    "p"."email",
    ("r"."role")::"text" AS "profile_role",
    "p"."created_at"
   FROM ("public"."user_profiles_secure" "p"
     LEFT JOIN "public"."user_roles" "r" ON (("r"."user_id" = "p"."id")));


ALTER VIEW "public"."user_profiles_admin" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_profiles_extended" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."display_name",
    "p"."avatar_url",
    "p"."created_at",
    ("r"."role")::"text" AS "profile_role"
   FROM ("public"."user_profiles_secure" "p"
     LEFT JOIN "public"."user_roles" "r" ON (("r"."user_id" = "p"."id")));


ALTER VIEW "public"."user_profiles_extended" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_proposal_items" AS
 SELECT "p"."id" AS "proposal_id",
    "p"."customer_name",
    "p"."customer_email",
    "p"."city" AS "proposal_city",
    "p"."start_date",
    "p"."end_date",
    "p"."insertions_per_hour",
    "p"."film_seconds",
    "p"."cpm_mode",
    "p"."cpm_value",
    "p"."discount_pct",
    "p"."discount_fixed",
    "p"."agencia_id",
    "p"."projeto_id",
    "s"."id" AS "screen_id",
    COALESCE("s"."city", ''::"text") AS "city",
    COALESCE("s"."state", ''::"text") AS "state",
    COALESCE("s"."category", ''::"text") AS "category",
    "s"."specialty" AS "specialties"
   FROM (("public"."proposals" "p"
     JOIN "public"."proposal_screens" "ps" ON (("ps"."proposal_id" = "p"."id")))
     JOIN "public"."screens" "s" ON (("s"."id" = "ps"."screen_id")));


ALTER VIEW "public"."v_proposal_items" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_proposal_pdf" AS
 SELECT "p"."id" AS "proposal_id",
    "p"."created_at",
    "p"."customer_name",
    "p"."customer_email",
    "p"."city",
    "p"."status",
    "p"."filters",
    "p"."quote",
    "p"."discount_pct",
    "p"."discount_fixed",
    "p"."cpm_mode",
    "p"."cpm_value",
    "p"."insertions_per_hour",
    "p"."film_seconds",
    "s"."id" AS "screen_id",
    "s"."code",
    COALESCE("s"."display_name", "s"."name") AS "screen_name",
    "s"."city" AS "screen_city",
    "s"."state" AS "screen_state",
    "s"."spots_per_hour",
    "s"."base_daily_traffic",
    "ps"."custom_cpm",
    "ps"."hours_on_override",
    "ps"."daily_traffic_override"
   FROM (("public"."proposals" "p"
     LEFT JOIN "public"."proposal_screens" "ps" ON (("ps"."proposal_id" = "p"."id")))
     LEFT JOIN "public"."screens" "s" ON (("s"."id" = "ps"."screen_id")));


ALTER VIEW "public"."v_proposal_pdf" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_screens_enriched" AS
 SELECT "sc"."id",
    "sc"."code",
    "sc"."name",
    "sc"."display_name",
    "sc"."city",
    "sc"."state",
    "sc"."cep",
        CASE
            WHEN ("sc"."address_raw" IS NOT NULL) THEN "sc"."address_raw"
            WHEN (("sc"."city" IS NOT NULL) AND ("sc"."state" IS NOT NULL)) THEN "concat"(COALESCE("sc"."address_raw", 'Endereço não informado'::"text"), ', ', "sc"."city", ' – ', "sc"."state")
            ELSE "sc"."address_raw"
        END AS "address",
    "sc"."lat",
    "sc"."lng",
    "sc"."geom",
    "sc"."active" AS "screen_active",
    COALESCE(("sc"."class")::"text", 'ND'::"text") AS "class",
    COALESCE("sc"."specialty", ARRAY[]::"text"[]) AS "specialty",
    COALESCE("sc"."board_format", 'LED'::"text") AS "board_format",
    COALESCE("sc"."category", 'Outdoor'::"text") AS "category",
    "sr"."standard_rate_month",
    "sr"."selling_rate_month",
    "sr"."spots_per_hour",
    "sr"."spot_duration_secs",
    NULL::"text" AS "venue_name",
    NULL::"text" AS "venue_address",
    NULL::"text" AS "venue_country",
    NULL::"text" AS "venue_state",
    NULL::"text" AS "venue_district",
        CASE
            WHEN ("sc"."code" ~~ 'P%'::"text") THEN 'TV Doutor'::"text"
            WHEN ("sc"."code" ~~ 'LG%'::"text") THEN 'LG'::"text"
            WHEN ("sc"."code" ~~ 'AM%'::"text") THEN 'Amil'::"text"
            ELSE 'TV Doutor'::"text"
        END AS "rede",
    "sc"."name" AS "staging_nome_ponto",
    NULL::integer AS "staging_audiencia",
        CASE
            WHEN (("sc"."specialty" IS NOT NULL) AND ("array_length"("sc"."specialty", 1) > 0)) THEN "array_to_string"("sc"."specialty", ', '::"text")
            ELSE NULL::"text"
        END AS "staging_especialidades",
    NULL::"text" AS "staging_tipo_venue",
    NULL::"text" AS "staging_subtipo",
    "sc"."category" AS "staging_categoria",
    "sc"."created_at",
    "sc"."updated_at"
   FROM ("public"."screens" "sc"
     LEFT JOIN "public"."screen_rates" "sr" ON (("sr"."screen_id" = "sc"."id")))
  ORDER BY "sc"."code";


ALTER VIEW "public"."v_screens_enriched" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_screens_enriched" IS 'View enriquecida com especialidades normalizadas e bem formatadas';



CREATE OR REPLACE VIEW "public"."v_specialty_term_map" AS
 SELECT "m"."term_original",
    "m"."term_norm",
    "s"."name" AS "specialty"
   FROM ("public"."specialty_term_map" "m"
     JOIN "public"."specialties" "s" ON (("s"."id" = "m"."specialty_id")))
  ORDER BY "m"."term_norm";


ALTER VIEW "public"."v_specialty_term_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."venue_audience_monthly" (
    "id" bigint NOT NULL,
    "venue_id" bigint,
    "month" "date" NOT NULL,
    "audience" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."venue_audience_monthly" OWNER TO "postgres";


COMMENT ON TABLE "public"."venue_audience_monthly" IS 'Monthly audience data for venues';



CREATE SEQUENCE IF NOT EXISTS "public"."venue_audience_monthly_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."venue_audience_monthly_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."venue_audience_monthly_id_seq" OWNED BY "public"."venue_audience_monthly"."id";



CREATE TABLE IF NOT EXISTS "public"."venue_specialties" (
    "venue_id" bigint NOT NULL,
    "specialty_id" "uuid" NOT NULL
);


ALTER TABLE "public"."venue_specialties" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."venues_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."venues_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."venues_id_seq" OWNED BY "public"."venues"."id";



CREATE OR REPLACE VIEW "public"."vw_venue_specialties" AS
 SELECT "v"."id" AS "venue_id",
    "v"."code" AS "venue_code",
    "v"."name" AS "venue_name",
    "v"."state_uf",
    "s"."id" AS "specialty_id",
    "s"."name" AS "specialty_name",
    "v"."created_at" AS "venue_created_at",
    "s"."created_at" AS "specialty_created_at"
   FROM (("public"."venue_specialties" "vs"
     JOIN "public"."venues" "v" ON (("v"."id" = "vs"."venue_id")))
     JOIN "public"."specialties" "s" ON (("s"."id" = "vs"."specialty_id")))
  ORDER BY "v"."code", "s"."name";


ALTER VIEW "public"."vw_venue_specialties" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_inventory_full" AS
 WITH "norm_cep" AS (
         SELECT "s_1"."id",
            (NULLIF("regexp_replace"("s_1"."cep", '[^0-9]'::"text", ''::"text", 'g'::"text"), ''::"text"))::bigint AS "cep_int"
           FROM "public"."screens" "s_1"
        ), "last_rate" AS (
         SELECT DISTINCT ON ("sr"."screen_id") "sr"."screen_id",
            "sr"."standard_rate_month",
            "sr"."selling_rate_month",
            "sr"."spot_duration_secs",
            "sr"."spots_per_hour"
           FROM "public"."screen_rates" "sr"
          ORDER BY "sr"."screen_id", COALESCE(("sr"."effective_from")::timestamp with time zone, "sr"."created_at") DESC, "sr"."id" DESC
        ), "class_map" AS (
         SELECT "sc"."screen_id",
            "array_agg"("c"."name" ORDER BY "c"."id") AS "classes"
           FROM ("public"."screen_classes" "sc"
             JOIN "public"."classes" "c" ON (("c"."id" = "sc"."class_id")))
          GROUP BY "sc"."screen_id"
        ), "venue_specs_base" AS (
         SELECT "vs"."venue_id",
            "array_agg"("sp"."name" ORDER BY "sp"."name") AS "specialties"
           FROM ("public"."venue_specialties" "vs"
             JOIN "public"."specialties" "sp" ON (("sp"."id" = "vs"."specialty_id")))
          GROUP BY "vs"."venue_id"
        ), "venue_specs_view" AS (
         SELECT "vws"."venue_name",
            ("vws"."state_uf")::"text" AS "state_uf",
            "array_agg"(DISTINCT "vws"."specialty_name" ORDER BY "vws"."specialty_name") AS "specialties_view"
           FROM "public"."vw_venue_specialties" "vws"
          GROUP BY "vws"."venue_name", "vws"."state_uf"
        ), "stg" AS (
         SELECT "regexp_replace"("staging_screens"."code", '\s+'::"text", ''::"text", 'g'::"text") AS "code_norm",
            "staging_screens"."address_raw" AS "stg_address_raw",
            "staging_screens"."specialty" AS "stg_specialty_txt",
            "staging_screens"."category" AS "stg_category",
            (NULLIF("regexp_replace"("staging_screens"."base_daily_traffic", '[^0-9]'::"text", ''::"text", 'g'::"text"), ''::"text"))::bigint AS "stg_base_daily_traffic"
           FROM "public"."staging_screens"
        )
 SELECT "s"."id",
    "s"."code",
    "s"."name",
    "s"."display_name",
    "s"."city",
    COALESCE(("s"."state_uf")::"text", "s"."state") AS "state",
    "s"."cep",
    COALESCE("s"."address_norm", "s"."address_raw", "st"."stg_address_raw") AS "address_raw",
    COALESCE("s"."lat", "cg"."lat") AS "lat",
    COALESCE("s"."lng", "cg"."lng") AS "lng",
    "s"."geom",
    "s"."active",
    "s"."venue_type_parent",
    "s"."venue_type_child",
    "s"."venue_type_grandchildren",
    "s"."class",
    COALESCE("s"."category", "st"."stg_category") AS "category",
    COALESCE("s"."base_daily_traffic", "st"."stg_base_daily_traffic") AS "base_daily_traffic",
    COALESCE("vsv"."specialties_view", "vsb"."specialties", NULLIF("s"."specialty", ARRAY[]::"text"[]),
        CASE
            WHEN ("st"."stg_specialty_txt" IS NOT NULL) THEN "string_to_array"("st"."stg_specialty_txt", ','::"text")
            ELSE ARRAY[]::"text"[]
        END) AS "specialties",
    "cm"."classes" AS "classes_map",
    "v"."id" AS "venue_id",
    "v"."name" AS "venue_name",
    "v"."state_uf" AS "venue_state_uf",
    "lr"."standard_rate_month",
    "lr"."selling_rate_month",
    "lr"."spots_per_hour",
    "lr"."spot_duration_secs"
   FROM (((((((("public"."screens" "s"
     LEFT JOIN "stg" "st" ON (("st"."code_norm" = "s"."code")))
     LEFT JOIN "norm_cep" "nc" ON (("nc"."id" = "s"."id")))
     LEFT JOIN "public"."cep_geocode" "cg" ON (("cg"."cep_int" = "nc"."cep_int")))
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "s"."venue_id")))
     LEFT JOIN "venue_specs_view" "vsv" ON ((("vsv"."venue_name" = "v"."name") AND ("vsv"."state_uf" = COALESCE(("v"."state_uf")::"text", "s"."state")))))
     LEFT JOIN "venue_specs_base" "vsb" ON (("vsb"."venue_id" = "s"."venue_id")))
     LEFT JOIN "class_map" "cm" ON (("cm"."screen_id" = "s"."id")))
     LEFT JOIN "last_rate" "lr" ON (("lr"."screen_id" = "s"."id")));


ALTER VIEW "public"."vw_inventory_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_screens_front" AS
 WITH "norm_cep" AS (
         SELECT "s_1"."id",
            (NULLIF("regexp_replace"("s_1"."cep", '[^0-9]'::"text", ''::"text", 'g'::"text"), ''::"text"))::bigint AS "cep_int"
           FROM "public"."screens" "s_1"
        ), "geo_fill" AS (
         SELECT "s_1"."id",
            COALESCE("s_1"."lat", "cg"."lat") AS "lat_final",
            COALESCE("s_1"."lng", "cg"."lng") AS "lng_final"
           FROM (("public"."screens" "s_1"
             LEFT JOIN "norm_cep" "nc" ON (("nc"."id" = "s_1"."id")))
             LEFT JOIN "public"."cep_geocode" "cg" ON (("cg"."cep_int" = "nc"."cep_int")))
        ), "class_map" AS (
         SELECT "sc"."screen_id",
            "array_agg"("c"."name" ORDER BY "c"."id") AS "classes"
           FROM ("public"."screen_classes" "sc"
             JOIN "public"."classes" "c" ON (("c"."id" = "sc"."class_id")))
          GROUP BY "sc"."screen_id"
        ), "venue_specs" AS (
         SELECT "vs_1"."venue_id",
            "array_agg"("sp"."name" ORDER BY "sp"."name") AS "venue_specialties"
           FROM ("public"."venue_specialties" "vs_1"
             JOIN "public"."specialties" "sp" ON (("sp"."id" = "vs_1"."specialty_id")))
          GROUP BY "vs_1"."venue_id"
        ), "state_dim" AS (
         SELECT "s_1"."id",
            "s_1"."state_uf" AS "state_uf_final",
            "bs"."nome" AS "state_name"
           FROM ("public"."screens" "s_1"
             LEFT JOIN "public"."br_states" "bs" ON (("bs"."uf" = "s_1"."state_uf")))
        )
 SELECT "s"."id",
    "s"."code",
    COALESCE("s"."display_name", "s"."name") AS "display_name",
    "s"."name",
    "s"."address_raw",
    "s"."address_norm",
    "s"."city",
    "sd"."state_uf_final" AS "state_uf",
    "sd"."state_name",
    "s"."cep",
    "gf"."lat_final" AS "lat",
    "gf"."lng_final" AS "lng",
    "s"."specialty" AS "screen_specialty",
    "s"."category",
    "s"."venue_type_parent",
    "s"."venue_type_child",
    "s"."venue_type_grandchildren",
    "s"."board_format",
    "s"."screen_start_time",
    "s"."screen_end_time",
    "s"."spots_per_hour",
    "s"."venue_id",
    "v"."code" AS "venue_code",
    "v"."name" AS "venue_name",
    "v"."cidade" AS "venue_city",
    "v"."state_uf" AS "venue_state_uf",
    "vs"."venue_specialties",
    "cm"."classes",
    "s"."active",
    "s"."created_at",
    "s"."updated_at"
   FROM ((((("public"."screens" "s"
     LEFT JOIN "geo_fill" "gf" ON (("gf"."id" = "s"."id")))
     LEFT JOIN "state_dim" "sd" ON (("sd"."id" = "s"."id")))
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "s"."venue_id")))
     LEFT JOIN "venue_specs" "vs" ON (("vs"."venue_id" = "s"."venue_id")))
     LEFT JOIN "class_map" "cm" ON (("cm"."screen_id" = "s"."id")));


ALTER VIEW "public"."vw_screens_front" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_screens_full" AS
 WITH "last_rate" AS (
         SELECT DISTINCT ON ("sr"."screen_id") "sr"."screen_id",
            "sr"."standard_rate_month",
            "sr"."selling_rate_month",
            "sr"."cpm",
            "sr"."spot_duration_secs",
            "sr"."spots_per_hour" AS "rate_spots_per_hour",
            "sr"."effective_from",
            "sr"."effective_to"
           FROM "public"."screen_rates" "sr"
          ORDER BY "sr"."screen_id", COALESCE(("sr"."effective_from")::timestamp with time zone, "sr"."created_at") DESC, "sr"."id" DESC
        ), "class_map" AS (
         SELECT "sc"."screen_id",
            "array_agg"("c"."name" ORDER BY "c"."id") AS "classes"
           FROM ("public"."screen_classes" "sc"
             JOIN "public"."classes" "c" ON (("c"."id" = "sc"."class_id")))
          GROUP BY "sc"."screen_id"
        ), "avail" AS (
         SELECT "sa"."screen_id",
            "min"("sa"."available_from") FILTER (WHERE ("sa"."available_from" >= CURRENT_DATE)) AS "next_available_from",
            "min"("sa"."available_to") FILTER (WHERE ("sa"."available_to" >= CURRENT_DATE)) AS "next_available_to"
           FROM "public"."screen_availability" "sa"
          GROUP BY "sa"."screen_id"
        ), "booked" AS (
         SELECT "sb"."screen_id",
            "count"(*) FILTER (WHERE (CURRENT_DATE <= "sb"."booked_to")) AS "future_bookings"
           FROM "public"."screen_bookings" "sb"
          GROUP BY "sb"."screen_id"
        )
 SELECT "s"."id",
    "s"."code",
    "s"."name",
    "s"."display_name",
    "s"."address_raw",
    "s"."address_norm",
    "s"."city",
    COALESCE("s"."state_uf", ("s"."state")::"bpchar") AS "state_uf",
    "bs"."nome" AS "state_name",
    "s"."cep",
    "s"."lat",
    "s"."lng",
    "s"."geom",
    "s"."specialty",
    "s"."category",
    "s"."venue_type_parent",
    "s"."venue_type_child",
    "s"."venue_type_grandchildren",
    "s"."board_format",
    "s"."screen_start_time",
    "s"."screen_end_time",
    "s"."spots_per_hour",
    "lr"."standard_rate_month",
    "lr"."selling_rate_month",
    "lr"."cpm",
    "lr"."spot_duration_secs",
    "lr"."rate_spots_per_hour",
    "v"."id" AS "venue_id",
    "v"."code" AS "venue_code",
    "v"."name" AS "venue_name",
    "v"."cidade" AS "venue_city",
    "v"."state_uf" AS "venue_state_uf",
    "cm"."classes",
    "a"."next_available_from",
    "a"."next_available_to",
    "b"."future_bookings",
    "s"."active",
    "s"."created_at",
    "s"."updated_at"
   FROM (((((("public"."screens" "s"
     LEFT JOIN "public"."venues" "v" ON (("v"."id" = "s"."venue_id")))
     LEFT JOIN "last_rate" "lr" ON (("lr"."screen_id" = "s"."id")))
     LEFT JOIN "class_map" "cm" ON (("cm"."screen_id" = "s"."id")))
     LEFT JOIN "avail" "a" ON (("a"."screen_id" = "s"."id")))
     LEFT JOIN "booked" "b" ON (("b"."screen_id" = "s"."id")))
     LEFT JOIN "public"."br_states" "bs" ON (("bs"."uf" = COALESCE("s"."state_uf", NULL::"bpchar"))));


ALTER VIEW "public"."vw_screens_full" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_screens_inventory" AS
 SELECT "sc"."id",
    "sc"."code",
    "sc"."name",
    "sc"."city",
    "sc"."state",
    "sc"."cep",
    "sc"."address_raw" AS "address",
    "sc"."lat",
    "sc"."lng",
    "sc"."geom",
    "sc"."active",
    "sc"."class",
    "sc"."venue_type_parent",
    "sc"."venue_type_child",
    "sc"."venue_type_grandchildren",
    "sr"."standard_rate_month",
    "sr"."selling_rate_month",
    "sr"."spots_per_hour",
    "sr"."spot_duration_secs",
    "sc"."name" AS "staging_nome_ponto",
    NULL::integer AS "staging_audiencia",
    NULL::"text" AS "staging_especialidades",
    "sc"."venue_type_parent" AS "staging_tipo_venue",
    "sc"."venue_type_child" AS "staging_subtipo",
    "sc"."venue_type_grandchildren" AS "staging_categoria"
   FROM ("public"."screens" "sc"
     LEFT JOIN "public"."screen_rates" "sr" ON (("sr"."screen_id" = "sc"."id")))
  ORDER BY "sc"."code";


ALTER VIEW "public"."vw_screens_inventory" OWNER TO "postgres";


COMMENT ON VIEW "public"."vw_screens_inventory" IS 'View simplificada baseada na tabela screens para alimentar as telas de inventário, mapa interativo e pontos de vendas';



CREATE OR REPLACE VIEW "public"."vw_screens_pretty" AS
 SELECT "id",
    "code",
    "name",
    "address_raw",
    "address_norm",
    "city",
    "state",
    "cep",
    "lat",
    "lng",
    "geom",
    "specialty",
    "active",
    "created_at",
    "updated_at",
    "venue_id",
    "display_name",
    "board_format",
    "category",
    "venue_type_parent",
    "venue_type_child",
    "venue_type_grandchildren",
    "facing",
    "screen_facing",
    "screen_start_time",
    "screen_end_time",
    "asset_url",
    "city_norm",
    "state_norm",
    "tag",
    "google_place_id",
    "google_formatted_address",
    "base_daily_traffic",
    "spots_per_hour",
    "state_uf",
    "class",
    "cep_norm",
    "geo"
   FROM "public"."screens";


ALTER VIEW "public"."vw_screens_pretty" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_specs_unmapped_staging" AS
 WITH "explode" AS (
         SELECT "r"."code",
            "public"."norm_specialty_term"(TRIM(BOTH ' ."'::"text" FROM "x"."x")) AS "term_norm",
            TRIM(BOTH ' ."'::"text" FROM "x"."x") AS "term_raw"
           FROM "public"."stg_venue_specs_raw" "r",
            LATERAL "regexp_split_to_table"("regexp_replace"("r"."raw", '\s+[eE]\s+|,'::"text", ';'::"text", 'g'::"text"), '[;,/]'::"text") "x"("x")
        ), "clean" AS (
         SELECT "explode"."code",
            "explode"."term_raw",
            "explode"."term_norm"
           FROM "explode"
          WHERE (NULLIF("explode"."term_norm", ''::"text") IS NOT NULL)
        ), "try_map" AS (
         SELECT "c"."code",
            "c"."term_raw",
            "c"."term_norm",
            "m"."specialty_id"
           FROM ("clean" "c"
             LEFT JOIN "public"."specialty_term_map" "m" ON (("m"."term_norm" = "c"."term_norm")))
        )
 SELECT "code",
    "term_raw",
    "term_norm"
   FROM "try_map" "t"
  WHERE ("specialty_id" IS NULL)
  GROUP BY "code", "term_raw", "term_norm"
  ORDER BY "code", "term_norm";


ALTER VIEW "public"."vw_specs_unmapped_staging" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vw_venues_with_screens" AS
 WITH "scr" AS (
         SELECT "s_1"."id",
            "s_1"."code",
            "s_1"."name",
            "s_1"."display_name",
            "s_1"."city",
            COALESCE(("s_1"."state_uf")::"text", "s_1"."state") AS "state",
            "s_1"."active",
            "s_1"."class",
            "s_1"."lat",
            "s_1"."lng",
            "s_1"."venue_id",
            "s_1"."venue_type_parent",
            "s_1"."venue_type_child",
            "s_1"."venue_type_grandchildren"
           FROM "public"."screens" "s_1"
        )
 SELECT ("v"."id")::"text" AS "id",
    "v"."name",
    "min"("s"."venue_type_parent") AS "venue_type_parent",
    "min"("s"."venue_type_child") AS "venue_type_child",
    "min"("s"."city") FILTER (WHERE ("s"."city" IS NOT NULL)) AS "city",
    COALESCE(("v"."state_uf")::"text", "min"("s"."state") FILTER (WHERE ("s"."state" IS NOT NULL))) AS "state",
    "jsonb_agg"("jsonb_build_object"('id', "s"."id", 'code', "s"."code", 'name', "s"."name", 'display_name', "s"."display_name", 'class', "s"."class", 'active', "s"."active", 'lat', "s"."lat", 'lng', "s"."lng") ORDER BY "s"."display_name", "s"."code") AS "screens",
    "count"(*) AS "screenCount",
    "count"(*) FILTER (WHERE "s"."active") AS "activeScreens",
    "bool_or"((("s"."lat" IS NOT NULL) AND ("s"."lng" IS NOT NULL))) AS "coordinates"
   FROM ("public"."venues" "v"
     JOIN "scr" "s" ON (("s"."venue_id" = "v"."id")))
  GROUP BY "v"."id", "v"."name", "v"."state_uf"
  ORDER BY "v"."name";


ALTER VIEW "public"."vw_venues_with_screens" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audience_estimates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audience_estimates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_constraints_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_constraints_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_orphans_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_orphans_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."campaign_screens" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."campaign_screens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."campaigns" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."campaigns_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."classes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."classes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."email_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."email_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."holidays" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."holidays_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."price_rules" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."price_rules_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."proposal_screens" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."proposal_screens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."proposals" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."proposals_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."screen_availability" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."screen_availability_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."screen_bookings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."screen_bookings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."screen_rates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."screen_rates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."screens" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."screens_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stg_billboard_data" ALTER COLUMN "raw_id" SET DEFAULT "nextval"('"public"."stg_billboard_data_raw_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stg_ponto" ALTER COLUMN "raw_id" SET DEFAULT "nextval"('"public"."stg_ponto_raw_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."venue_audience_monthly" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."venue_audience_monthly_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."venues" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."venues_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."acoes_especiais"
    ADD CONSTRAINT "acoes_especiais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencia_contatos"
    ADD CONSTRAINT "agencia_contatos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencia_deals"
    ADD CONSTRAINT "agencia_deals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencia_projeto_equipe"
    ADD CONSTRAINT "agencia_projeto_equipe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencia_projeto_equipe"
    ADD CONSTRAINT "agencia_projeto_equipe_projeto_id_usuario_id_key" UNIQUE ("projeto_id", "pessoa_id");



ALTER TABLE ONLY "public"."agencia_projeto_marcos"
    ADD CONSTRAINT "agencia_projeto_marcos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencia_projetos"
    ADD CONSTRAINT "agencia_projetos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agencias"
    ADD CONSTRAINT "agencias_cnpj_key" UNIQUE ("cnpj");



ALTER TABLE ONLY "public"."agencias"
    ADD CONSTRAINT "agencias_codigo_agencia_key" UNIQUE ("codigo_agencia");



ALTER TABLE ONLY "public"."agencias"
    ADD CONSTRAINT "agencias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audience_estimates"
    ADD CONSTRAINT "audience_estimates_city_norm_specialty_key" UNIQUE ("city_norm", "specialty");



ALTER TABLE ONLY "public"."audience_estimates"
    ADD CONSTRAINT "audience_estimates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_constraints_log"
    ADD CONSTRAINT "audit_constraints_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_orphans_log"
    ADD CONSTRAINT "audit_orphans_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."br_states_fullname"
    ADD CONSTRAINT "br_states_fullname_pkey" PRIMARY KEY ("name");



ALTER TABLE ONLY "public"."br_states"
    ADD CONSTRAINT "br_states_pkey" PRIMARY KEY ("uf");



ALTER TABLE ONLY "public"."campaign_screens"
    ADD CONSTRAINT "campaign_screens_campaign_id_screen_id_key" UNIQUE ("campaign_id", "screen_id");



ALTER TABLE ONLY "public"."campaign_screens"
    ADD CONSTRAINT "campaign_screens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cep_geocode"
    ADD CONSTRAINT "cep_geocode_pkey" PRIMARY KEY ("cep_int");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screen_availability"
    ADD CONSTRAINT "excl_screen_availability_overlap" EXCLUDE USING "gist" ("screen_id" WITH =, "available_period" WITH &&);



ALTER TABLE ONLY "public"."screen_bookings"
    ADD CONSTRAINT "excl_screen_bookings_overlap" EXCLUDE USING "gist" ("screen_id" WITH =, "booked_period" WITH &&);



ALTER TABLE ONLY "public"."screen_rates"
    ADD CONSTRAINT "excl_screen_rates_overlap" EXCLUDE USING "gist" ("screen_id" WITH =, "rate_period" WITH &&);



ALTER TABLE ONLY "public"."grupos_cpm"
    ADD CONSTRAINT "grupos_cpm_nome_grupo_key" UNIQUE ("nome_grupo");



ALTER TABLE ONLY "public"."grupos_cpm"
    ADD CONSTRAINT "grupos_cpm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."networks"
    ADD CONSTRAINT "networks_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."networks"
    ADD CONSTRAINT "networks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pessoas_projeto"
    ADD CONSTRAINT "pessoas_projeto_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."pessoas_projeto"
    ADD CONSTRAINT "pessoas_projeto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposal_screens"
    ADD CONSTRAINT "proposal_screens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposal_screens"
    ADD CONSTRAINT "proposal_screens_proposal_screen_unique" UNIQUE ("proposal_id", "screen_id");



ALTER TABLE ONLY "public"."proposal_snapshots"
    ADD CONSTRAINT "proposal_snapshots_pkey" PRIMARY KEY ("proposal_id");



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposta_servicos_especiais"
    ADD CONSTRAINT "proposta_servicos_especiais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screen_availability"
    ADD CONSTRAINT "screen_availability_no_overlap" EXCLUDE USING "gist" ("screen_id" WITH =, "daterange"("available_from", "available_to", '[]'::"text") WITH &&);



ALTER TABLE ONLY "public"."screen_availability"
    ADD CONSTRAINT "screen_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screen_bookings"
    ADD CONSTRAINT "screen_bookings_no_overlap" EXCLUDE USING "gist" ("screen_id" WITH =, "daterange"("booked_from", "booked_to", '[]'::"text") WITH &&);



ALTER TABLE ONLY "public"."screen_bookings"
    ADD CONSTRAINT "screen_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screen_classes"
    ADD CONSTRAINT "screen_classes_pkey" PRIMARY KEY ("screen_id", "class_id");



ALTER TABLE ONLY "public"."screen_rates"
    ADD CONSTRAINT "screen_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."screens"
    ADD CONSTRAINT "screens_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."screens"
    ADD CONSTRAINT "screens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."servicos_especiais"
    ADD CONSTRAINT "servicos_especiais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialties"
    ADD CONSTRAINT "specialties_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."specialties"
    ADD CONSTRAINT "specialties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialty_term_map"
    ADD CONSTRAINT "specialty_term_map_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialty_term_map"
    ADD CONSTRAINT "specialty_term_map_term_norm_key" UNIQUE ("term_norm");



ALTER TABLE ONLY "public"."stg_billboard_data"
    ADD CONSTRAINT "stg_billboard_data_pkey" PRIMARY KEY ("raw_id");



ALTER TABLE ONLY "public"."stg_ponto"
    ADD CONSTRAINT "stg_ponto_pkey" PRIMARY KEY ("raw_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "unique_user_role" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles_secure"
    ADD CONSTRAINT "user_profiles_secure_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles_secure"
    ADD CONSTRAINT "user_profiles_secure_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."venue_audience_monthly"
    ADD CONSTRAINT "venue_audience_monthly_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."venue_audience_monthly"
    ADD CONSTRAINT "venue_audience_monthly_venue_id_month_key" UNIQUE ("venue_id", "month");



ALTER TABLE ONLY "public"."venue_specialties"
    ADD CONSTRAINT "venue_specialties_pkey" PRIMARY KEY ("venue_id", "specialty_id");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_code_uk" UNIQUE ("code");



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "venues_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_acoes_especiais_servico_id" ON "public"."acoes_especiais" USING "btree" ("servico_id");



CREATE INDEX "idx_agencia_projeto_equipe_projeto" ON "public"."agencia_projeto_equipe" USING "btree" ("projeto_id");



CREATE INDEX "idx_agencia_projeto_marcos_projeto" ON "public"."agencia_projeto_marcos" USING "btree" ("projeto_id");



CREATE INDEX "idx_campaign_screens_campaign_id" ON "public"."campaign_screens" USING "btree" ("campaign_id");



CREATE INDEX "idx_campaign_screens_screen_id" ON "public"."campaign_screens" USING "btree" ("screen_id");



CREATE INDEX "idx_campaigns_created_by" ON "public"."campaigns" USING "btree" ("created_by");



CREATE INDEX "idx_campaigns_dates" ON "public"."campaigns" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("status");



CREATE INDEX "idx_email_logs_created_at" ON "public"."email_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_logs_email_type" ON "public"."email_logs" USING "btree" ("email_type");



CREATE INDEX "idx_email_logs_proposal_id" ON "public"."email_logs" USING "btree" ("proposal_id");



CREATE INDEX "idx_email_logs_status" ON "public"."email_logs" USING "btree" ("status");



CREATE INDEX "idx_grupos_cpm_ativo" ON "public"."grupos_cpm" USING "btree" ("ativo");



CREATE INDEX "idx_holidays_day" ON "public"."holidays" USING "btree" ("day");



COMMENT ON INDEX "public"."idx_holidays_day" IS 'Índice para otimizar consultas de feriados por data na função business_days_between';



CREATE INDEX "idx_pessoas_projeto_agencia_id" ON "public"."pessoas_projeto" USING "btree" ("agencia_id");



CREATE INDEX "idx_pessoas_projeto_email" ON "public"."pessoas_projeto" USING "btree" ("email");



CREATE INDEX "idx_price_rules_city_norm" ON "public"."price_rules" USING "btree" ("city_norm");



CREATE INDEX "idx_profiles_super_admin" ON "public"."profiles" USING "btree" ("super_admin") WHERE ("super_admin" = true);



CREATE INDEX "idx_proposal_screens_proposal" ON "public"."proposal_screens" USING "btree" ("proposal_id");



CREATE INDEX "idx_proposal_screens_proposal_id" ON "public"."proposal_screens" USING "btree" ("proposal_id");



CREATE INDEX "idx_proposal_screens_screen" ON "public"."proposal_screens" USING "btree" ("screen_id");



CREATE INDEX "idx_proposal_screens_screen_id" ON "public"."proposal_screens" USING "btree" ("screen_id");



CREATE INDEX "idx_proposals_created_by" ON "public"."proposals" USING "btree" ("created_by");



CREATE INDEX "idx_proposals_period" ON "public"."proposals" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_proposals_status" ON "public"."proposals" USING "btree" ("status");



CREATE INDEX "idx_proposals_status_updated" ON "public"."proposals" USING "btree" ("status_updated_at" DESC);



CREATE INDEX "idx_proposals_type" ON "public"."proposals" USING "btree" ("proposal_type");



COMMENT ON INDEX "public"."idx_proposals_type" IS 'Índice para otimizar filtros por tipo nas consultas de propostas';



CREATE INDEX "idx_proposals_user_status" ON "public"."proposals" USING "btree" ("created_by", "status");



CREATE INDEX "idx_proposta_servicos_proposta_id" ON "public"."proposta_servicos_especiais" USING "btree" ("proposta_id");



CREATE INDEX "idx_screen_availability_period_gist" ON "public"."screen_availability" USING "gist" ("available_period");



CREATE INDEX "idx_screen_availability_screen_id" ON "public"."screen_availability" USING "btree" ("screen_id");



CREATE INDEX "idx_screen_bookings_period_gist" ON "public"."screen_bookings" USING "gist" ("booked_period");



CREATE INDEX "idx_screen_bookings_screen_id" ON "public"."screen_bookings" USING "btree" ("screen_id");



CREATE INDEX "idx_screen_rates_screen_period" ON "public"."screen_rates" USING "btree" ("screen_id", COALESCE("effective_from", '2000-01-01'::"date"), COALESCE("effective_to", '2999-12-31'::"date"));



CREATE INDEX "idx_screens_active" ON "public"."screens" USING "btree" ("active");



CREATE INDEX "idx_screens_active_geom" ON "public"."screens" USING "gist" ("geom_geog") WHERE "active";



CREATE INDEX "idx_screens_active_true" ON "public"."screens" USING "btree" ("active") WHERE ("active" IS TRUE);



CREATE INDEX "idx_screens_address_norm_trgm" ON "public"."screens" USING "gin" ("address_norm" "public"."gin_trgm_ops");



CREATE INDEX "idx_screens_asset_url" ON "public"."screens" USING "btree" ("asset_url");



CREATE INDEX "idx_screens_city_norm" ON "public"."screens" USING "btree" ("city_norm");



CREATE INDEX "idx_screens_class" ON "public"."screens" USING "btree" ("class");



CREATE INDEX "idx_screens_code" ON "public"."screens" USING "btree" ("code");



CREATE INDEX "idx_screens_display_name_trgm" ON "public"."screens" USING "gin" ("display_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_screens_geom" ON "public"."screens" USING "gist" ("geom");



CREATE INDEX "idx_screens_geom_geog_gist" ON "public"."screens" USING "gist" ("geom_geog");



CREATE INDEX "idx_screens_geom_gist" ON "public"."screens" USING "gist" ("geom");



CREATE INDEX "idx_screens_google_place_id" ON "public"."screens" USING "btree" ("google_place_id");



CREATE INDEX "idx_screens_location" ON "public"."screens" USING "gist" ("geom");



CREATE INDEX "idx_screens_name_trgm" ON "public"."screens" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_screens_state_norm" ON "public"."screens" USING "btree" ("state_norm");



CREATE INDEX "idx_screens_tag" ON "public"."screens" USING "btree" ("tag");



CREATE INDEX "idx_screens_venue_id" ON "public"."screens" USING "btree" ("venue_id");



CREATE INDEX "idx_servicos_especiais_ativo" ON "public"."servicos_especiais" USING "btree" ("ativo");



CREATE INDEX "idx_specialty_term_map_norm" ON "public"."specialty_term_map" USING "btree" ("term_norm");



CREATE INDEX "idx_stg_ceps_log_trgm" ON "public"."stg_ceps" USING "gin" ("LOGRADOURO" "public"."gin_trgm_ops");



CREATE INDEX "idx_stg_ceps_uf_cidade" ON "public"."stg_ceps" USING "btree" ("UF", "CIDADE");



CREATE INDEX "idx_stg_ceps_uf_cidade_norm" ON "public"."stg_ceps" USING "btree" ("UF", "cidade_norm");



CREATE INDEX "idx_stg_code_norm" ON "public"."stg_screens_new" USING "btree" ("code_norm");



CREATE INDEX "idx_tmp_ceps_city" ON "public"."tmp_ceps_uf" USING "btree" ("cidade_norm");



CREATE INDEX "idx_tmp_ceps_log_trgm" ON "public"."tmp_ceps_uf" USING "gin" ("logradouro_norm" "public"."gin_trgm_ops");



CREATE INDEX "idx_venue_audience_monthly_venue_id" ON "public"."venue_audience_monthly" USING "btree" ("venue_id");



CREATE INDEX "idx_venue_audience_monthly_venue_month" ON "public"."venue_audience_monthly" USING "btree" ("venue_id", "month");



CREATE INDEX "idx_venue_specialties_spec" ON "public"."venue_specialties" USING "btree" ("specialty_id");



CREATE INDEX "idx_venue_specialties_venue" ON "public"."venue_specialties" USING "btree" ("venue_id");



CREATE INDEX "idx_venues_code" ON "public"."venues" USING "btree" ("code");



CREATE INDEX "idx_venues_geom" ON "public"."venues" USING "gist" ("geom");



CREATE UNIQUE INDEX "idx_venues_google_place_id" ON "public"."venues" USING "btree" ("google_place_id");



CREATE INDEX "idx_venues_location" ON "public"."venues" USING "gist" ("geom");



CREATE INDEX "proposals_created_by_idx" ON "public"."proposals" USING "btree" ("created_by");



CREATE INDEX "proposals_status_idx" ON "public"."proposals" USING "btree" ("status");



CREATE INDEX "screen_availability_range_idx" ON "public"."screen_availability" USING "btree" ("screen_id", "available_from", "available_to");



CREATE INDEX "screen_availability_screen_id_idx" ON "public"."screen_availability" USING "btree" ("screen_id");



CREATE INDEX "screen_bookings_range_idx" ON "public"."screen_bookings" USING "btree" ("screen_id", "booked_from", "booked_to");



CREATE INDEX "screen_bookings_screen_id_idx" ON "public"."screen_bookings" USING "btree" ("screen_id");



CREATE INDEX "screen_rates_screen_id_eff_from_idx" ON "public"."screen_rates" USING "btree" ("screen_id", "effective_from" DESC);



CREATE INDEX "screen_rates_screen_id_idx" ON "public"."screen_rates" USING "btree" ("screen_id");



CREATE INDEX "screens_active_true_idx" ON "public"."screens" USING "btree" ("id") WHERE "active";



CREATE INDEX "screens_city_idx" ON "public"."screens" USING "btree" ("city");



CREATE INDEX "screens_code_norm_idx" ON "public"."screens" USING "btree" ("regexp_replace"("code", '[^A-Za-z0-9]'::"text", ''::"text", 'g'::"text"));



CREATE INDEX "screens_geom_gist" ON "public"."screens" USING "gist" ("geom");



CREATE INDEX "screens_geom_gix" ON "public"."screens" USING "gist" ("geom");



CREATE INDEX "screens_venue_id_idx" ON "public"."screens" USING "btree" ("venue_id");



CREATE INDEX "stg_ceps_cep_int_idx" ON "public"."stg_ceps" USING "btree" ("cep_int");



CREATE INDEX "stg_ceps_city_state_idx" ON "public"."stg_ceps" USING "btree" ("CIDADE", "UF");



CREATE UNIQUE INDEX "ux_holidays_day_scope" ON "public"."holidays" USING "btree" ("day", "scope", "state", "city");



CREATE UNIQUE INDEX "ux_holidays_unique_entry" ON "public"."holidays" USING "btree" ("day", "scope", COALESCE("state", ''::"text"), COALESCE("city", ''::"text"));



CREATE INDEX "venues_geom_gist" ON "public"."venues" USING "gist" ("geom");



CREATE OR REPLACE TRIGGER "on_profile_updated_sync_super_admin" AFTER INSERT OR UPDATE OF "super_admin" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."sync_super_admin_to_auth"();



CREATE OR REPLACE TRIGGER "prevent_profile_role_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_escalation"();



CREATE OR REPLACE TRIGGER "proposal_screens_recalc" AFTER INSERT OR DELETE OR UPDATE OF "custom_cpm", "hours_on_override", "daily_traffic_override" ON "public"."proposal_screens" FOR EACH ROW EXECUTE FUNCTION "public"."trg_proposal_screens_recalc"();



CREATE OR REPLACE TRIGGER "proposals_recalc" AFTER INSERT OR UPDATE OF "start_date", "end_date", "insertions_per_hour", "film_seconds", "impact_formula", "cpm_mode", "cpm_value", "discount_pct", "discount_fixed" ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."trg_proposals_recalc"();



CREATE OR REPLACE TRIGGER "set_agencia_projeto_marcos_created_by_trigger" BEFORE INSERT OR UPDATE ON "public"."agencia_projeto_marcos" FOR EACH ROW EXECUTE FUNCTION "public"."set_agencia_projeto_marcos_created_by"();



CREATE OR REPLACE TRIGGER "set_proposals_created_by" BEFORE INSERT ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by"();



CREATE OR REPLACE TRIGGER "trg_availability_created_by" BEFORE INSERT ON "public"."screen_availability" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_created_by"();



CREATE OR REPLACE TRIGGER "trg_bookings_created_by" BEFORE INSERT ON "public"."screen_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_created_by"();



CREATE OR REPLACE TRIGGER "trg_br_states_set_updated_at" BEFORE UPDATE ON "public"."br_states" FOR EACH ROW EXECUTE FUNCTION "public"."fn_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_gen_codigo_agencia" BEFORE INSERT ON "public"."agencias" FOR EACH ROW EXECUTE FUNCTION "public"."gen_codigo_agencia"();



CREATE OR REPLACE TRIGGER "trg_proposals_created_by" BEFORE INSERT ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_created_by"();



CREATE OR REPLACE TRIGGER "trg_screens_norm_blank" BEFORE INSERT OR UPDATE ON "public"."screens" FOR EACH ROW EXECUTE FUNCTION "public"."norm_blank_to_null"();



CREATE OR REPLACE TRIGGER "trg_screens_norm_specialty" BEFORE INSERT OR UPDATE ON "public"."screens" FOR EACH ROW EXECUTE FUNCTION "public"."trg_norm_specialty_array"();



CREATE OR REPLACE TRIGGER "trg_screens_norm_sync" BEFORE UPDATE ON "public"."screens" FOR EACH ROW EXECUTE FUNCTION "public"."screens_norm_sync"();



CREATE OR REPLACE TRIGGER "trg_screens_set_geom" BEFORE INSERT OR UPDATE OF "lat", "lng" ON "public"."screens" FOR EACH ROW EXECUTE FUNCTION "public"."set_geom_from_lat_lng"();



CREATE OR REPLACE TRIGGER "trg_set_geom_from_lat_lng" BEFORE INSERT OR UPDATE OF "lat", "lng" ON "public"."screens" FOR EACH ROW EXECUTE FUNCTION "public"."set_geom_from_lat_lng"();



CREATE OR REPLACE TRIGGER "trg_set_geom_venues" BEFORE INSERT OR UPDATE OF "lat", "lng" ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."set_geom_from_lat_lng_venues"();



CREATE OR REPLACE TRIGGER "trg_stg_specs_norm" BEFORE INSERT OR UPDATE ON "public"."stg_venue_specialties_pairs" FOR EACH ROW EXECUTE FUNCTION "public"."trg_norm_staging_spec"();



CREATE OR REPLACE TRIGGER "trg_update_geom_on_screens" BEFORE INSERT OR UPDATE OF "lat", "lng" ON "public"."screens" FOR EACH ROW EXECUTE FUNCTION "public"."update_geom_from_latlng"();



CREATE OR REPLACE TRIGGER "trg_update_geom_on_venues" BEFORE INSERT OR UPDATE OF "lat", "lng" ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."update_geom_from_latlng"();



CREATE OR REPLACE TRIGGER "trg_venues_set_geom" BEFORE INSERT OR UPDATE OF "lat", "lng" ON "public"."venues" FOR EACH ROW EXECUTE FUNCTION "public"."set_geom_from_lat_lng"();



CREATE OR REPLACE TRIGGER "trigger_proposal_email_notifications" AFTER INSERT OR UPDATE OF "status" ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_proposal_email_notifications"();



CREATE OR REPLACE TRIGGER "trigger_set_email_log_fields" BEFORE INSERT ON "public"."email_logs" FOR EACH ROW EXECUTE FUNCTION "public"."set_email_log_fields"();



CREATE OR REPLACE TRIGGER "update_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_pessoas_projeto_updated_at" BEFORE UPDATE ON "public"."pessoas_projeto" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_proposal_status_timestamp" BEFORE UPDATE ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."update_proposal_status_timestamp"();



CREATE OR REPLACE TRIGGER "update_proposals_updated_at" BEFORE UPDATE ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."acoes_especiais"
    ADD CONSTRAINT "acoes_especiais_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."acoes_especiais"
    ADD CONSTRAINT "acoes_especiais_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos_especiais"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agencia_contatos"
    ADD CONSTRAINT "agencia_contatos_agencia_id_fkey" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agencia_deals"
    ADD CONSTRAINT "agencia_deals_agencia_id_fkey" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agencia_projeto_equipe"
    ADD CONSTRAINT "agencia_projeto_equipe_pessoa_id_fkey" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas_projeto"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agencia_projeto_marcos"
    ADD CONSTRAINT "agencia_projeto_marcos_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."agencia_projeto_marcos"
    ADD CONSTRAINT "agencia_projeto_marcos_projeto_id_fkey" FOREIGN KEY ("projeto_id") REFERENCES "public"."agencia_projetos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agencia_projeto_marcos"
    ADD CONSTRAINT "agencia_projeto_marcos_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."agencia_projetos"
    ADD CONSTRAINT "agencia_projetos_agencia_id_fkey" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agencia_projetos"
    ADD CONSTRAINT "agencia_projetos_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."agencia_deals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agencia_projetos"
    ADD CONSTRAINT "agencia_projetos_responsavel_projeto_fkey" FOREIGN KEY ("responsavel_projeto") REFERENCES "public"."pessoas_projeto"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."campaign_screens"
    ADD CONSTRAINT "campaign_screens_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_screens"
    ADD CONSTRAINT "campaign_screens_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_specialties"
    ADD CONSTRAINT "fk_specialty" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_specialties"
    ADD CONSTRAINT "fk_venue" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venues"
    ADD CONSTRAINT "fk_venues_network_id" FOREIGN KEY ("network_id") REFERENCES "public"."networks"("id");



ALTER TABLE ONLY "public"."grupos_cpm"
    ADD CONSTRAINT "grupos_cpm_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pessoas_projeto"
    ADD CONSTRAINT "pessoas_projeto_agencia_id_fkey" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id");



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."price_rules"
    ADD CONSTRAINT "price_rules_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposal_screens"
    ADD CONSTRAINT "proposal_screens_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposal_screens"
    ADD CONSTRAINT "proposal_screens_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposal_snapshots"
    ADD CONSTRAINT "proposal_snapshots_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_agencia_id_fkey" FOREIGN KEY ("agencia_id") REFERENCES "public"."agencias"("id");



ALTER TABLE ONLY "public"."proposta_servicos_especiais"
    ADD CONSTRAINT "proposta_servicos_especiais_acao_id_fkey" FOREIGN KEY ("acao_id") REFERENCES "public"."acoes_especiais"("id");



ALTER TABLE ONLY "public"."proposta_servicos_especiais"
    ADD CONSTRAINT "proposta_servicos_especiais_proposta_id_fkey" FOREIGN KEY ("proposta_id") REFERENCES "public"."proposals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposta_servicos_especiais"
    ADD CONSTRAINT "proposta_servicos_especiais_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos_especiais"("id");



ALTER TABLE ONLY "public"."screen_availability"
    ADD CONSTRAINT "screen_availability_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_bookings"
    ADD CONSTRAINT "screen_bookings_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_classes"
    ADD CONSTRAINT "screen_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_classes"
    ADD CONSTRAINT "screen_classes_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screen_rates"
    ADD CONSTRAINT "screen_rates_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."screens"
    ADD CONSTRAINT "screens_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."servicos_especiais"
    ADD CONSTRAINT "servicos_especiais_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."specialty_term_map"
    ADD CONSTRAINT "specialty_term_map_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "public"."specialties"("id");



ALTER TABLE ONLY "public"."stg_billboard_data"
    ADD CONSTRAINT "stg_billboard_data_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stg_ponto"
    ADD CONSTRAINT "stg_ponto_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stg_ponto"
    ADD CONSTRAINT "stg_ponto_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id");



ALTER TABLE ONLY "public"."user_profiles_secure"
    ADD CONSTRAINT "user_profiles_secure_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."venue_audience_monthly"
    ADD CONSTRAINT "venue_audience_monthly_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."venue_audience_monthly"
    ADD CONSTRAINT "venue_audience_monthly_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can modify screens" ON "public"."screens" USING ("public"."is_admin"());



CREATE POLICY "Admins can modify venues" ON "public"."venues" USING ("public"."is_admin"());



CREATE POLICY "Admins can update all profiles" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'super_admin'::"public"."app_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'super_admin'::"public"."app_role"]))))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."app_role", 'super_admin'::"public"."app_role"]))))));



CREATE POLICY "Allow authenticated users to read project milestones" ON "public"."agencia_projeto_marcos" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to read projects" ON "public"."agencia_projetos" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow individual user to read their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow individual user to update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow profile creation for authenticated users" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("auth"."uid"() = "id")));



CREATE POLICY "Apenas administradores podem gerenciar pessoas do projeto." ON "public"."pessoas_projeto" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Authenticated users can read screens" ON "public"."screens" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can read venues" ON "public"."venues" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can view profiles" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Only admins can add team members." ON "public"."agencia_projeto_equipe" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Only admins can delete team members." ON "public"."agencia_projeto_equipe" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Only admins can update team members." ON "public"."agencia_projeto_equipe" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Permite atualização para usuários autenticados" ON "public"."agencia_contatos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Permite exclusão para usuários autenticados" ON "public"."agencia_contatos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Permite inserção para usuários autenticados" ON "public"."agencia_contatos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Permitir leitura" ON "public"."agencia_projeto_marcos" FOR SELECT USING (true);



CREATE POLICY "Pessoas do projeto são visíveis para usuários autenticados." ON "public"."pessoas_projeto" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public can read audience estimates" ON "public"."audience_estimates" FOR SELECT TO "anon", "authenticated" USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "System functions can insert profiles" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "Team members are viewable by authenticated users." ON "public"."agencia_projeto_equipe" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."acoes_especiais" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agencia_contatos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agencia_contatos_all" ON "public"."agencia_contatos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "agencia_contatos_allow_all" ON "public"."agencia_contatos" TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."agencia_deals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agencia_deals_delete_admin" ON "public"."agencia_deals" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "agencia_deals_insert_admin" ON "public"."agencia_deals" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "agencia_deals_select_all" ON "public"."agencia_deals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "agencia_deals_update_admin" ON "public"."agencia_deals" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."agencia_projeto_equipe" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agencia_projeto_marcos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agencia_projeto_marcos_delete_authenticated" ON "public"."agencia_projeto_marcos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "agencia_projeto_marcos_insert_authenticated" ON "public"."agencia_projeto_marcos" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "agencia_projeto_marcos_select_all_authenticated" ON "public"."agencia_projeto_marcos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "agencia_projeto_marcos_update_authenticated" ON "public"."agencia_projeto_marcos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."agencia_projetos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agencia_projetos_delete_admin" ON "public"."agencia_projetos" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "agencia_projetos_insert_admin" ON "public"."agencia_projetos" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "agencia_projetos_select_all" ON "public"."agencia_projetos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "agencia_projetos_update_admin" ON "public"."agencia_projetos" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."agencias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agencias_all" ON "public"."agencias" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "agencias_allow_all" ON "public"."agencias" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "agencias_delete_admin" ON "public"."agencias" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());



CREATE POLICY "agencias_insert_auth" ON "public"."agencias" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "agencias_select_auth" ON "public"."agencias" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "agencias_update_admin" ON "public"."agencias" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



ALTER TABLE "public"."audience_estimates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_constraints_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_orphans_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_screens_deleted" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_screens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_logs_delete_policy" ON "public"."email_logs" FOR DELETE USING ((("auth"."uid"() IS NOT NULL) AND "public"."is_super_admin"()));



CREATE POLICY "email_logs_insert_authenticated" ON "public"."email_logs" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "email_logs_insert_authenticated" ON "public"."email_logs" IS 'Permite que usuários autenticados insiram logs de email';



CREATE POLICY "email_logs_insert_policy" ON "public"."email_logs" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) OR ("current_setting"('role'::"text") = 'service_role'::"text")));



CREATE POLICY "email_logs_read_policy" ON "public"."email_logs" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("public"."is_super_admin"() OR ("created_by" = "auth"."uid"()))));



CREATE POLICY "email_logs_select_all_authenticated" ON "public"."email_logs" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "email_logs_select_all_authenticated" ON "public"."email_logs" IS 'Permite que usuários autenticados vejam todos os logs de email';



CREATE POLICY "email_logs_update_authenticated" ON "public"."email_logs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



COMMENT ON POLICY "email_logs_update_authenticated" ON "public"."email_logs" IS 'Permite que usuários autenticados atualizem logs de email';



CREATE POLICY "email_logs_update_policy" ON "public"."email_logs" FOR UPDATE USING ((("auth"."uid"() IS NOT NULL) AND ("public"."is_super_admin"() OR ("created_by" = "auth"."uid"()) OR ("current_setting"('role'::"text") = 'service_role'::"text")))) WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("public"."is_super_admin"() OR ("created_by" = "auth"."uid"()) OR ("current_setting"('role'::"text") = 'service_role'::"text"))));



ALTER TABLE "public"."grupos_cpm" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."holidays" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "holidays_admin_delete" ON "public"."holidays" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "holidays_admin_insert" ON "public"."holidays" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "holidays_admin_update" ON "public"."holidays" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "insert_proposals_authenticated" ON "public"."proposals" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."pessoas_projeto" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proposal_screens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "proposal_screens_delete_proposal_owner" ON "public"."proposal_screens" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."proposals" "p"
  WHERE (("p"."id" = "proposal_screens"."proposal_id") AND ("public"."is_admin"() OR ("p"."created_by" = "auth"."uid"()) OR ("p"."created_by" IS NULL))))));



CREATE POLICY "proposal_screens_insert_proposal_owner" ON "public"."proposal_screens" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."proposals" "p"
  WHERE (("p"."id" = "proposal_screens"."proposal_id") AND ("public"."is_admin"() OR ("p"."created_by" = "auth"."uid"()) OR ("p"."created_by" IS NULL))))));



CREATE POLICY "proposal_screens_select_proposal_owner" ON "public"."proposal_screens" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."proposals" "p"
  WHERE (("p"."id" = "proposal_screens"."proposal_id") AND ("public"."is_admin"() OR ("p"."created_by" = "auth"."uid"()) OR ("p"."created_by" IS NULL))))));



COMMENT ON POLICY "proposal_screens_select_proposal_owner" ON "public"."proposal_screens" IS 'Permite acesso às telas de proposta baseado nas permissões da proposta pai.';



CREATE POLICY "proposal_screens_update_proposal_owner" ON "public"."proposal_screens" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."proposals" "p"
  WHERE (("p"."id" = "proposal_screens"."proposal_id") AND ("public"."is_admin"() OR ("p"."created_by" = "auth"."uid"()) OR ("p"."created_by" IS NULL)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."proposals" "p"
  WHERE (("p"."id" = "proposal_screens"."proposal_id") AND ("public"."is_admin"() OR ("p"."created_by" = "auth"."uid"()) OR ("p"."created_by" IS NULL))))));



ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "proposals_delete_admin" ON "public"."proposals" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());



CREATE POLICY "proposals_insert_auth" ON "public"."proposals" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "proposals_insert_authenticated" ON "public"."proposals" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IS NOT NULL));



COMMENT ON POLICY "proposals_insert_authenticated" ON "public"."proposals" IS 'Permite que usuários autenticados criem propostas. O created_by é definido automaticamente.';



CREATE POLICY "proposals_select_auth" ON "public"."proposals" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "proposals_select_owner_or_admin" ON "public"."proposals" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("created_by" = "auth"."uid"()) OR ("created_by" IS NULL)));



COMMENT ON POLICY "proposals_select_owner_or_admin" ON "public"."proposals" IS 'Permite que donos vejam suas propostas e admins vejam tudo. Propostas legacy (sem dono) são visíveis para todos.';



CREATE POLICY "proposals_update_owner_or_admin" ON "public"."proposals" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_super_admin"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_super_admin"()));



ALTER TABLE "public"."proposta_servicos_especiais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_screen_rates_auth" ON "public"."screen_rates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_screens_auth" ON "public"."screens" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_specialties_auth" ON "public"."specialties" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_venue_specialties_auth" ON "public"."venue_specialties" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_venues_auth" ON "public"."venues" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."screen_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."screen_bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."screen_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."screens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "screens_select_active" ON "public"."screens" FOR SELECT TO "authenticated" USING (("active" IS TRUE));



CREATE POLICY "screens_select_auth" ON "public"."screens" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "sel_holidays_authenticated" ON "public"."holidays" FOR SELECT TO "authenticated" USING (true);



COMMENT ON POLICY "sel_holidays_authenticated" ON "public"."holidays" IS 'Permite que qualquer usuário autenticado leia a tabela holidays (feriados são dados públicos)';



CREATE POLICY "select_proposals_owner_or_admin" ON "public"."proposals" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."servicos_especiais" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stg_billboard_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stg_ponto" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_proposals_owner_or_admin" ON "public"."proposals" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."user_profiles_secure" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venue_audience_monthly" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "venue_audience_monthly_admin_write" ON "public"."venue_audience_monthly" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "venue_audience_monthly_read" ON "public"."venue_audience_monthly" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."venue_specialties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."venues" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "app_admin";
GRANT USAGE ON SCHEMA "public" TO "app_super_admin";



GRANT ALL ON FUNCTION "public"."box2d_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."box2d_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."box2d_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box2d_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."box2d_out"("public"."box2d") TO "postgres";
GRANT ALL ON FUNCTION "public"."box2d_out"("public"."box2d") TO "anon";
GRANT ALL ON FUNCTION "public"."box2d_out"("public"."box2d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box2d_out"("public"."box2d") TO "service_role";



GRANT ALL ON FUNCTION "public"."box2df_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."box2df_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."box2df_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box2df_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."box2df_out"("public"."box2df") TO "postgres";
GRANT ALL ON FUNCTION "public"."box2df_out"("public"."box2df") TO "anon";
GRANT ALL ON FUNCTION "public"."box2df_out"("public"."box2df") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box2df_out"("public"."box2df") TO "service_role";



GRANT ALL ON FUNCTION "public"."box3d_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."box3d_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."box3d_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box3d_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."box3d_out"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."box3d_out"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."box3d_out"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box3d_out"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_analyze"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_analyze"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_analyze"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_analyze"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geography_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_out"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_out"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_out"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_out"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geography_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_send"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_send"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_send"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_send"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."geography_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_typmod_out"(integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_typmod_out"(integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geography_typmod_out"(integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_typmod_out"(integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_analyze"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_analyze"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_analyze"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_analyze"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_out"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_out"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_out"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_out"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_recv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_recv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_recv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_recv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_send"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_send"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_send"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_send"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_typmod_out"(integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_typmod_out"(integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_typmod_out"(integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_typmod_out"(integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gidx_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gidx_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gidx_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gidx_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gidx_out"("public"."gidx") TO "postgres";
GRANT ALL ON FUNCTION "public"."gidx_out"("public"."gidx") TO "anon";
GRANT ALL ON FUNCTION "public"."gidx_out"("public"."gidx") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gidx_out"("public"."gidx") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "public"."spheroid_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."spheroid_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."spheroid_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."spheroid_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."spheroid_out"("public"."spheroid") TO "postgres";
GRANT ALL ON FUNCTION "public"."spheroid_out"("public"."spheroid") TO "anon";
GRANT ALL ON FUNCTION "public"."spheroid_out"("public"."spheroid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."spheroid_out"("public"."spheroid") TO "service_role";



GRANT ALL ON FUNCTION "public"."box3d"("public"."box2d") TO "postgres";
GRANT ALL ON FUNCTION "public"."box3d"("public"."box2d") TO "anon";
GRANT ALL ON FUNCTION "public"."box3d"("public"."box2d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box3d"("public"."box2d") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("public"."box2d") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("public"."box2d") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("public"."box2d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("public"."box2d") TO "service_role";



GRANT ALL ON FUNCTION "public"."box"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."box"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."box"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."box2d"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."box2d"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."box2d"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box2d"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."geography"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography"("public"."geography", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."geography"("public"."geography", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."geography"("public"."geography", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography"("public"."geography", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."box"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."box"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."box"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."box2d"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."box2d"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."box2d"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box2d"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."box3d"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."box3d"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."box3d"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box3d"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geography"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("public"."geometry", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("public"."geometry", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("public"."geometry", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("public"."geometry", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."json"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."json"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."json"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."json"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."jsonb"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."jsonb"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."jsonb"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."jsonb"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."path"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."path"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."path"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."path"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."point"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."point"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."point"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."point"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."polygon"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."polygon"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."polygon"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."polygon"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."text"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."text"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."text"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("path") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("path") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("path") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("path") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("point") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("point") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("point") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("point") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("polygon") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("polygon") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("polygon") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("polygon") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry"("text") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."_postgis_deprecate"("oldname" "text", "newname" "text", "version" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."_postgis_deprecate"("oldname" "text", "newname" "text", "version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_postgis_deprecate"("oldname" "text", "newname" "text", "version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_postgis_deprecate"("oldname" "text", "newname" "text", "version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_postgis_index_extent"("tbl" "regclass", "col" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."_postgis_index_extent"("tbl" "regclass", "col" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_postgis_index_extent"("tbl" "regclass", "col" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_postgis_index_extent"("tbl" "regclass", "col" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_postgis_join_selectivity"("regclass", "text", "regclass", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."_postgis_join_selectivity"("regclass", "text", "regclass", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_postgis_join_selectivity"("regclass", "text", "regclass", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_postgis_join_selectivity"("regclass", "text", "regclass", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_postgis_pgsql_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."_postgis_pgsql_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."_postgis_pgsql_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_postgis_pgsql_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_postgis_scripts_pgsql_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."_postgis_scripts_pgsql_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."_postgis_scripts_pgsql_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."_postgis_scripts_pgsql_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."_postgis_selectivity"("tbl" "regclass", "att_name" "text", "geom" "public"."geometry", "mode" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."_postgis_selectivity"("tbl" "regclass", "att_name" "text", "geom" "public"."geometry", "mode" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_postgis_selectivity"("tbl" "regclass", "att_name" "text", "geom" "public"."geometry", "mode" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_postgis_selectivity"("tbl" "regclass", "att_name" "text", "geom" "public"."geometry", "mode" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_postgis_stats"("tbl" "regclass", "att_name" "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."_postgis_stats"("tbl" "regclass", "att_name" "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_postgis_stats"("tbl" "regclass", "att_name" "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_postgis_stats"("tbl" "regclass", "att_name" "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_asgml"(integer, "public"."geometry", integer, integer, "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_asgml"(integer, "public"."geometry", integer, integer, "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_asgml"(integer, "public"."geometry", integer, integer, "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_asgml"(integer, "public"."geometry", integer, integer, "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_asx3d"(integer, "public"."geometry", integer, integer, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_asx3d"(integer, "public"."geometry", integer, integer, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_asx3d"(integer, "public"."geometry", integer, integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_asx3d"(integer, "public"."geometry", integer, integer, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_bestsrid"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography", double precision, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography", double precision, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography", double precision, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_distancetree"("public"."geography", "public"."geography", double precision, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", double precision, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", double precision, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", double precision, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_distanceuncached"("public"."geography", "public"."geography", double precision, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_dwithinuncached"("public"."geography", "public"."geography", double precision, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_expand"("public"."geography", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_expand"("public"."geography", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_expand"("public"."geography", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_expand"("public"."geography", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_geomfromgml"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_geomfromgml"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_geomfromgml"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_geomfromgml"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_pointoutside"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_pointoutside"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_pointoutside"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_pointoutside"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_sortablehash"("geom" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_sortablehash"("geom" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_sortablehash"("geom" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_sortablehash"("geom" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_voronoi"("g1" "public"."geometry", "clip" "public"."geometry", "tolerance" double precision, "return_polygons" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_voronoi"("g1" "public"."geometry", "clip" "public"."geometry", "tolerance" double precision, "return_polygons" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."_st_voronoi"("g1" "public"."geometry", "clip" "public"."geometry", "tolerance" double precision, "return_polygons" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_voronoi"("g1" "public"."geometry", "clip" "public"."geometry", "tolerance" double precision, "return_polygons" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."_st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."_st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."_st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."_st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."_strip_state_noise"("src" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."accounts_admin_list"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accounts_admin_list"() TO "service_role";



GRANT ALL ON FUNCTION "public"."add_screen_as_admin"("screen_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."addauth"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."addauth"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."addauth"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."addauth"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."addgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer, "new_type" character varying, "new_dim" integer, "use_typmod" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_distinct_nonempty"("a" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."box3dtobox"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."box3dtobox"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."box3dtobox"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."box3dtobox"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."business_days_between"("p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."checkauth"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."checkauth"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."checkauth"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."checkauth"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."checkauth"("text", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."checkauth"("text", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."checkauth"("text", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."checkauth"("text", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."checkauthtrigger"() TO "postgres";
GRANT ALL ON FUNCTION "public"."checkauthtrigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."checkauthtrigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."checkauthtrigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_text_array"("arr" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."box2df") TO "postgres";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."box2df") TO "anon";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."box2df") TO "authenticated";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."box2df") TO "service_role";



GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."box2df", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."contains_2d"("public"."geometry", "public"."box2df") TO "postgres";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."geometry", "public"."box2df") TO "anon";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."geometry", "public"."box2df") TO "authenticated";
GRANT ALL ON FUNCTION "public"."contains_2d"("public"."geometry", "public"."box2df") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_email_log"("p_proposal_id" bigint, "p_email_type" character varying, "p_recipient_email" character varying, "p_recipient_type" character varying, "p_subject" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_project"("p_nome_projeto" "text", "p_agencia_id" "uuid", "p_deal_id" "uuid", "p_status_projeto" "text", "p_orcamento_projeto" numeric, "p_valor_gasto" numeric, "p_data_inicio" "date", "p_data_fim" "date", "p_cliente_final" "text", "p_responsavel_projeto" "uuid", "p_prioridade" "text", "p_progresso" integer, "p_descricao" "text", "p_briefing" "text", "p_objetivos" "text"[], "p_tags" "text"[], "p_arquivos_anexos" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_project"("p_nome_projeto" "text", "p_agencia_id" "uuid", "p_deal_id" "uuid", "p_status_projeto" "text", "p_orcamento_projeto" numeric, "p_valor_gasto" numeric, "p_data_inicio" "date", "p_data_fim" "date", "p_cliente_final" "text", "p_responsavel_projeto" "uuid", "p_prioridade" "text", "p_progresso" integer, "p_descricao" "text", "p_briefing" "text", "p_objetivos" "text"[], "p_tags" "text"[], "p_arquivos_anexos" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_screen_as_admin"("screen_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_screen_as_admin"("screen_id" bigint) TO "authenticated";



GRANT ALL ON FUNCTION "public"."disablelongtransactions"() TO "postgres";
GRANT ALL ON FUNCTION "public"."disablelongtransactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."disablelongtransactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."disablelongtransactions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("table_name" character varying, "column_name" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("table_name" character varying, "column_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("table_name" character varying, "column_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("table_name" character varying, "column_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dropgeometrycolumn"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."dropgeometrytable"("table_name" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("table_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("table_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("table_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."dropgeometrytable"("schema_name" character varying, "table_name" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("schema_name" character varying, "table_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("schema_name" character varying, "table_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("schema_name" character varying, "table_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."dropgeometrytable"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dropgeometrytable"("catalog_name" character varying, "schema_name" character varying, "table_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."enablelongtransactions"() TO "postgres";
GRANT ALL ON FUNCTION "public"."enablelongtransactions"() TO "anon";
GRANT ALL ON FUNCTION "public"."enablelongtransactions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enablelongtransactions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_created_by"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_profile"() TO "service_role";
GRANT ALL ON FUNCTION "public"."ensure_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_profile"() TO "anon";



GRANT ALL ON FUNCTION "public"."equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_nearby_screens"("lat_in" double precision, "lng_in" double precision, "radius_meters_in" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_screens_count_v1"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."find_screens_count_v1"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."find_screens_count_v1"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "public"."class_band", "lat_in" double precision, "lng_in" double precision, "radius_km_in" numeric, "only_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."find_screens_v2"("city_in" "text", "class_in" "public"."class_band", "lat_in" double precision, "lng_in" double precision, "radius_km_in" numeric, "only_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."find_screens_v2"("in_city" "text", "in_class" "public"."class_band", "in_center_lat" double precision, "in_center_lng" double precision, "in_radius_km" double precision, "in_start_date" "date", "in_end_date" "date", "in_specialty_any" "text"[], "in_exclude_ids" bigint[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."find_screens_v2"("in_city" "text", "in_class" "public"."class_band", "in_center_lat" double precision, "in_center_lng" double precision, "in_radius_km" double precision, "in_start_date" "date", "in_end_date" "date", "in_specialty_any" "text"[], "in_exclude_ids" bigint[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_screens_v3"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."find_screens_v3"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."find_screens_v3"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."find_screens_v4"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean, "sort_by_distance" boolean, "limit_in" integer, "offset_in" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."find_screens_v4"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean, "sort_by_distance" boolean, "limit_in" integer, "offset_in" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_screens_v4"("city_in" "text", "class_in" "text", "lat_in" double precision, "lng_in" double precision, "radius_km_in" double precision, "only_active" boolean, "sort_by_distance" boolean, "limit_in" integer, "offset_in" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."find_srid"(character varying, character varying, character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."find_srid"(character varying, character varying, character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."find_srid"(character varying, character varying, character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_srid"(character varying, character varying, character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."fn_sync_user_email_to_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fn_sync_user_email_to_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gen_codigo_agencia"() TO "service_role";



GRANT ALL ON FUNCTION "public"."geog_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geog_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geog_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geog_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_cmp"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_cmp"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_cmp"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_cmp"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_distance_knn"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_distance_knn"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_distance_knn"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_distance_knn"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_eq"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_eq"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_eq"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_eq"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_ge"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_ge"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_ge"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_ge"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_consistent"("internal", "public"."geography", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_consistent"("internal", "public"."geography", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_consistent"("internal", "public"."geography", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_consistent"("internal", "public"."geography", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_distance"("internal", "public"."geography", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_distance"("internal", "public"."geography", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_distance"("internal", "public"."geography", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_distance"("internal", "public"."geography", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_same"("public"."box2d", "public"."box2d", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_same"("public"."box2d", "public"."box2d", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_same"("public"."box2d", "public"."box2d", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_same"("public"."box2d", "public"."box2d", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gist_union"("bytea", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gist_union"("bytea", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gist_union"("bytea", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gist_union"("bytea", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_gt"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_gt"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_gt"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_gt"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_le"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_le"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_le"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_le"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_lt"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_lt"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_lt"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_lt"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_overlaps"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_overlaps"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_overlaps"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_overlaps"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_spgist_choose_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_spgist_choose_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_spgist_choose_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_spgist_choose_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_spgist_compress_nd"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_spgist_compress_nd"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_spgist_compress_nd"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_spgist_compress_nd"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_spgist_config_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_spgist_config_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_spgist_config_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_spgist_config_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_spgist_inner_consistent_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_spgist_inner_consistent_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_spgist_inner_consistent_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_spgist_inner_consistent_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_spgist_leaf_consistent_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_spgist_leaf_consistent_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_spgist_leaf_consistent_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_spgist_leaf_consistent_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geography_spgist_picksplit_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geography_spgist_picksplit_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geography_spgist_picksplit_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geography_spgist_picksplit_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geom2d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geom2d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geom2d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geom2d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geom3d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geom3d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geom3d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geom3d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geom4d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geom4d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geom4d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geom4d_brin_inclusion_add_value"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_above"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_above"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_above"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_above"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_below"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_below"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_below"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_below"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_cmp"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_cmp"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_cmp"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_cmp"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_contained_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_contained_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_contained_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_contained_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_contains_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_contains_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_contains_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_contains_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_contains_nd"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_contains_nd"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_contains_nd"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_contains_nd"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_distance_box"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_distance_box"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_distance_box"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_distance_box"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_distance_centroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_distance_centroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_distance_centroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_distance_centroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_distance_centroid_nd"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_distance_centroid_nd"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_distance_centroid_nd"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_distance_centroid_nd"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_distance_cpa"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_distance_cpa"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_distance_cpa"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_distance_cpa"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_eq"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_eq"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_eq"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_eq"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_ge"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_ge"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_ge"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_ge"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_compress_2d"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_compress_2d"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_compress_2d"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_compress_2d"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_compress_nd"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_compress_nd"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_compress_nd"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_compress_nd"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_2d"("internal", "public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_2d"("internal", "public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_2d"("internal", "public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_2d"("internal", "public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_nd"("internal", "public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_nd"("internal", "public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_nd"("internal", "public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_consistent_nd"("internal", "public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_2d"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_2d"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_2d"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_2d"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_nd"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_nd"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_nd"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_decompress_nd"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_distance_2d"("internal", "public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_distance_2d"("internal", "public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_distance_2d"("internal", "public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_distance_2d"("internal", "public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_distance_nd"("internal", "public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_distance_nd"("internal", "public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_distance_nd"("internal", "public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_distance_nd"("internal", "public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_2d"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_2d"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_2d"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_2d"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_nd"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_nd"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_nd"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_penalty_nd"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_2d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_2d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_2d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_2d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_picksplit_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_same_2d"("geom1" "public"."geometry", "geom2" "public"."geometry", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_same_2d"("geom1" "public"."geometry", "geom2" "public"."geometry", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_same_2d"("geom1" "public"."geometry", "geom2" "public"."geometry", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_same_2d"("geom1" "public"."geometry", "geom2" "public"."geometry", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_same_nd"("public"."geometry", "public"."geometry", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_same_nd"("public"."geometry", "public"."geometry", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_same_nd"("public"."geometry", "public"."geometry", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_same_nd"("public"."geometry", "public"."geometry", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_sortsupport_2d"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_sortsupport_2d"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_sortsupport_2d"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_sortsupport_2d"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_union_2d"("bytea", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_union_2d"("bytea", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_union_2d"("bytea", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_union_2d"("bytea", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gist_union_nd"("bytea", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gist_union_nd"("bytea", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gist_union_nd"("bytea", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gist_union_nd"("bytea", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_gt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_gt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_gt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_gt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_hash"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_hash"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_hash"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_hash"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_le"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_le"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_le"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_le"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_left"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_left"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_left"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_left"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_lt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_lt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_lt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_lt"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_overabove"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_overabove"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_overabove"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_overabove"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_overbelow"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_overbelow"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_overbelow"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_overbelow"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_overlaps_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_overlaps_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_overlaps_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_overlaps_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_overlaps_nd"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_overlaps_nd"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_overlaps_nd"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_overlaps_nd"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_overleft"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_overleft"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_overleft"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_overleft"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_overright"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_overright"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_overright"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_overright"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_right"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_right"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_right"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_right"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_same"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_same"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_same"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_same"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_same_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_same_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_same_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_same_3d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_same_nd"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_same_nd"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_same_nd"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_same_nd"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_sortsupport"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_sortsupport"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_sortsupport"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_sortsupport"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_2d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_2d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_2d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_2d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_3d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_3d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_3d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_3d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_choose_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_2d"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_2d"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_2d"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_2d"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_3d"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_3d"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_3d"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_3d"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_nd"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_nd"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_nd"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_compress_nd"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_config_2d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_2d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_2d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_2d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_config_3d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_3d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_3d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_3d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_config_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_config_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_2d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_2d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_2d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_2d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_3d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_3d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_3d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_3d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_inner_consistent_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_2d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_2d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_2d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_2d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_3d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_3d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_3d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_3d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_leaf_consistent_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_2d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_2d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_2d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_2d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_3d"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_3d"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_3d"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_3d"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_nd"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_nd"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_nd"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_spgist_picksplit_nd"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometry_within_nd"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometry_within_nd"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometry_within_nd"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometry_within_nd"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geometrytype"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."geomfromewkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."geomfromewkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."geomfromewkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geomfromewkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."geomfromewkt"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."geomfromewkt"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."geomfromewkt"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."geomfromewkt"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_cities"("p_start_date" "date", "p_end_date" "date") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_available_cities"("p_start_date" "date", "p_end_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";



GRANT ALL ON FUNCTION "public"."get_equipe_stats"("projeto_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_equipe_stats"("projeto_uuid" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_heatmap_data"("p_start_date" "date", "p_end_date" "date", "p_city" "text", "p_normalize" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."get_heatmap_data"("p_start_date" "date", "p_end_date" "date", "p_city" "text", "p_normalize" boolean) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_heatmap_stats"("p_start_date" "date", "p_end_date" "date", "p_city" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_heatmap_stats"("p_start_date" "date", "p_end_date" "date", "p_city" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_emails"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_proj4_from_srid"(integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."get_proj4_from_srid"(integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_proj4_from_srid"(integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_proj4_from_srid"(integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_proposal_details"("p_proposal_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_proposal_stats"("p_proposal_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_screens_by_grupo_cpm"("grupo_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_screens_by_grupo_cpm"("grupo_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("_user_id" "uuid") TO "anon";



REVOKE ALL ON FUNCTION "public"."get_venue_details"("venue_id_in" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_venue_details"("venue_id_in" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."gettransactionid"() TO "postgres";
GRANT ALL ON FUNCTION "public"."gettransactionid"() TO "anon";
GRANT ALL ON FUNCTION "public"."gettransactionid"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."gettransactionid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_2d"("internal", "oid", "internal", smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_2d"("internal", "oid", "internal", smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_2d"("internal", "oid", "internal", smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_2d"("internal", "oid", "internal", smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_nd"("internal", "oid", "internal", smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_nd"("internal", "oid", "internal", smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_nd"("internal", "oid", "internal", smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gserialized_gist_joinsel_nd"("internal", "oid", "internal", smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_2d"("internal", "oid", "internal", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_2d"("internal", "oid", "internal", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_2d"("internal", "oid", "internal", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_2d"("internal", "oid", "internal", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_nd"("internal", "oid", "internal", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_nd"("internal", "oid", "internal", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_nd"("internal", "oid", "internal", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gserialized_gist_sel_nd"("internal", "oid", "internal", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."import_from_staging"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."import_from_staging"() TO "service_role";



GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."box2df") TO "postgres";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."box2df") TO "anon";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."box2df") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."box2df") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."box2df", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."geometry", "public"."box2df") TO "postgres";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."geometry", "public"."box2df") TO "anon";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."geometry", "public"."box2df") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_contained_2d"("public"."geometry", "public"."box2df") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_manager_or_above"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_manager_or_above"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_screen_free"("in_screen_id" bigint, "in_from" "date", "in_to" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_screen_free"("in_screen_id" bigint, "in_from" "date", "in_to" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_super_admin"("uid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_super_admin"("uid" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."jwt_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."jwt_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."jwt_role"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_venue_summaries"("search" "text", "limit_count" integer, "offset_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_venue_summaries"("search" "text", "limit_count" integer, "offset_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text", timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text", timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text", timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lockrow"("text", "text", "text", "text", timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."longtransactionsenabled"() TO "postgres";
GRANT ALL ON FUNCTION "public"."longtransactionsenabled"() TO "anon";
GRANT ALL ON FUNCTION "public"."longtransactionsenabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."longtransactionsenabled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."make_proposal_snapshot"("p_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_account"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."my_identities"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_identities"() TO "service_role";



GRANT ALL ON FUNCTION "public"."norm_blank_to_null"() TO "service_role";



GRANT ALL ON FUNCTION "public"."norm_specialty_term"("p" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."norm_text_imm"("t" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."norm_text_imm"("t" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."norm_text_imm"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."norm_text_imm"("t" "text") TO "anon";



REVOKE ALL ON FUNCTION "public"."norm_txt"("t" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."norm_txt"("t" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."norm_txt"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."norm_txt"("t" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."norm_uf_br"("src" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."norm_uf_br_smart"("src" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_medical_specialties"("specialty_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."box2df") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."box2df") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."box2df") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."box2df") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."box2df", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."geometry", "public"."box2df") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."geometry", "public"."box2df") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."geometry", "public"."box2df") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_2d"("public"."geometry", "public"."box2df") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."geography", "public"."gidx") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."geography", "public"."gidx") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."geography", "public"."gidx") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."geography", "public"."gidx") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."gidx") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."gidx") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."gidx") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_geog"("public"."gidx", "public"."gidx") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."geometry", "public"."gidx") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."geometry", "public"."gidx") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."geometry", "public"."gidx") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."geometry", "public"."gidx") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."gidx") TO "postgres";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."gidx") TO "anon";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."gidx") TO "authenticated";
GRANT ALL ON FUNCTION "public"."overlaps_nd"("public"."gidx", "public"."gidx") TO "service_role";



GRANT ALL ON FUNCTION "public"."period_label"("p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asflatgeobuf_transfn"("internal", "anyelement", boolean, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asgeobuf_transfn"("internal", "anyelement", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_combinefn"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_combinefn"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_combinefn"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_combinefn"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_deserialfn"("bytea", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_deserialfn"("bytea", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_deserialfn"("bytea", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_deserialfn"("bytea", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_serialfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_serialfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_serialfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_serialfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_asmvt_transfn"("internal", "anyelement", "text", integer, "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_accum_transfn"("internal", "public"."geometry", double precision, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterintersecting_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterintersecting_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterintersecting_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterintersecting_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterwithin_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterwithin_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterwithin_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_clusterwithin_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_collect_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_collect_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_collect_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_collect_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_makeline_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_makeline_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_makeline_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_makeline_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_polygonize_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_polygonize_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_polygonize_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_polygonize_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_combinefn"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_combinefn"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_combinefn"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_combinefn"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_deserialfn"("bytea", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_deserialfn"("bytea", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_deserialfn"("bytea", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_deserialfn"("bytea", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_finalfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_finalfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_finalfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_finalfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_serialfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_serialfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_serialfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_serialfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."pgis_geometry_union_parallel_transfn"("internal", "public"."geometry", double precision) TO "service_role";



GRANT ALL ON TABLE "public"."price_rules" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."price_rules" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."price_rules" TO "app_super_admin";
GRANT ALL ON TABLE "public"."price_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."price_rules" TO "anon";



REVOKE ALL ON FUNCTION "public"."pick_price_rule"("city_in" "text", "class_in" "public"."class_band") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."pick_price_rule"("city_in" "text", "class_in" "public"."class_band") TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_email_logs_missing_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("use_typmod" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("use_typmod" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("use_typmod" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("use_typmod" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("tbl_oid" "oid", "use_typmod" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("tbl_oid" "oid", "use_typmod" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("tbl_oid" "oid", "use_typmod" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."populate_geometry_columns"("tbl_oid" "oid", "use_typmod" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_addbbox"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_addbbox"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_addbbox"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_addbbox"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_cache_bbox"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_cache_bbox"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_cache_bbox"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_cache_bbox"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_constraint_dims"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_constraint_dims"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_constraint_dims"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_constraint_dims"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_constraint_srid"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_constraint_srid"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_constraint_srid"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_constraint_srid"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_constraint_type"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_constraint_type"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_constraint_type"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_constraint_type"("geomschema" "text", "geomtable" "text", "geomcolumn" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_dropbbox"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_dropbbox"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_dropbbox"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_dropbbox"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_extensions_upgrade"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_extensions_upgrade"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_extensions_upgrade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_extensions_upgrade"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_full_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_full_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_full_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_full_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_geos_noop"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_geos_noop"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_geos_noop"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_geos_noop"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_geos_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_geos_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_geos_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_geos_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_getbbox"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_getbbox"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_getbbox"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_getbbox"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_hasbbox"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_hasbbox"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_hasbbox"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_hasbbox"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_index_supportfn"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_index_supportfn"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_index_supportfn"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_index_supportfn"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_lib_build_date"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_lib_build_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_lib_build_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_lib_build_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_lib_revision"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_lib_revision"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_lib_revision"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_lib_revision"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_lib_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_lib_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_lib_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_lib_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_libjson_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_libjson_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_libjson_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_libjson_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_liblwgeom_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_liblwgeom_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_liblwgeom_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_liblwgeom_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_libprotobuf_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_libprotobuf_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_libprotobuf_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_libprotobuf_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_libxml_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_libxml_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_libxml_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_libxml_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_noop"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_noop"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_noop"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_noop"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_proj_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_proj_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_proj_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_proj_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_scripts_build_date"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_scripts_build_date"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_scripts_build_date"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_scripts_build_date"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_scripts_installed"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_scripts_installed"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_scripts_installed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_scripts_installed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_scripts_released"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_scripts_released"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_scripts_released"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_scripts_released"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_svn_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_svn_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_svn_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_svn_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_transform_geometry"("geom" "public"."geometry", "text", "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_transform_geometry"("geom" "public"."geometry", "text", "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_transform_geometry"("geom" "public"."geometry", "text", "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_transform_geometry"("geom" "public"."geometry", "text", "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_type_name"("geomname" character varying, "coord_dimension" integer, "use_new_name" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_type_name"("geomname" character varying, "coord_dimension" integer, "use_new_name" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_type_name"("geomname" character varying, "coord_dimension" integer, "use_new_name" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_type_name"("geomname" character varying, "coord_dimension" integer, "use_new_name" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_typmod_dims"(integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_typmod_dims"(integer) TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_typmod_dims"(integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_typmod_dims"(integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_typmod_srid"(integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_typmod_srid"(integer) TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_typmod_srid"(integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_typmod_srid"(integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_typmod_type"(integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_typmod_type"(integer) TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_typmod_type"(integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_typmod_type"(integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."postgis_wagyu_version"() TO "postgres";
GRANT ALL ON FUNCTION "public"."postgis_wagyu_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."postgis_wagyu_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."postgis_wagyu_version"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."prevent_role_escalation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prevent_role_escalation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."promote_to_super_admin"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."promote_to_super_admin"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."proposal_summary"("p_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."proposal_summary"("p_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."proposal_summary"("p_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."quote_price_detailed"("city_in" "text", "class_in" "public"."class_band", "qty_in" integer, "months_in" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."quote_price_detailed"("city_in" "text", "class_in" "public"."class_band", "qty_in" integer, "months_in" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_proposal_kpis"("p_proposal_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_effective_cpm"("p_proposal_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."screens_norm_sync"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_accounts_admin"("search" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_accounts_admin"("search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_agencia_projeto_marcos_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_email_log_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_geom_from_lat_lng"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_geom_from_lat_lng"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_geom_from_lat_lng_venues"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_geom_from_lat_lng_venues"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dclosestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dclosestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dclosestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dclosestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3ddfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3ddistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3ddistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3ddistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3ddistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3ddwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dintersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dlength"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dlength"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dlength"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dlength"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dlineinterpolatepoint"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dlineinterpolatepoint"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dlineinterpolatepoint"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dlineinterpolatepoint"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dlongestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dlongestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dlongestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dlongestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dmakebox"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dmakebox"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dmakebox"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dmakebox"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dmaxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dmaxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dmaxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dmaxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dperimeter"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dperimeter"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dperimeter"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dperimeter"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_3dshortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dshortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dshortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dshortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_addmeasure"("public"."geometry", double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_addmeasure"("public"."geometry", double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_addmeasure"("public"."geometry", double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_addmeasure"("public"."geometry", double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_addpoint"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_affine"("public"."geometry", double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_angle"("line1" "public"."geometry", "line2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_angle"("line1" "public"."geometry", "line2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_angle"("line1" "public"."geometry", "line2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_angle"("line1" "public"."geometry", "line2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_angle"("pt1" "public"."geometry", "pt2" "public"."geometry", "pt3" "public"."geometry", "pt4" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_angle"("pt1" "public"."geometry", "pt2" "public"."geometry", "pt3" "public"."geometry", "pt4" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_angle"("pt1" "public"."geometry", "pt2" "public"."geometry", "pt3" "public"."geometry", "pt4" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_angle"("pt1" "public"."geometry", "pt2" "public"."geometry", "pt3" "public"."geometry", "pt4" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_area"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_area"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_area"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_area"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_area"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_area"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_area"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_area"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_area"("geog" "public"."geography", "use_spheroid" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_area"("geog" "public"."geography", "use_spheroid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_area"("geog" "public"."geography", "use_spheroid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_area"("geog" "public"."geography", "use_spheroid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_area2d"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_area2d"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_area2d"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_area2d"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geography", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asbinary"("public"."geometry", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asencodedpolyline"("geom" "public"."geometry", "nprecision" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asencodedpolyline"("geom" "public"."geometry", "nprecision" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asencodedpolyline"("geom" "public"."geometry", "nprecision" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asencodedpolyline"("geom" "public"."geometry", "nprecision" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asewkb"("public"."geometry", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asewkt"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asewkt"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asewkt"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asewkt"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geography", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asewkt"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgeojson"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgeojson"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgeojson"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgeojson"("r" "record", "geom_column" "text", "maxdecimaldigits" integer, "pretty_bool" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("r" "record", "geom_column" "text", "maxdecimaldigits" integer, "pretty_bool" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("r" "record", "geom_column" "text", "maxdecimaldigits" integer, "pretty_bool" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgeojson"("r" "record", "geom_column" "text", "maxdecimaldigits" integer, "pretty_bool" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgml"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgml"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgml"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgml"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgml"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgml"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgml"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgml"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgml"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgml"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgml"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgml"("geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geog" "public"."geography", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgml"("version" integer, "geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer, "nprefix" "text", "id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_ashexewkb"("public"."geometry", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_askml"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_askml"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_askml"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_askml"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_askml"("geog" "public"."geography", "maxdecimaldigits" integer, "nprefix" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_askml"("geog" "public"."geography", "maxdecimaldigits" integer, "nprefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_askml"("geog" "public"."geography", "maxdecimaldigits" integer, "nprefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_askml"("geog" "public"."geography", "maxdecimaldigits" integer, "nprefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_askml"("geom" "public"."geometry", "maxdecimaldigits" integer, "nprefix" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_askml"("geom" "public"."geometry", "maxdecimaldigits" integer, "nprefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_askml"("geom" "public"."geometry", "maxdecimaldigits" integer, "nprefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_askml"("geom" "public"."geometry", "maxdecimaldigits" integer, "nprefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_aslatlontext"("geom" "public"."geometry", "tmpl" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_aslatlontext"("geom" "public"."geometry", "tmpl" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_aslatlontext"("geom" "public"."geometry", "tmpl" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_aslatlontext"("geom" "public"."geometry", "tmpl" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asmarc21"("geom" "public"."geometry", "format" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asmarc21"("geom" "public"."geometry", "format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asmarc21"("geom" "public"."geometry", "format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asmarc21"("geom" "public"."geometry", "format" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asmvtgeom"("geom" "public"."geometry", "bounds" "public"."box2d", "extent" integer, "buffer" integer, "clip_geom" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asmvtgeom"("geom" "public"."geometry", "bounds" "public"."box2d", "extent" integer, "buffer" integer, "clip_geom" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asmvtgeom"("geom" "public"."geometry", "bounds" "public"."box2d", "extent" integer, "buffer" integer, "clip_geom" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asmvtgeom"("geom" "public"."geometry", "bounds" "public"."box2d", "extent" integer, "buffer" integer, "clip_geom" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_assvg"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_assvg"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_assvg"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_assvg"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_assvg"("geog" "public"."geography", "rel" integer, "maxdecimaldigits" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_assvg"("geog" "public"."geography", "rel" integer, "maxdecimaldigits" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_assvg"("geog" "public"."geography", "rel" integer, "maxdecimaldigits" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_assvg"("geog" "public"."geography", "rel" integer, "maxdecimaldigits" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_assvg"("geom" "public"."geometry", "rel" integer, "maxdecimaldigits" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_assvg"("geom" "public"."geometry", "rel" integer, "maxdecimaldigits" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_assvg"("geom" "public"."geometry", "rel" integer, "maxdecimaldigits" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_assvg"("geom" "public"."geometry", "rel" integer, "maxdecimaldigits" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_astext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_astext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_astext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_astext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geography", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_astext"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry", "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry", "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry", "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry", "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry"[], "ids" bigint[], "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry"[], "ids" bigint[], "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry"[], "ids" bigint[], "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_astwkb"("geom" "public"."geometry"[], "ids" bigint[], "prec" integer, "prec_z" integer, "prec_m" integer, "with_sizes" boolean, "with_boxes" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asx3d"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asx3d"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asx3d"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asx3d"("geom" "public"."geometry", "maxdecimaldigits" integer, "options" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_azimuth"("geog1" "public"."geography", "geog2" "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_azimuth"("geog1" "public"."geography", "geog2" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_azimuth"("geog1" "public"."geography", "geog2" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_azimuth"("geog1" "public"."geography", "geog2" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_azimuth"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_azimuth"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_azimuth"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_azimuth"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_bdmpolyfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_bdmpolyfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_bdmpolyfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_bdmpolyfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_bdpolyfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_bdpolyfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_bdpolyfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_bdpolyfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_boundary"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_boundary"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_boundary"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_boundary"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_boundingdiagonal"("geom" "public"."geometry", "fits" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_boundingdiagonal"("geom" "public"."geometry", "fits" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_boundingdiagonal"("geom" "public"."geometry", "fits" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_boundingdiagonal"("geom" "public"."geometry", "fits" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_box2dfromgeohash"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_box2dfromgeohash"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_box2dfromgeohash"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_box2dfromgeohash"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("text", double precision, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("public"."geography", double precision, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "quadsegs" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "quadsegs" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "quadsegs" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "quadsegs" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "options" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "options" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "options" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buffer"("geom" "public"."geometry", "radius" double precision, "options" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_buildarea"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_buildarea"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_buildarea"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_buildarea"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_centroid"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_centroid"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_centroid"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_centroid"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geography", "use_spheroid" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geography", "use_spheroid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geography", "use_spheroid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_centroid"("public"."geography", "use_spheroid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_chaikinsmoothing"("public"."geometry", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_chaikinsmoothing"("public"."geometry", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_chaikinsmoothing"("public"."geometry", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_chaikinsmoothing"("public"."geometry", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_cleangeometry"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_cleangeometry"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_cleangeometry"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_cleangeometry"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_clipbybox2d"("geom" "public"."geometry", "box" "public"."box2d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_clipbybox2d"("geom" "public"."geometry", "box" "public"."box2d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_clipbybox2d"("geom" "public"."geometry", "box" "public"."box2d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_clipbybox2d"("geom" "public"."geometry", "box" "public"."box2d") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_closestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_closestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_closestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_closestpoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_closestpointofapproach"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_closestpointofapproach"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_closestpointofapproach"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_closestpointofapproach"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_clusterdbscan"("public"."geometry", "eps" double precision, "minpoints" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_clusterdbscan"("public"."geometry", "eps" double precision, "minpoints" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_clusterdbscan"("public"."geometry", "eps" double precision, "minpoints" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_clusterdbscan"("public"."geometry", "eps" double precision, "minpoints" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_clusterkmeans"("geom" "public"."geometry", "k" integer, "max_radius" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_clusterkmeans"("geom" "public"."geometry", "k" integer, "max_radius" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_clusterkmeans"("geom" "public"."geometry", "k" integer, "max_radius" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_clusterkmeans"("geom" "public"."geometry", "k" integer, "max_radius" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry"[], double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry"[], double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry"[], double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry"[], double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_collect"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_collect"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_collect"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_collect"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_collectionextract"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_collectionhomogenize"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_collectionhomogenize"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_collectionhomogenize"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_collectionhomogenize"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box2d", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box2d", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box2d", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box2d", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_combinebbox"("public"."box3d", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_concavehull"("param_geom" "public"."geometry", "param_pctconvex" double precision, "param_allow_holes" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_concavehull"("param_geom" "public"."geometry", "param_pctconvex" double precision, "param_allow_holes" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_concavehull"("param_geom" "public"."geometry", "param_pctconvex" double precision, "param_allow_holes" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_concavehull"("param_geom" "public"."geometry", "param_pctconvex" double precision, "param_allow_holes" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_contains"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_containsproperly"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_convexhull"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_convexhull"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_convexhull"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_convexhull"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_coorddim"("geometry" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_coorddim"("geometry" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_coorddim"("geometry" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_coorddim"("geometry" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_coveredby"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_coveredby"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_coveredby"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_coveredby"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_coveredby"("geog1" "public"."geography", "geog2" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_coveredby"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_covers"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_covers"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_covers"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_covers"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_covers"("geog1" "public"."geography", "geog2" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_covers"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_cpawithin"("public"."geometry", "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_cpawithin"("public"."geometry", "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_cpawithin"("public"."geometry", "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_cpawithin"("public"."geometry", "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_crosses"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_curvetoline"("geom" "public"."geometry", "tol" double precision, "toltype" integer, "flags" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_curvetoline"("geom" "public"."geometry", "tol" double precision, "toltype" integer, "flags" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_curvetoline"("geom" "public"."geometry", "tol" double precision, "toltype" integer, "flags" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_curvetoline"("geom" "public"."geometry", "tol" double precision, "toltype" integer, "flags" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_delaunaytriangles"("g1" "public"."geometry", "tolerance" double precision, "flags" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_delaunaytriangles"("g1" "public"."geometry", "tolerance" double precision, "flags" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_delaunaytriangles"("g1" "public"."geometry", "tolerance" double precision, "flags" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_delaunaytriangles"("g1" "public"."geometry", "tolerance" double precision, "flags" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dfullywithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_difference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_difference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_difference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_difference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dimension"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dimension"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_dimension"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dimension"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_disjoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_disjoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_disjoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_disjoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distance"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distance"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_distance"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distance"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_distance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distance"("geog1" "public"."geography", "geog2" "public"."geography", "use_spheroid" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distance"("geog1" "public"."geography", "geog2" "public"."geography", "use_spheroid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_distance"("geog1" "public"."geography", "geog2" "public"."geography", "use_spheroid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distance"("geog1" "public"."geography", "geog2" "public"."geography", "use_spheroid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distancecpa"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distancecpa"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_distancecpa"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distancecpa"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry", "radius" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry", "radius" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry", "radius" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distancesphere"("geom1" "public"."geometry", "geom2" "public"."geometry", "radius" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry", "public"."spheroid") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry", "public"."spheroid") TO "anon";
GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry", "public"."spheroid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_distancespheroid"("geom1" "public"."geometry", "geom2" "public"."geometry", "public"."spheroid") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dump"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dump"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_dump"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dump"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dumppoints"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dumppoints"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_dumppoints"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dumppoints"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dumprings"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dumprings"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_dumprings"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dumprings"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dumpsegments"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dumpsegments"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_dumpsegments"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dumpsegments"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dwithin"("text", "text", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dwithin"("text", "text", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_dwithin"("text", "text", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dwithin"("text", "text", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dwithin"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_dwithin"("geog1" "public"."geography", "geog2" "public"."geography", "tolerance" double precision, "use_spheroid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_endpoint"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_endpoint"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_endpoint"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_endpoint"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_envelope"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_envelope"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_envelope"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_envelope"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_equals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text", boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text", boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text", boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_estimatedextent"("text", "text", "text", boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_expand"("public"."box2d", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."box2d", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."box2d", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."box2d", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_expand"("public"."box3d", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."box3d", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."box3d", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."box3d", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_expand"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_expand"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box2d", "dx" double precision, "dy" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box2d", "dx" double precision, "dy" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box2d", "dx" double precision, "dy" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box2d", "dx" double precision, "dy" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box3d", "dx" double precision, "dy" double precision, "dz" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box3d", "dx" double precision, "dy" double precision, "dz" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box3d", "dx" double precision, "dy" double precision, "dz" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_expand"("box" "public"."box3d", "dx" double precision, "dy" double precision, "dz" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_expand"("geom" "public"."geometry", "dx" double precision, "dy" double precision, "dz" double precision, "dm" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_expand"("geom" "public"."geometry", "dx" double precision, "dy" double precision, "dz" double precision, "dm" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_expand"("geom" "public"."geometry", "dx" double precision, "dy" double precision, "dz" double precision, "dm" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_expand"("geom" "public"."geometry", "dx" double precision, "dy" double precision, "dz" double precision, "dm" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_exteriorring"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_exteriorring"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_exteriorring"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_exteriorring"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_filterbym"("public"."geometry", double precision, double precision, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_filterbym"("public"."geometry", double precision, double precision, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_filterbym"("public"."geometry", double precision, double precision, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_filterbym"("public"."geometry", double precision, double precision, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_findextent"("text", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_flipcoordinates"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_flipcoordinates"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_flipcoordinates"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_flipcoordinates"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_force2d"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_force2d"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_force2d"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_force2d"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_force3d"("geom" "public"."geometry", "zvalue" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_force3d"("geom" "public"."geometry", "zvalue" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_force3d"("geom" "public"."geometry", "zvalue" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_force3d"("geom" "public"."geometry", "zvalue" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_force3dm"("geom" "public"."geometry", "mvalue" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_force3dm"("geom" "public"."geometry", "mvalue" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_force3dm"("geom" "public"."geometry", "mvalue" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_force3dm"("geom" "public"."geometry", "mvalue" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_force3dz"("geom" "public"."geometry", "zvalue" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_force3dz"("geom" "public"."geometry", "zvalue" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_force3dz"("geom" "public"."geometry", "zvalue" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_force3dz"("geom" "public"."geometry", "zvalue" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_force4d"("geom" "public"."geometry", "zvalue" double precision, "mvalue" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_force4d"("geom" "public"."geometry", "zvalue" double precision, "mvalue" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_force4d"("geom" "public"."geometry", "zvalue" double precision, "mvalue" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_force4d"("geom" "public"."geometry", "zvalue" double precision, "mvalue" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_forcecollection"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_forcecollection"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_forcecollection"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_forcecollection"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_forcecurve"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_forcecurve"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_forcecurve"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_forcecurve"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_forcepolygonccw"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_forcepolygonccw"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_forcepolygonccw"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_forcepolygonccw"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_forcepolygoncw"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_forcepolygoncw"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_forcepolygoncw"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_forcepolygoncw"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_forcerhr"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_forcerhr"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_forcerhr"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_forcerhr"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry", "version" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry", "version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry", "version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_forcesfs"("public"."geometry", "version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_frechetdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_frechetdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_frechetdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_frechetdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_fromflatgeobuf"("anyelement", "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_fromflatgeobuf"("anyelement", "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_fromflatgeobuf"("anyelement", "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_fromflatgeobuf"("anyelement", "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_fromflatgeobuftotable"("text", "text", "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_fromflatgeobuftotable"("text", "text", "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_fromflatgeobuftotable"("text", "text", "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_fromflatgeobuftotable"("text", "text", "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer, "seed" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer, "seed" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer, "seed" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_generatepoints"("area" "public"."geometry", "npoints" integer, "seed" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geogfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geogfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geogfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geogfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geogfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geogfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geogfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geogfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geographyfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geographyfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geographyfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geographyfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geohash"("geog" "public"."geography", "maxchars" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geohash"("geog" "public"."geography", "maxchars" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geohash"("geog" "public"."geography", "maxchars" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geohash"("geog" "public"."geography", "maxchars" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geohash"("geom" "public"."geometry", "maxchars" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geohash"("geom" "public"."geometry", "maxchars" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geohash"("geom" "public"."geometry", "maxchars" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geohash"("geom" "public"."geometry", "maxchars" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomcollfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomcollfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geometricmedian"("g" "public"."geometry", "tolerance" double precision, "max_iter" integer, "fail_if_not_converged" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geometricmedian"("g" "public"."geometry", "tolerance" double precision, "max_iter" integer, "fail_if_not_converged" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geometricmedian"("g" "public"."geometry", "tolerance" double precision, "max_iter" integer, "fail_if_not_converged" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geometricmedian"("g" "public"."geometry", "tolerance" double precision, "max_iter" integer, "fail_if_not_converged" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geometryfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geometryn"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geometryn"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geometryn"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geometryn"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geometrytype"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geometrytype"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geometrytype"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geometrytype"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromewkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromewkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromewkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromewkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromewkt"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromewkt"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromewkt"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromewkt"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromgeohash"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromgeohash"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromgeohash"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromgeohash"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"(json) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"(json) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"(json) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"(json) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromgeojson"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromgml"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromkml"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromkml"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromkml"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromkml"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfrommarc21"("marc21xml" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfrommarc21"("marc21xml" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfrommarc21"("marc21xml" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfrommarc21"("marc21xml" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromtwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromtwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromtwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromtwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_geomfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_gmltosql"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_gmltosql"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_gmltosql"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_gmltosql"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_gmltosql"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_gmltosql"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_gmltosql"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_gmltosql"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_hasarc"("geometry" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_hasarc"("geometry" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_hasarc"("geometry" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_hasarc"("geometry" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_hausdorffdistance"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_hexagon"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_hexagon"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_hexagon"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_hexagon"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_hexagongrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_hexagongrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_hexagongrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_hexagongrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_interiorringn"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_interiorringn"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_interiorringn"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_interiorringn"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_interpolatepoint"("line" "public"."geometry", "point" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_interpolatepoint"("line" "public"."geometry", "point" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_interpolatepoint"("line" "public"."geometry", "point" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_interpolatepoint"("line" "public"."geometry", "point" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_intersection"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_intersection"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_intersection"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_intersection"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_intersection"("public"."geography", "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_intersection"("public"."geography", "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_intersection"("public"."geography", "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_intersection"("public"."geography", "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_intersection"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_intersection"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_intersection"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_intersection"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_intersects"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_intersects"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_intersects"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_intersects"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_intersects"("geog1" "public"."geography", "geog2" "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_intersects"("geog1" "public"."geography", "geog2" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_intersects"("geog1" "public"."geography", "geog2" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_intersects"("geog1" "public"."geography", "geog2" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_intersects"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isclosed"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isclosed"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_isclosed"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isclosed"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_iscollection"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_iscollection"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_iscollection"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_iscollection"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isempty"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isempty"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_isempty"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isempty"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_ispolygonccw"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_ispolygonccw"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_ispolygonccw"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_ispolygonccw"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_ispolygoncw"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_ispolygoncw"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_ispolygoncw"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_ispolygoncw"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isring"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isring"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_isring"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isring"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_issimple"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_issimple"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_issimple"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_issimple"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isvalid"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isvaliddetail"("geom" "public"."geometry", "flags" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isvaliddetail"("geom" "public"."geometry", "flags" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_isvaliddetail"("geom" "public"."geometry", "flags" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isvaliddetail"("geom" "public"."geometry", "flags" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isvalidreason"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_isvalidtrajectory"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_isvalidtrajectory"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_isvalidtrajectory"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_isvalidtrajectory"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_length"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_length"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_length"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_length"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_length"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_length"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_length"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_length"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_length"("geog" "public"."geography", "use_spheroid" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_length"("geog" "public"."geography", "use_spheroid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_length"("geog" "public"."geography", "use_spheroid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_length"("geog" "public"."geography", "use_spheroid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_length2d"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_length2d"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_length2d"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_length2d"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_length2dspheroid"("public"."geometry", "public"."spheroid") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_length2dspheroid"("public"."geometry", "public"."spheroid") TO "anon";
GRANT ALL ON FUNCTION "public"."st_length2dspheroid"("public"."geometry", "public"."spheroid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_length2dspheroid"("public"."geometry", "public"."spheroid") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_lengthspheroid"("public"."geometry", "public"."spheroid") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_lengthspheroid"("public"."geometry", "public"."spheroid") TO "anon";
GRANT ALL ON FUNCTION "public"."st_lengthspheroid"("public"."geometry", "public"."spheroid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_lengthspheroid"("public"."geometry", "public"."spheroid") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_letters"("letters" "text", "font" json) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_letters"("letters" "text", "font" json) TO "anon";
GRANT ALL ON FUNCTION "public"."st_letters"("letters" "text", "font" json) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_letters"("letters" "text", "font" json) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linecrossingdirection"("line1" "public"."geometry", "line2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linefromencodedpolyline"("txtin" "text", "nprecision" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linefromencodedpolyline"("txtin" "text", "nprecision" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_linefromencodedpolyline"("txtin" "text", "nprecision" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linefromencodedpolyline"("txtin" "text", "nprecision" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linefrommultipoint"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linefrommultipoint"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linefrommultipoint"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linefrommultipoint"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linefromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linefromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linefromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linefromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linefromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linefromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_linefromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linefromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linefromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoint"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoint"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoint"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoint"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoints"("public"."geometry", double precision, "repeat" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoints"("public"."geometry", double precision, "repeat" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoints"("public"."geometry", double precision, "repeat" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_lineinterpolatepoints"("public"."geometry", double precision, "repeat" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linelocatepoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linelocatepoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linelocatepoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linelocatepoint"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry", boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry", boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry", boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linemerge"("public"."geometry", boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linestringfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linesubstring"("public"."geometry", double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linesubstring"("public"."geometry", double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_linesubstring"("public"."geometry", double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linesubstring"("public"."geometry", double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_linetocurve"("geometry" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_linetocurve"("geometry" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_linetocurve"("geometry" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_linetocurve"("geometry" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_locatealong"("geometry" "public"."geometry", "measure" double precision, "leftrightoffset" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_locatealong"("geometry" "public"."geometry", "measure" double precision, "leftrightoffset" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_locatealong"("geometry" "public"."geometry", "measure" double precision, "leftrightoffset" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_locatealong"("geometry" "public"."geometry", "measure" double precision, "leftrightoffset" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_locatebetween"("geometry" "public"."geometry", "frommeasure" double precision, "tomeasure" double precision, "leftrightoffset" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_locatebetween"("geometry" "public"."geometry", "frommeasure" double precision, "tomeasure" double precision, "leftrightoffset" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_locatebetween"("geometry" "public"."geometry", "frommeasure" double precision, "tomeasure" double precision, "leftrightoffset" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_locatebetween"("geometry" "public"."geometry", "frommeasure" double precision, "tomeasure" double precision, "leftrightoffset" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_locatebetweenelevations"("geometry" "public"."geometry", "fromelevation" double precision, "toelevation" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_locatebetweenelevations"("geometry" "public"."geometry", "fromelevation" double precision, "toelevation" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_locatebetweenelevations"("geometry" "public"."geometry", "fromelevation" double precision, "toelevation" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_locatebetweenelevations"("geometry" "public"."geometry", "fromelevation" double precision, "toelevation" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_longestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_m"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_m"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_m"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_m"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makebox2d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makebox2d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_makebox2d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makebox2d"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makeenvelope"(double precision, double precision, double precision, double precision, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makeenvelope"(double precision, double precision, double precision, double precision, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_makeenvelope"(double precision, double precision, double precision, double precision, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makeenvelope"(double precision, double precision, double precision, double precision, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makeline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makeline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_makeline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makeline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makepoint"(double precision, double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makepointm"(double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makepointm"(double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_makepointm"(double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makepointm"(double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry", "public"."geometry"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry", "public"."geometry"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry", "public"."geometry"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makepolygon"("public"."geometry", "public"."geometry"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makevalid"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makevalid"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_makevalid"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makevalid"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makevalid"("geom" "public"."geometry", "params" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makevalid"("geom" "public"."geometry", "params" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_makevalid"("geom" "public"."geometry", "params" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makevalid"("geom" "public"."geometry", "params" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_maxdistance"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_maximuminscribedcircle"("public"."geometry", OUT "center" "public"."geometry", OUT "nearest" "public"."geometry", OUT "radius" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_maximuminscribedcircle"("public"."geometry", OUT "center" "public"."geometry", OUT "nearest" "public"."geometry", OUT "radius" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_maximuminscribedcircle"("public"."geometry", OUT "center" "public"."geometry", OUT "nearest" "public"."geometry", OUT "radius" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_maximuminscribedcircle"("public"."geometry", OUT "center" "public"."geometry", OUT "nearest" "public"."geometry", OUT "radius" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_memsize"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_memsize"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_memsize"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_memsize"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_minimumboundingcircle"("inputgeom" "public"."geometry", "segs_per_quarter" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_minimumboundingcircle"("inputgeom" "public"."geometry", "segs_per_quarter" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_minimumboundingcircle"("inputgeom" "public"."geometry", "segs_per_quarter" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_minimumboundingcircle"("inputgeom" "public"."geometry", "segs_per_quarter" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_minimumboundingradius"("public"."geometry", OUT "center" "public"."geometry", OUT "radius" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_minimumboundingradius"("public"."geometry", OUT "center" "public"."geometry", OUT "radius" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_minimumboundingradius"("public"."geometry", OUT "center" "public"."geometry", OUT "radius" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_minimumboundingradius"("public"."geometry", OUT "center" "public"."geometry", OUT "radius" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_minimumclearance"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_minimumclearance"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_minimumclearance"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_minimumclearance"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_minimumclearanceline"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_minimumclearanceline"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_minimumclearanceline"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_minimumclearanceline"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mlinefromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mlinefromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpointfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpointfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpolyfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_mpolyfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multi"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multi"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_multi"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multi"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multilinefromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multilinefromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_multilinefromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multilinefromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multilinestringfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multipointfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multipointfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_multipointfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multipointfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multipointfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multipolyfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_multipolygonfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_ndims"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_ndims"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_ndims"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_ndims"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_node"("g" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_node"("g" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_node"("g" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_node"("g" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_normalize"("geom" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_normalize"("geom" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_normalize"("geom" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_normalize"("geom" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_npoints"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_npoints"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_npoints"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_npoints"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_nrings"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_nrings"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_nrings"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_nrings"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_numgeometries"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_numgeometries"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_numgeometries"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_numgeometries"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_numinteriorring"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_numinteriorring"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_numinteriorring"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_numinteriorring"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_numinteriorrings"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_numinteriorrings"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_numinteriorrings"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_numinteriorrings"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_numpatches"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_numpatches"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_numpatches"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_numpatches"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_numpoints"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_numpoints"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_numpoints"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_numpoints"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_offsetcurve"("line" "public"."geometry", "distance" double precision, "params" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_offsetcurve"("line" "public"."geometry", "distance" double precision, "params" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_offsetcurve"("line" "public"."geometry", "distance" double precision, "params" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_offsetcurve"("line" "public"."geometry", "distance" double precision, "params" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_orderingequals"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_orientedenvelope"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_orientedenvelope"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_orientedenvelope"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_orientedenvelope"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_overlaps"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_patchn"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_patchn"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_patchn"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_patchn"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_perimeter"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_perimeter"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_perimeter"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_perimeter"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_perimeter"("geog" "public"."geography", "use_spheroid" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_perimeter"("geog" "public"."geography", "use_spheroid" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_perimeter"("geog" "public"."geography", "use_spheroid" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_perimeter"("geog" "public"."geography", "use_spheroid" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_perimeter2d"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_perimeter2d"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_perimeter2d"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_perimeter2d"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision, "srid" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision, "srid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision, "srid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_point"(double precision, double precision, "srid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointfromgeohash"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointfromgeohash"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointfromgeohash"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointfromgeohash"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointinsidecircle"("public"."geometry", double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointinsidecircle"("public"."geometry", double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointinsidecircle"("public"."geometry", double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointinsidecircle"("public"."geometry", double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointm"("xcoordinate" double precision, "ycoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointm"("xcoordinate" double precision, "ycoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointm"("xcoordinate" double precision, "ycoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointm"("xcoordinate" double precision, "ycoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointn"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointn"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointn"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointn"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointonsurface"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointonsurface"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointonsurface"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointonsurface"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_points"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_points"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_points"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_points"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointz"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "srid" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointz"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "srid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointz"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "srid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointz"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "srid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_pointzm"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_pointzm"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_pointzm"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_pointzm"("xcoordinate" double precision, "ycoordinate" double precision, "zcoordinate" double precision, "mcoordinate" double precision, "srid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polyfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polyfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polygon"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polygon"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_polygon"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polygon"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polygonfromtext"("text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polygonfromwkb"("bytea", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_project"("geog" "public"."geography", "distance" double precision, "azimuth" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_project"("geog" "public"."geography", "distance" double precision, "azimuth" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_project"("geog" "public"."geography", "distance" double precision, "azimuth" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_project"("geog" "public"."geography", "distance" double precision, "azimuth" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_quantizecoordinates"("g" "public"."geometry", "prec_x" integer, "prec_y" integer, "prec_z" integer, "prec_m" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_quantizecoordinates"("g" "public"."geometry", "prec_x" integer, "prec_y" integer, "prec_z" integer, "prec_m" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_quantizecoordinates"("g" "public"."geometry", "prec_x" integer, "prec_y" integer, "prec_z" integer, "prec_m" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_quantizecoordinates"("g" "public"."geometry", "prec_x" integer, "prec_y" integer, "prec_z" integer, "prec_m" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_reduceprecision"("geom" "public"."geometry", "gridsize" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_reduceprecision"("geom" "public"."geometry", "gridsize" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_reduceprecision"("geom" "public"."geometry", "gridsize" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_reduceprecision"("geom" "public"."geometry", "gridsize" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_relate"("geom1" "public"."geometry", "geom2" "public"."geometry", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_relatematch"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_relatematch"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_relatematch"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_relatematch"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_removepoint"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_removepoint"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_removepoint"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_removepoint"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_removerepeatedpoints"("geom" "public"."geometry", "tolerance" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_removerepeatedpoints"("geom" "public"."geometry", "tolerance" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_removerepeatedpoints"("geom" "public"."geometry", "tolerance" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_removerepeatedpoints"("geom" "public"."geometry", "tolerance" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_reverse"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_reverse"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_reverse"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_reverse"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_rotate"("public"."geometry", double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_rotatex"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_rotatex"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_rotatex"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_rotatex"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_rotatey"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_rotatey"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_rotatey"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_rotatey"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_rotatez"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_rotatez"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_rotatez"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_rotatez"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry", "origin" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry", "origin" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry", "origin" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", "public"."geometry", "origin" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_scale"("public"."geometry", double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_scroll"("public"."geometry", "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_scroll"("public"."geometry", "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_scroll"("public"."geometry", "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_scroll"("public"."geometry", "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_segmentize"("geog" "public"."geography", "max_segment_length" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_segmentize"("geog" "public"."geography", "max_segment_length" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_segmentize"("geog" "public"."geography", "max_segment_length" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_segmentize"("geog" "public"."geography", "max_segment_length" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_segmentize"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_segmentize"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_segmentize"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_segmentize"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_seteffectivearea"("public"."geometry", double precision, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_seteffectivearea"("public"."geometry", double precision, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_seteffectivearea"("public"."geometry", double precision, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_seteffectivearea"("public"."geometry", double precision, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_setpoint"("public"."geometry", integer, "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_setpoint"("public"."geometry", integer, "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_setpoint"("public"."geometry", integer, "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_setpoint"("public"."geometry", integer, "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_setsrid"("geog" "public"."geography", "srid" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_setsrid"("geog" "public"."geography", "srid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_setsrid"("geog" "public"."geography", "srid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_setsrid"("geog" "public"."geography", "srid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_setsrid"("geom" "public"."geometry", "srid" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_setsrid"("geom" "public"."geometry", "srid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_setsrid"("geom" "public"."geometry", "srid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_setsrid"("geom" "public"."geometry", "srid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_sharedpaths"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_sharedpaths"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_sharedpaths"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_sharedpaths"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_shiftlongitude"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_shiftlongitude"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_shiftlongitude"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_shiftlongitude"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_shortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_shortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_shortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_shortestline"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_simplify"("public"."geometry", double precision, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_simplifypolygonhull"("geom" "public"."geometry", "vertex_fraction" double precision, "is_outer" boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_simplifypolygonhull"("geom" "public"."geometry", "vertex_fraction" double precision, "is_outer" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_simplifypolygonhull"("geom" "public"."geometry", "vertex_fraction" double precision, "is_outer" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_simplifypolygonhull"("geom" "public"."geometry", "vertex_fraction" double precision, "is_outer" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_simplifypreservetopology"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_simplifypreservetopology"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_simplifypreservetopology"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_simplifypreservetopology"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_simplifyvw"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_simplifyvw"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_simplifyvw"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_simplifyvw"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_snap"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_snap"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_snap"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_snap"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("public"."geometry", double precision, double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_snaptogrid"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision, double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision, double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision, double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_snaptogrid"("geom1" "public"."geometry", "geom2" "public"."geometry", double precision, double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_split"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_split"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_split"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_split"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_square"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_square"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_square"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_square"("size" double precision, "cell_i" integer, "cell_j" integer, "origin" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_squaregrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_squaregrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_squaregrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_squaregrid"("size" double precision, "bounds" "public"."geometry", OUT "geom" "public"."geometry", OUT "i" integer, OUT "j" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_srid"("geog" "public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_srid"("geog" "public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_srid"("geog" "public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_srid"("geog" "public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_srid"("geom" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_srid"("geom" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_srid"("geom" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_srid"("geom" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_startpoint"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_startpoint"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_startpoint"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_startpoint"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_subdivide"("geom" "public"."geometry", "maxvertices" integer, "gridsize" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_subdivide"("geom" "public"."geometry", "maxvertices" integer, "gridsize" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_subdivide"("geom" "public"."geometry", "maxvertices" integer, "gridsize" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_subdivide"("geom" "public"."geometry", "maxvertices" integer, "gridsize" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_summary"("public"."geography") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_summary"("public"."geography") TO "anon";
GRANT ALL ON FUNCTION "public"."st_summary"("public"."geography") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_summary"("public"."geography") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_summary"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_summary"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_summary"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_summary"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_swapordinates"("geom" "public"."geometry", "ords" "cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_swapordinates"("geom" "public"."geometry", "ords" "cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."st_swapordinates"("geom" "public"."geometry", "ords" "cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_swapordinates"("geom" "public"."geometry", "ords" "cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_symdifference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_symdifference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_symdifference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_symdifference"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_symmetricdifference"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_symmetricdifference"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_symmetricdifference"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_symmetricdifference"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_tileenvelope"("zoom" integer, "x" integer, "y" integer, "bounds" "public"."geometry", "margin" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_tileenvelope"("zoom" integer, "x" integer, "y" integer, "bounds" "public"."geometry", "margin" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_tileenvelope"("zoom" integer, "x" integer, "y" integer, "bounds" "public"."geometry", "margin" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_tileenvelope"("zoom" integer, "x" integer, "y" integer, "bounds" "public"."geometry", "margin" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_touches"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_transform"("public"."geometry", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_transform"("public"."geometry", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_transform"("public"."geometry", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_transform"("public"."geometry", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "to_proj" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "to_proj" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "to_proj" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "to_proj" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_srid" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_srid" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_srid" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_srid" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_proj" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_proj" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_proj" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_transform"("geom" "public"."geometry", "from_proj" "text", "to_proj" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_translate"("public"."geometry", double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_transscale"("public"."geometry", double precision, double precision, double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_transscale"("public"."geometry", double precision, double precision, double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_transscale"("public"."geometry", double precision, double precision, double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_transscale"("public"."geometry", double precision, double precision, double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_triangulatepolygon"("g1" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_triangulatepolygon"("g1" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_triangulatepolygon"("g1" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_triangulatepolygon"("g1" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_unaryunion"("public"."geometry", "gridsize" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_unaryunion"("public"."geometry", "gridsize" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_unaryunion"("public"."geometry", "gridsize" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_unaryunion"("public"."geometry", "gridsize" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_union"("geom1" "public"."geometry", "geom2" "public"."geometry", "gridsize" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_voronoilines"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_voronoilines"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_voronoilines"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_voronoilines"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_voronoipolygons"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_voronoipolygons"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_voronoipolygons"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_voronoipolygons"("g1" "public"."geometry", "tolerance" double precision, "extend_to" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_within"("geom1" "public"."geometry", "geom2" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_wkbtosql"("wkb" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_wkbtosql"("wkb" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."st_wkbtosql"("wkb" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_wkbtosql"("wkb" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_wkttosql"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_wkttosql"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_wkttosql"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_wkttosql"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_wrapx"("geom" "public"."geometry", "wrap" double precision, "move" double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_wrapx"("geom" "public"."geometry", "wrap" double precision, "move" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_wrapx"("geom" "public"."geometry", "wrap" double precision, "move" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_wrapx"("geom" "public"."geometry", "wrap" double precision, "move" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_x"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_x"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_x"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_x"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_xmax"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_xmax"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_xmax"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_xmax"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_xmin"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_xmin"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_xmin"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_xmin"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_y"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_y"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_y"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_y"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_ymax"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_ymax"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_ymax"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_ymax"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_ymin"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_ymin"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_ymin"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_ymin"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_z"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_z"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_z"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_z"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_zmax"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_zmax"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_zmax"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_zmax"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_zmflag"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_zmflag"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_zmflag"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_zmflag"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_zmin"("public"."box3d") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_zmin"("public"."box3d") TO "anon";
GRANT ALL ON FUNCTION "public"."st_zmin"("public"."box3d") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_zmin"("public"."box3d") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strip_braces_quotes"("t" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_super_admin_to_auth"() TO "service_role";



GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_norm_specialty_array"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_norm_staging_spec"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_proposal_screens_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_proposals_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_proposal_email_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unlockrows"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unlockrows"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unlockrows"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlockrows"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_email_status"("p_log_id" bigint, "p_status" character varying, "p_error_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_geom_from_latlng"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_geom_from_latlng"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_proposal_status"("p_proposal_id" bigint, "p_new_status" "public"."proposal_status", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_proposal_status_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, character varying, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, character varying, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, character varying, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"(character varying, character varying, character varying, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."updategeometrysrid"("catalogn_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"("catalogn_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"("catalogn_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."updategeometrysrid"("catalogn_name" character varying, "schema_name" character varying, "table_name" character varying, "column_name" character varying, "new_srid_in" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."st_3dextent"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_3dextent"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_3dextent"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_3dextent"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asflatgeobuf"("anyelement", boolean, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asgeobuf"("anyelement", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_asmvt"("anyelement", "text", integer, "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_clusterintersecting"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_clusterwithin"("public"."geometry", double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_collect"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_extent"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_extent"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_extent"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_extent"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_makeline"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_memcollect"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_memcollect"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_memcollect"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_memcollect"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_memunion"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_memunion"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_memunion"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_memunion"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_polygonize"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry") TO "postgres";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry", double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry", double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry", double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."st_union"("public"."geometry", double precision) TO "service_role";









GRANT ALL ON TABLE "public"."agencias" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."agencias" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."agencias" TO "app_super_admin";
GRANT ALL ON TABLE "public"."agencias" TO "authenticated";
GRANT ALL ON TABLE "public"."agencias" TO "anon";



GRANT ALL ON TABLE "public"."br_states" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."br_states" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."br_states" TO "app_super_admin";



GRANT ALL ON TABLE "public"."_audit_agencias_state_unmapped" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."_audit_agencias_state_unmapped" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."_audit_agencias_state_unmapped" TO "app_super_admin";



GRANT ALL ON TABLE "public"."holidays" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."holidays" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."holidays" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."holidays" TO "authenticated";



GRANT ALL ON TABLE "public"."_audit_holidays_state_unmapped" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."_audit_holidays_state_unmapped" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."_audit_holidays_state_unmapped" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screens" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screens" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screens" TO "app_super_admin";
GRANT ALL ON TABLE "public"."screens" TO "authenticated";
GRANT ALL ON TABLE "public"."screens" TO "anon";



GRANT ALL ON TABLE "public"."_audit_screens_state_unmapped" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."_audit_screens_state_unmapped" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."_audit_screens_state_unmapped" TO "app_super_admin";



GRANT ALL ON TABLE "public"."venues" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."venues" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."venues" TO "app_super_admin";
GRANT ALL ON TABLE "public"."venues" TO "authenticated";
GRANT ALL ON TABLE "public"."venues" TO "anon";



GRANT ALL ON TABLE "public"."_audit_venues_state_unmapped" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."_audit_venues_state_unmapped" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."_audit_venues_state_unmapped" TO "app_super_admin";



GRANT ALL ON TABLE "public"."acoes_especiais" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."acoes_especiais" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."acoes_especiais" TO "app_super_admin";
GRANT ALL ON TABLE "public"."acoes_especiais" TO "authenticated";
GRANT ALL ON TABLE "public"."acoes_especiais" TO "anon";



GRANT ALL ON TABLE "public"."agencia_contatos" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."agencia_contatos" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."agencia_contatos" TO "app_super_admin";
GRANT ALL ON TABLE "public"."agencia_contatos" TO "authenticated";
GRANT ALL ON TABLE "public"."agencia_contatos" TO "anon";



GRANT ALL ON TABLE "public"."agencia_deals" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."agencia_deals" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."agencia_deals" TO "app_super_admin";
GRANT ALL ON TABLE "public"."agencia_deals" TO "authenticated";



GRANT ALL ON TABLE "public"."agencia_projeto_equipe" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."agencia_projeto_equipe" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."agencia_projeto_equipe" TO "app_super_admin";
GRANT ALL ON TABLE "public"."agencia_projeto_equipe" TO "authenticated";



GRANT ALL ON TABLE "public"."agencia_projeto_marcos" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."agencia_projeto_marcos" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."agencia_projeto_marcos" TO "app_super_admin";
GRANT ALL ON TABLE "public"."agencia_projeto_marcos" TO "authenticated";



GRANT ALL ON TABLE "public"."agencia_projetos" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."agencia_projetos" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."agencia_projetos" TO "app_super_admin";
GRANT ALL ON TABLE "public"."agencia_projetos" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."agencias_codigo_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."agencias_codigo_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."agencias_codigo_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."audience_estimates" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."audience_estimates" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audience_estimates" TO "app_super_admin";



GRANT ALL ON SEQUENCE "public"."audience_estimates_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."audience_estimates_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."audience_estimates_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."audit_constraints_log" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."audit_constraints_log" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_constraints_log" TO "app_super_admin";
GRANT ALL ON TABLE "public"."audit_constraints_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_constraints_log" TO "anon";



GRANT ALL ON SEQUENCE "public"."audit_constraints_log_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."audit_constraints_log_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."audit_constraints_log_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."audit_orphans_log" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."audit_orphans_log" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_orphans_log" TO "app_super_admin";
GRANT ALL ON TABLE "public"."audit_orphans_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_orphans_log" TO "anon";



GRANT ALL ON SEQUENCE "public"."audit_orphans_log_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."audit_orphans_log_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."audit_orphans_log_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."audit_screens_deleted" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."audit_screens_deleted" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."audit_screens_deleted" TO "app_super_admin";
GRANT ALL ON TABLE "public"."audit_screens_deleted" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_screens_deleted" TO "anon";



GRANT ALL ON TABLE "public"."br_states_fullname" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."br_states_fullname" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."br_states_fullname" TO "app_super_admin";



GRANT ALL ON TABLE "public"."campaign_screens" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."campaign_screens" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."campaign_screens" TO "app_super_admin";
GRANT ALL ON TABLE "public"."campaign_screens" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_screens" TO "anon";



GRANT ALL ON SEQUENCE "public"."campaign_screens_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."campaign_screens_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."campaign_screens_id_seq" TO "app_super_admin";
GRANT ALL ON SEQUENCE "public"."campaign_screens_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."campaign_screens_id_seq" TO "anon";



GRANT ALL ON TABLE "public"."campaigns" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."campaigns" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."campaigns" TO "app_super_admin";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "anon";



GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."campaigns_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "app_super_admin";
GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."cep_geocode" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."cep_geocode" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cep_geocode" TO "app_super_admin";



GRANT ALL ON TABLE "public"."cep_geocode_stg" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."cep_geocode_stg" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."cep_geocode_stg" TO "app_super_admin";



GRANT ALL ON TABLE "public"."classes" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."classes" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."classes" TO "app_super_admin";



GRANT ALL ON SEQUENCE "public"."classes_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."classes_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."classes_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."email_logs" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."email_logs" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."email_logs" TO "app_super_admin";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."email_logs_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."email_logs_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."email_logs_id_seq" TO "app_super_admin";
GRANT USAGE ON SEQUENCE "public"."email_logs_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."email_stats" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."email_stats" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."email_stats" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."email_stats" TO "authenticated";



GRANT ALL ON TABLE "public"."grupos_cpm" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."grupos_cpm" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."grupos_cpm" TO "app_super_admin";
GRANT ALL ON TABLE "public"."grupos_cpm" TO "authenticated";
GRANT ALL ON TABLE "public"."grupos_cpm" TO "anon";



GRANT ALL ON SEQUENCE "public"."holidays_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."holidays_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."holidays_id_seq" TO "app_super_admin";
GRANT ALL ON SEQUENCE "public"."holidays_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."networks" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."networks" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."networks" TO "app_super_admin";



GRANT ALL ON TABLE "public"."pessoas_projeto" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."pessoas_projeto" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."pessoas_projeto" TO "app_super_admin";
GRANT ALL ON TABLE "public"."pessoas_projeto" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."price_rules_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."price_rules_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."price_rules_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."profiles" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "app_super_admin";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "anon";



GRANT ALL ON TABLE "public"."proposal_screens" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."proposal_screens" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."proposal_screens" TO "app_super_admin";
GRANT ALL ON TABLE "public"."proposal_screens" TO "authenticated";
GRANT ALL ON TABLE "public"."proposal_screens" TO "anon";



GRANT ALL ON TABLE "public"."proposals" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."proposals" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."proposals" TO "app_super_admin";
GRANT ALL ON TABLE "public"."proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."proposals" TO "anon";



GRANT ALL ON TABLE "public"."proposal_kpis" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."proposal_kpis" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."proposal_kpis" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."proposal_kpis" TO "authenticated";



GRANT ALL ON TABLE "public"."proposal_locales" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."proposal_locales" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."proposal_locales" TO "app_super_admin";



GRANT ALL ON TABLE "public"."proposal_locations_summary" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."proposal_locations_summary" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."proposal_locations_summary" TO "app_super_admin";



GRANT ALL ON SEQUENCE "public"."proposal_screens_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."proposal_screens_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."proposal_screens_id_seq" TO "app_super_admin";
GRANT ALL ON SEQUENCE "public"."proposal_screens_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."proposal_screens_id_seq" TO "anon";



GRANT ALL ON TABLE "public"."proposal_snapshots" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."proposal_snapshots" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."proposal_snapshots" TO "app_super_admin";



GRANT ALL ON SEQUENCE "public"."proposals_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."proposals_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."proposals_id_seq" TO "app_super_admin";
GRANT ALL ON SEQUENCE "public"."proposals_id_seq" TO "authenticated";



GRANT ALL ON TABLE "public"."proposta_servicos_especiais" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."proposta_servicos_especiais" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."proposta_servicos_especiais" TO "app_super_admin";
GRANT ALL ON TABLE "public"."proposta_servicos_especiais" TO "authenticated";
GRANT ALL ON TABLE "public"."proposta_servicos_especiais" TO "anon";



GRANT ALL ON TABLE "public"."user_profiles_secure" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."user_profiles_secure" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_profiles_secure" TO "app_super_admin";
GRANT ALL ON TABLE "public"."user_profiles_secure" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles_secure" TO "anon";



GRANT ALL ON TABLE "public"."user_roles" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."user_roles" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_roles" TO "app_super_admin";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "anon";



GRANT ALL ON TABLE "public"."safe_user_profiles" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."safe_user_profiles" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."safe_user_profiles" TO "app_super_admin";



GRANT ALL ON TABLE "public"."safe_venues" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."safe_venues" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."safe_venues" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screen_availability" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screen_availability" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screen_availability" TO "app_super_admin";
GRANT ALL ON TABLE "public"."screen_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."screen_availability" TO "anon";



GRANT ALL ON SEQUENCE "public"."screen_availability_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."screen_availability_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."screen_availability_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screen_bookings" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screen_bookings" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screen_bookings" TO "app_super_admin";
GRANT ALL ON TABLE "public"."screen_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."screen_bookings" TO "anon";



GRANT ALL ON SEQUENCE "public"."screen_bookings_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."screen_bookings_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."screen_bookings_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screen_classes" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screen_classes" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screen_classes" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screen_proposal_popularity" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screen_proposal_popularity" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screen_proposal_popularity" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screen_rates" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screen_rates" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screen_rates" TO "app_super_admin";
GRANT ALL ON TABLE "public"."screen_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."screen_rates" TO "anon";



GRANT ALL ON SEQUENCE "public"."screen_rates_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."screen_rates_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."screen_rates_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screens_backup_20250919" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screens_backup_20250919" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screens_backup_20250919" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screens_backup_20250919_144453" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screens_backup_20250919_144453" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screens_backup_20250919_144453" TO "app_super_admin";



GRANT ALL ON TABLE "public"."screens_backup_geo_utc_now" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."screens_backup_geo_utc_now" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."screens_backup_geo_utc_now" TO "app_super_admin";



GRANT ALL ON SEQUENCE "public"."screens_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."screens_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."screens_id_seq" TO "app_super_admin";
GRANT SELECT,USAGE ON SEQUENCE "public"."screens_id_seq" TO "authenticated";
GRANT SELECT,USAGE ON SEQUENCE "public"."screens_id_seq" TO "anon";



GRANT ALL ON TABLE "public"."servicos_especiais" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."servicos_especiais" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."servicos_especiais" TO "app_super_admin";
GRANT ALL ON TABLE "public"."servicos_especiais" TO "authenticated";
GRANT ALL ON TABLE "public"."servicos_especiais" TO "anon";



GRANT ALL ON TABLE "public"."specialties" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."specialties" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."specialties" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."specialties" TO "authenticated";
GRANT SELECT ON TABLE "public"."specialties" TO "anon";



GRANT ALL ON TABLE "public"."specialty_term_map" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."specialty_term_map" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."specialty_term_map" TO "app_super_admin";



GRANT ALL ON TABLE "public"."staging_screens" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."staging_screens" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."staging_screens" TO "app_super_admin";



GRANT ALL ON TABLE "public"."stg_billboard_data" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."stg_billboard_data" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stg_billboard_data" TO "app_super_admin";
GRANT ALL ON TABLE "public"."stg_billboard_data" TO "authenticated";
GRANT ALL ON TABLE "public"."stg_billboard_data" TO "anon";



GRANT ALL ON SEQUENCE "public"."stg_billboard_data_raw_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."stg_billboard_data_raw_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."stg_billboard_data_raw_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."stg_ponto" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."stg_ponto" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stg_ponto" TO "app_super_admin";
GRANT ALL ON TABLE "public"."stg_ponto" TO "authenticated";
GRANT ALL ON TABLE "public"."stg_ponto" TO "anon";



GRANT ALL ON TABLE "public"."stg_billboard_enriched" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."stg_billboard_enriched" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stg_billboard_enriched" TO "app_super_admin";



GRANT ALL ON TABLE "public"."stg_ceps" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."stg_ceps" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stg_ceps" TO "app_super_admin";



GRANT ALL ON SEQUENCE "public"."stg_ponto_raw_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."stg_ponto_raw_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."stg_ponto_raw_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."stg_screens_new" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."stg_screens_new" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stg_screens_new" TO "app_super_admin";



GRANT ALL ON TABLE "public"."stg_venue_specialties_pairs" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."stg_venue_specialties_pairs" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stg_venue_specialties_pairs" TO "app_super_admin";



GRANT ALL ON TABLE "public"."stg_venue_specs_raw" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."stg_venue_specs_raw" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."stg_venue_specs_raw" TO "app_super_admin";



GRANT ALL ON TABLE "public"."tmp_ceps_uf" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."tmp_ceps_uf" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tmp_ceps_uf" TO "app_super_admin";



GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."user_profiles" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_profiles" TO "app_super_admin";



GRANT ALL ON TABLE "public"."user_profiles_admin" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."user_profiles_admin" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_profiles_admin" TO "app_super_admin";



GRANT ALL ON TABLE "public"."user_profiles_extended" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."user_profiles_extended" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_profiles_extended" TO "app_super_admin";



GRANT ALL ON TABLE "public"."v_proposal_items" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."v_proposal_items" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_proposal_items" TO "app_super_admin";



GRANT ALL ON TABLE "public"."v_proposal_pdf" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."v_proposal_pdf" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_proposal_pdf" TO "app_super_admin";



GRANT ALL ON TABLE "public"."v_screens_enriched" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."v_screens_enriched" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_screens_enriched" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."v_screens_enriched" TO "authenticated";



GRANT ALL ON TABLE "public"."v_specialty_term_map" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."v_specialty_term_map" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_specialty_term_map" TO "app_super_admin";



GRANT ALL ON TABLE "public"."venue_audience_monthly" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."venue_audience_monthly" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."venue_audience_monthly" TO "app_super_admin";
GRANT ALL ON TABLE "public"."venue_audience_monthly" TO "authenticated";
GRANT ALL ON TABLE "public"."venue_audience_monthly" TO "anon";



GRANT ALL ON SEQUENCE "public"."venue_audience_monthly_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."venue_audience_monthly_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."venue_audience_monthly_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."venue_specialties" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."venue_specialties" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."venue_specialties" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."venue_specialties" TO "authenticated";
GRANT SELECT ON TABLE "public"."venue_specialties" TO "anon";



GRANT ALL ON SEQUENCE "public"."venues_id_seq" TO "service_role";
GRANT SELECT,USAGE ON SEQUENCE "public"."venues_id_seq" TO "app_admin";
GRANT ALL ON SEQUENCE "public"."venues_id_seq" TO "app_super_admin";



GRANT ALL ON TABLE "public"."vw_venue_specialties" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_venue_specialties" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_venue_specialties" TO "app_super_admin";



GRANT ALL ON TABLE "public"."vw_inventory_full" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_inventory_full" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_inventory_full" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."vw_inventory_full" TO "anon";
GRANT SELECT ON TABLE "public"."vw_inventory_full" TO "authenticated";



GRANT ALL ON TABLE "public"."vw_screens_front" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_screens_front" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_screens_front" TO "app_super_admin";



GRANT ALL ON TABLE "public"."vw_screens_full" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_screens_full" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_screens_full" TO "app_super_admin";



GRANT ALL ON TABLE "public"."vw_screens_inventory" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_screens_inventory" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_screens_inventory" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."vw_screens_inventory" TO "authenticated";



GRANT ALL ON TABLE "public"."vw_screens_pretty" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_screens_pretty" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_screens_pretty" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."vw_screens_pretty" TO "anon";
GRANT SELECT ON TABLE "public"."vw_screens_pretty" TO "authenticated";



GRANT ALL ON TABLE "public"."vw_specs_unmapped_staging" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_specs_unmapped_staging" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_specs_unmapped_staging" TO "app_super_admin";



GRANT ALL ON TABLE "public"."vw_venues_with_screens" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."vw_venues_with_screens" TO "app_admin";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."vw_venues_with_screens" TO "app_super_admin";
GRANT SELECT ON TABLE "public"."vw_venues_with_screens" TO "anon";
GRANT SELECT ON TABLE "public"."vw_venues_with_screens" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,USAGE ON SEQUENCES TO "app_admin";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "app_super_admin";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,UPDATE ON TABLES TO "app_admin";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "app_super_admin";






























RESET ALL;
