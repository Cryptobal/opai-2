-- Plantilla de migración de OPAI 2.0 (CAR-47). Reglas en docs/2.0/migraciones.md.
--
-- Qué hace y por qué: CAR-408 (Estándares H-5). Las tallas del uniforme pasan de columnas fijas de
-- `core.personas_uniforme` (prendas del rubro seguridad) a una fila por persona y prenda del kit de la empresa o de su
-- vertical. Aditiva: crea `core.personas_tallas` y copia las tallas ya guardadas con la clave de su prenda (las siete
-- columnas son las prendas de seguridad, mismas claves de @opai/domain). Al 14-nov-2026 no hay filas con tallas en dev
-- ni en main; la copia queda por si alguna llega antes de aplicar. Las columnas antiguas dejan de usarse y se retiran
-- en un PR posterior.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE "core"."personas_tallas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "prenda" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "personas_tallas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "personas_tallas_prenda_check" CHECK ("prenda" ~ '^[a-z][a-z0-9_]{1,39}$'),
    CONSTRAINT "personas_tallas_talla_check" CHECK (char_length(btrim("talla")) BETWEEN 1 AND 20)
);
CREATE UNIQUE INDEX "personas_tallas_persona_id_prenda_key" ON "core"."personas_tallas"("persona_id", "prenda");
CREATE INDEX "personas_tallas_tenant_id_persona_id_idx" ON "core"."personas_tallas"("tenant_id", "persona_id");

ALTER TABLE "core"."personas_tallas" ADD CONSTRAINT "personas_tallas_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."personas_tallas" ADD CONSTRAINT "personas_tallas_persona_id_fkey"
    FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON "core"."personas_tallas" TO opai_app;
ALTER TABLE "core"."personas_tallas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "core"."personas_tallas" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."personas_tallas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

CREATE TRIGGER mismo_tenant BEFORE INSERT OR UPDATE ON "core"."personas_tallas"
  FOR EACH ROW EXECUTE FUNCTION "core"."verificar_mismo_tenant"('persona_id', 'core.personas');

-- Copia de las tallas ya guardadas. Con FORCE RLS y un rol sin BYPASSRLS, el SELECT sobre `personas_uniforme` no ve
-- filas y la copia quedaría en 0 sin aviso («Migraciones de datos después de FORCE RLS»): se cuenta el origen y se
-- aborta si no coincide con lo copiado.
DO $$
DECLARE
  esperadas integer;
  copiadas integer;
BEGIN
  SELECT count(*) INTO esperadas
  FROM "core"."personas_uniforme" u
  CROSS JOIN LATERAL (VALUES
    (u."talla_camisa"), (u."talla_pantalon"), (u."talla_chaqueta"), (u."talla_zapato"),
    (u."talla_polera"), (u."talla_geologo"), (u."talla_polar")
  ) AS x(talla)
  WHERE x.talla IS NOT NULL AND char_length(btrim(x.talla)) BETWEEN 1 AND 20;

  INSERT INTO "core"."personas_tallas" ("id", "tenant_id", "persona_id", "prenda", "talla", "updated_at")
  SELECT gen_random_uuid(), u."tenant_id", u."persona_id", x.prenda, btrim(x.talla), CURRENT_TIMESTAMP
  FROM "core"."personas_uniforme" u
  CROSS JOIN LATERAL (VALUES
    ('camisa', u."talla_camisa"), ('pantalon', u."talla_pantalon"), ('chaqueta', u."talla_chaqueta"),
    ('calzado', u."talla_zapato"), ('polera', u."talla_polera"), ('geologo', u."talla_geologo"),
    ('polar', u."talla_polar")
  ) AS x(prenda, talla)
  WHERE x.talla IS NOT NULL AND char_length(btrim(x.talla)) BETWEEN 1 AND 20;
  GET DIAGNOSTICS copiadas = ROW_COUNT;

  -- Sin filas visibles en el origen pero con filas reales (RLS filtrando): el rol no puede leerlas.
  IF esperadas = 0 AND EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'core' AND c.relname = 'personas_uniforme' AND c.reltuples > 0)
     AND NOT (SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'El rol % no ve core.personas_uniforme (FORCE RLS): aplique con un rol BYPASSRLS', current_user;
  END IF;
  IF copiadas <> esperadas THEN
    RAISE EXCEPTION 'Copia de tallas incompleta: % de %', copiadas, esperadas;
  END IF;
END $$;

COMMIT;

-- Reversión: DROP TABLE "core"."personas_tallas"; (las columnas antiguas siguen con sus datos hasta el PR que las
-- retira). Si hubo tallas cargadas solo en la tabla nueva, restaurar desde el respaldo previo de Neon.
