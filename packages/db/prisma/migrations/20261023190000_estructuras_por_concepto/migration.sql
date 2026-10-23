-- Brief 02, sesión C: sueldo por concepto en tres niveles (diseño aprobado, pantalla 57).
-- Un nivel puesto o persona define solo los conceptos que cambia; NULL = hereda del nivel más
-- general. El nivel cargo sigue definiendo todos. Aditiva: no cambia datos existentes.
ALTER TABLE "core"."estructuras_sueldo" ALTER COLUMN "sueldo_base" DROP NOT NULL;
ALTER TABLE "core"."estructuras_sueldo" ALTER COLUMN "colacion" DROP NOT NULL;
ALTER TABLE "core"."estructuras_sueldo" ALTER COLUMN "colacion" DROP DEFAULT;
ALTER TABLE "core"."estructuras_sueldo" ALTER COLUMN "movilizacion" DROP NOT NULL;
ALTER TABLE "core"."estructuras_sueldo" ALTER COLUMN "movilizacion" DROP DEFAULT;
ALTER TABLE "core"."estructuras_sueldo" ALTER COLUMN "gratificacion" DROP NOT NULL;
ALTER TABLE "core"."estructuras_sueldo" ALTER COLUMN "gratificacion" DROP DEFAULT;

ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_cargo_completo_check"
  CHECK (
    "nivel" <> 'cargo'
    OR ("sueldo_base" IS NOT NULL AND "colacion" IS NOT NULL AND "movilizacion" IS NOT NULL
        AND "gratificacion" IS NOT NULL)
  );
