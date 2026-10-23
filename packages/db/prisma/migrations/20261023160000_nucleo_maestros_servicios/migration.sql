-- AlterTable
ALTER TABLE "core"."api_keys" ADD COLUMN     "presupuesto_mensual_micro" INTEGER,
ADD COLUMN     "principal_id" UUID,
ADD COLUMN     "principal_tipo" TEXT NOT NULL DEFAULT 'usuario';

-- CreateTable
CREATE TABLE "core"."integraciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "proveedor" TEXT NOT NULL,
    "modalidad" TEXT NOT NULL DEFAULT 'plataforma',
    "estado" TEXT NOT NULL DEFAULT 'no_configurada',
    "config" JSONB NOT NULL DEFAULT '{}',
    "ultimo_test_en" TIMESTAMPTZ(6),
    "ultimo_error" TEXT,
    "actualizado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "integraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."secretos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "integracion_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "cifrado" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "tag" BYTEA NOT NULL,
    "sufijo" TEXT NOT NULL,
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "secretos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."claves_tenant" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "dek_cifrada" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "tag" BYTEA NOT NULL,
    "kek_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "claves_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."consumos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "recurso" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costo_unitario_micro" INTEGER NOT NULL DEFAULT 0,
    "costo_total_micro" INTEGER NOT NULL DEFAULT 0,
    "modulo" TEXT NOT NULL,
    "capability" TEXT,
    "actor_tipo" TEXT NOT NULL,
    "actor_id" TEXT,
    "via_user_id" TEXT,
    "api_key_id" UUID,
    "portal" TEXT,
    "efecto" TEXT,
    "dry_run" BOOLEAN,
    "ok" BOOLEAN,
    "duracion_ms" INTEGER,
    "referencia_tipo" TEXT,
    "referencia_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."consumos_diarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "dia" DATE NOT NULL,
    "recurso" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL DEFAULT '',
    "cantidad" INTEGER NOT NULL,
    "costo_total_micro" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consumos_diarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."precios_recursos" (
    "id" UUID NOT NULL,
    "recurso" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "costo_unitario_micro" INTEGER NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "precios_recursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."aprobaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "via_user_id" UUID NOT NULL,
    "capability" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "idempotency_key" TEXT,
    "resumen" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "vence_en" TIMESTAMPTZ(6) NOT NULL,
    "resuelta_por" UUID,
    "resuelta_en" TIMESTAMPTZ(6),
    "motivo" TEXT,
    "resultado" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "aprobaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."api_keys_autonomia" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "api_key_id" UUID NOT NULL,
    "capability" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "api_keys_autonomia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."bitacora" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidad_tipo" TEXT,
    "entidad_id" TEXT,
    "payload_canon" TEXT NOT NULL,
    "hash_previo" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."bitacora_cabezas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ultimo_seq" INTEGER NOT NULL DEFAULT 0,
    "ultimo_hash" TEXT NOT NULL,
    "verificada_en" TIMESTAMPTZ(6),
    "verificacion_ok" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bitacora_cabezas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."comprobantes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidad_tipo" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "emitido_a" TEXT,
    "bitacora_seq" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprobantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."documento_tipos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "capa" TEXT NOT NULL,
    "obligatorio" BOOLEAN NOT NULL DEFAULT false,
    "tiene_vencimiento" BOOLEAN NOT NULL DEFAULT false,
    "dias_alerta" INTEGER NOT NULL DEFAULT 30,
    "hitos" INTEGER[] DEFAULT ARRAY[30, 14, 7, 3, 1, 0]::INTEGER[],
    "normativa" TEXT,
    "mimes_permitidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visible_portal_default" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documento_tipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."documentos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo_id" UUID,
    "nombre" TEXT NOT NULL,
    "titulo" TEXT,
    "mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reemplaza_a_id" UUID,
    "emitido_en" DATE,
    "vence_en" DATE,
    "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visible_en" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "origen" TEXT NOT NULL DEFAULT 'subida',
    "modulo_origen" TEXT,
    "creado_por_tipo" TEXT NOT NULL,
    "creado_por_id" TEXT,
    "via_user_id" TEXT,
    "confirmado_en" TIMESTAMPTZ(6),
    "archivado_en" TIMESTAMPTZ(6),
    "bitacora_seq" INTEGER,
    "hito_notificado" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."documento_vinculos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "documento_id" UUID NOT NULL,
    "entidad_tipo" TEXT NOT NULL,
    "entidad_id" UUID NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'propietario',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documento_vinculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."cuentas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "razon_social" TEXT,
    "rut" TEXT,
    "giro" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'prospecto',
    "origen" TEXT,
    "sitio_web" TEXT,
    "calle" TEXT,
    "comuna" TEXT,
    "region" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'CL',
    "escritura_fecha" DATE,
    "escritura_notaria" TEXT,
    "notas" TEXT,
    "cliente_desde" DATE,
    "cliente_hasta" DATE,
    "archivada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."cuentas_representantes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cuentas_representantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."contactos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "cargo" TEXT,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "notas" TEXT,
    "archivado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."instalaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cuenta_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'prospecto',
    "calle" TEXT,
    "comuna" TEXT,
    "region" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'CL',
    "direccion_formateada" TEXT,
    "place_id" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "geocerca_m" INTEGER NOT NULL DEFAULT 1000,
    "vigente_desde" DATE,
    "vigente_hasta" DATE,
    "notas" TEXT,
    "archivada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "instalaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."cargos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "clase" TEXT NOT NULL DEFAULT 'operativo',
    "sueldo_sensible" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."puestos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "instalacion_id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "dias_trabajo" INTEGER NOT NULL,
    "dias_descanso" INTEGER NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "jornada" TEXT NOT NULL DEFAULT 'dia',
    "dotacion" INTEGER NOT NULL DEFAULT 1,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "vigente_desde" DATE,
    "vigente_hasta" DATE,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "puestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."personas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email_personal" TEXT,
    "email_laboral" TEXT,
    "telefono" TEXT,
    "fecha_nacimiento" DATE,
    "sexo" TEXT,
    "nacionalidad" TEXT NOT NULL DEFAULT 'CL',
    "calle" TEXT,
    "comuna" TEXT,
    "region" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'CL',
    "direccion_formateada" TEXT,
    "place_id" TEXT,
    "lat" DECIMAL(10,7),
    "lng" DECIMAL(10,7),
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "bloqueada" BOOLEAN NOT NULL DEFAULT false,
    "bloqueo_motivo" TEXT,
    "bloqueada_en" TIMESTAMPTZ(6),
    "usuario_id" UUID,
    "archivada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."vinculos_laborales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "termino" DATE,
    "motivo_termino" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vinculos_laborales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."estructuras_sueldo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nivel" TEXT NOT NULL,
    "cargo_id" UUID,
    "puesto_id" UUID,
    "persona_id" UUID,
    "sueldo_base" INTEGER NOT NULL,
    "colacion" INTEGER NOT NULL DEFAULT 0,
    "movilizacion" INTEGER NOT NULL DEFAULT 0,
    "gratificacion" TEXT NOT NULL DEFAULT 'legal_25',
    "gratificacion_monto" INTEGER,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'vigente',
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "estructuras_sueldo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."estructuras_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "estructura_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "monto" INTEGER,
    "porcentaje" INTEGER,
    "imponible" BOOLEAN NOT NULL DEFAULT true,
    "tributable" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "estructuras_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."ids_externos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entidad_tipo" TEXT NOT NULL,
    "entidad_id" UUID NOT NULL,
    "sistema" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ids_externos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."perfil_empresa" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "razon_social" TEXT,
    "rut" TEXT,
    "giro" TEXT,
    "calle" TEXT,
    "comuna" TEXT,
    "region" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'CL',
    "representante_nombre" TEXT,
    "representante_rut" TEXT,
    "representante_email" TEXT,
    "correo_comercial" TEXT,
    "correo_operaciones" TEXT,
    "correo_finanzas" TEXT,
    "correo_contacto" TEXT,
    "telefono" TEXT,
    "whatsapp" TEXT,
    "sitio_web" TEXT,
    "nombre_comercial" TEXT,
    "eslogan" TEXT,
    "color_primario" TEXT,
    "color_secundario" TEXT,
    "logo_principal_id" UUID,
    "logo_claro_id" UUID,
    "logo_oscuro_id" UUID,
    "isotipo_id" UUID,
    "favicon_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "perfil_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."ajustes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ambito" TEXT NOT NULL,
    "sujeto_id" UUID NOT NULL,
    "modulo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "actualizado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ajustes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."ajustes_plataforma" (
    "id" UUID NOT NULL,
    "modulo" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "actualizado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ajustes_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."eventos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "entidad_tipo" TEXT,
    "entidad_id" TEXT,
    "payload" JSONB NOT NULL,
    "actor_tipo" TEXT NOT NULL,
    "actor_id" TEXT,
    "via_user_id" TEXT,
    "idempotency_key" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "publicado_en" TIMESTAMPTZ(6),
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."eventos_entregas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "consumidor" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "eventos_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."trabajos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "programado_para" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "max_intentos" INTEGER NOT NULL DEFAULT 5,
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "ultimo_error" TEXT,
    "resultado" JSONB,
    "clave_unica" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trabajos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."plantillas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evento" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "asunto" TEXT,
    "cuerpo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "plantillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."notificacion_reglas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evento" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "destinatarios_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "destinatarios_usuarios" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notificacion_reglas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."notificaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "evento_id" UUID,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "enlace" TEXT,
    "leida_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."envios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evento_id" UUID,
    "canal" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "plantilla_evento" TEXT,
    "plantilla_version" INTEGER,
    "estado" TEXT NOT NULL,
    "proveedor_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integraciones_tenant_id_proveedor_key" ON "core"."integraciones"("tenant_id", "proveedor");

-- CreateIndex
CREATE UNIQUE INDEX "secretos_tenant_id_integracion_id_nombre_key" ON "core"."secretos"("tenant_id", "integracion_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "claves_tenant_tenant_id_key" ON "core"."claves_tenant"("tenant_id");

-- CreateIndex
CREATE INDEX "consumos_tenant_id_created_at_idx" ON "core"."consumos"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "consumos_tenant_id_recurso_created_at_idx" ON "core"."consumos"("tenant_id", "recurso", "created_at");

-- CreateIndex
CREATE INDEX "consumos_tenant_id_api_key_id_created_at_idx" ON "core"."consumos"("tenant_id", "api_key_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "consumos_diarios_tenant_id_dia_recurso_modulo_api_key_id_key" ON "core"."consumos_diarios"("tenant_id", "dia", "recurso", "modulo", "api_key_id");

-- CreateIndex
CREATE UNIQUE INDEX "precios_recursos_recurso_vigente_desde_key" ON "core"."precios_recursos"("recurso", "vigente_desde");

-- CreateIndex
CREATE INDEX "aprobaciones_tenant_id_estado_created_at_idx" ON "core"."aprobaciones"("tenant_id", "estado", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_autonomia_tenant_id_api_key_id_capability_key" ON "core"."api_keys_autonomia"("tenant_id", "api_key_id", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "bitacora_tenant_id_seq_key" ON "core"."bitacora"("tenant_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "bitacora_cabezas_tenant_id_key" ON "core"."bitacora_cabezas"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "comprobantes_token_key" ON "core"."comprobantes"("token");

-- CreateIndex
CREATE INDEX "comprobantes_tenant_id_entidad_tipo_entidad_id_idx" ON "core"."comprobantes"("tenant_id", "entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "documento_tipos_tenant_id_capa_idx" ON "core"."documento_tipos"("tenant_id", "capa");

-- CreateIndex
CREATE UNIQUE INDEX "documento_tipos_tenant_id_codigo_key" ON "core"."documento_tipos"("tenant_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_storage_key_key" ON "core"."documentos"("storage_key");

-- CreateIndex
CREATE INDEX "documentos_tenant_id_vence_en_idx" ON "core"."documentos"("tenant_id", "vence_en");

-- CreateIndex
CREATE INDEX "documentos_tenant_id_tipo_id_idx" ON "core"."documentos"("tenant_id", "tipo_id");

-- CreateIndex
CREATE INDEX "documentos_tenant_id_estado_idx" ON "core"."documentos"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "documentos_tenant_id_sha256_idx" ON "core"."documentos"("tenant_id", "sha256");

-- CreateIndex
CREATE INDEX "documento_vinculos_tenant_id_entidad_tipo_entidad_id_idx" ON "core"."documento_vinculos"("tenant_id", "entidad_tipo", "entidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "documento_vinculos_tenant_id_documento_id_entidad_tipo_enti_key" ON "core"."documento_vinculos"("tenant_id", "documento_id", "entidad_tipo", "entidad_id");

-- CreateIndex
CREATE INDEX "cuentas_tenant_id_estado_idx" ON "core"."cuentas"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "cuentas_tenant_id_nombre_idx" ON "core"."cuentas"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "cuentas_representantes_tenant_id_cuenta_id_idx" ON "core"."cuentas_representantes"("tenant_id", "cuenta_id");

-- CreateIndex
CREATE INDEX "contactos_tenant_id_cuenta_id_idx" ON "core"."contactos"("tenant_id", "cuenta_id");

-- CreateIndex
CREATE INDEX "instalaciones_tenant_id_estado_idx" ON "core"."instalaciones"("tenant_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "instalaciones_tenant_id_cuenta_id_nombre_key" ON "core"."instalaciones"("tenant_id", "cuenta_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_tenant_id_nombre_key" ON "core"."cargos"("tenant_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "puestos_tenant_id_instalacion_id_nombre_key" ON "core"."puestos"("tenant_id", "instalacion_id", "nombre");

-- CreateIndex
CREATE INDEX "personas_tenant_id_estado_idx" ON "core"."personas"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "personas_tenant_id_apellidos_idx" ON "core"."personas"("tenant_id", "apellidos");

-- CreateIndex
CREATE UNIQUE INDEX "personas_tenant_id_rut_key" ON "core"."personas"("tenant_id", "rut");

-- CreateIndex
CREATE INDEX "vinculos_laborales_tenant_id_persona_id_idx" ON "core"."vinculos_laborales"("tenant_id", "persona_id");

-- CreateIndex
CREATE INDEX "estructuras_sueldo_tenant_id_nivel_cargo_id_idx" ON "core"."estructuras_sueldo"("tenant_id", "nivel", "cargo_id");

-- CreateIndex
CREATE INDEX "estructuras_sueldo_tenant_id_nivel_puesto_id_idx" ON "core"."estructuras_sueldo"("tenant_id", "nivel", "puesto_id");

-- CreateIndex
CREATE INDEX "estructuras_sueldo_tenant_id_nivel_persona_id_idx" ON "core"."estructuras_sueldo"("tenant_id", "nivel", "persona_id");

-- CreateIndex
CREATE INDEX "estructuras_items_tenant_id_estructura_id_idx" ON "core"."estructuras_items"("tenant_id", "estructura_id");

-- CreateIndex
CREATE INDEX "ids_externos_tenant_id_entidad_tipo_entidad_id_idx" ON "core"."ids_externos"("tenant_id", "entidad_tipo", "entidad_id");

-- CreateIndex
CREATE UNIQUE INDEX "ids_externos_tenant_id_sistema_entidad_tipo_id_externo_key" ON "core"."ids_externos"("tenant_id", "sistema", "entidad_tipo", "id_externo");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_empresa_tenant_id_key" ON "core"."perfil_empresa"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "ajustes_tenant_id_ambito_sujeto_id_modulo_clave_key" ON "core"."ajustes"("tenant_id", "ambito", "sujeto_id", "modulo", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "ajustes_plataforma_modulo_clave_key" ON "core"."ajustes_plataforma"("modulo", "clave");

-- CreateIndex
CREATE INDEX "eventos_tenant_id_estado_created_at_idx" ON "core"."eventos"("tenant_id", "estado", "created_at");

-- CreateIndex
CREATE INDEX "eventos_tenant_id_tipo_created_at_idx" ON "core"."eventos"("tenant_id", "tipo", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_entregas_tenant_id_evento_id_consumidor_key" ON "core"."eventos_entregas"("tenant_id", "evento_id", "consumidor");

-- CreateIndex
CREATE INDEX "trabajos_tenant_id_estado_programado_para_idx" ON "core"."trabajos"("tenant_id", "estado", "programado_para");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_tenant_id_evento_canal_version_key" ON "core"."plantillas"("tenant_id", "evento", "canal", "version");

-- CreateIndex
CREATE UNIQUE INDEX "notificacion_reglas_tenant_id_evento_canal_key" ON "core"."notificacion_reglas"("tenant_id", "evento", "canal");

-- CreateIndex
CREATE INDEX "notificaciones_tenant_id_usuario_id_leida_en_idx" ON "core"."notificaciones"("tenant_id", "usuario_id", "leida_en");

-- CreateIndex
CREATE INDEX "envios_tenant_id_created_at_idx" ON "core"."envios"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "core"."integraciones" ADD CONSTRAINT "integraciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."secretos" ADD CONSTRAINT "secretos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."secretos" ADD CONSTRAINT "secretos_integracion_id_fkey" FOREIGN KEY ("integracion_id") REFERENCES "core"."integraciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."claves_tenant" ADD CONSTRAINT "claves_tenant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."consumos" ADD CONSTRAINT "consumos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."consumos_diarios" ADD CONSTRAINT "consumos_diarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."aprobaciones" ADD CONSTRAINT "aprobaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."api_keys_autonomia" ADD CONSTRAINT "api_keys_autonomia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."api_keys_autonomia" ADD CONSTRAINT "api_keys_autonomia_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "core"."api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."bitacora" ADD CONSTRAINT "bitacora_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."bitacora_cabezas" ADD CONSTRAINT "bitacora_cabezas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."comprobantes" ADD CONSTRAINT "comprobantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."documento_tipos" ADD CONSTRAINT "documento_tipos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."documentos" ADD CONSTRAINT "documentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."documentos" ADD CONSTRAINT "documentos_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "core"."documento_tipos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."documento_vinculos" ADD CONSTRAINT "documento_vinculos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."documento_vinculos" ADD CONSTRAINT "documento_vinculos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "core"."documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cuentas" ADD CONSTRAINT "cuentas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cuentas_representantes" ADD CONSTRAINT "cuentas_representantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cuentas_representantes" ADD CONSTRAINT "cuentas_representantes_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."contactos" ADD CONSTRAINT "contactos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."contactos" ADD CONSTRAINT "contactos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."instalaciones" ADD CONSTRAINT "instalaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."instalaciones" ADD CONSTRAINT "instalaciones_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "core"."cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cargos" ADD CONSTRAINT "cargos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."puestos" ADD CONSTRAINT "puestos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."puestos" ADD CONSTRAINT "puestos_instalacion_id_fkey" FOREIGN KEY ("instalacion_id") REFERENCES "core"."instalaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."puestos" ADD CONSTRAINT "puestos_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "core"."cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."personas" ADD CONSTRAINT "personas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."vinculos_laborales" ADD CONSTRAINT "vinculos_laborales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."vinculos_laborales" ADD CONSTRAINT "vinculos_laborales_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."vinculos_laborales" ADD CONSTRAINT "vinculos_laborales_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "core"."cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "core"."cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "core"."puestos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."estructuras_items" ADD CONSTRAINT "estructuras_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."estructuras_items" ADD CONSTRAINT "estructuras_items_estructura_id_fkey" FOREIGN KEY ("estructura_id") REFERENCES "core"."estructuras_sueldo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."ids_externos" ADD CONSTRAINT "ids_externos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."perfil_empresa" ADD CONSTRAINT "perfil_empresa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."ajustes" ADD CONSTRAINT "ajustes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."eventos" ADD CONSTRAINT "eventos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."eventos_entregas" ADD CONSTRAINT "eventos_entregas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."eventos_entregas" ADD CONSTRAINT "eventos_entregas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "core"."eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."trabajos" ADD CONSTRAINT "trabajos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."plantillas" ADD CONSTRAINT "plantillas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."notificacion_reglas" ADD CONSTRAINT "notificacion_reglas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."notificaciones" ADD CONSTRAINT "notificaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."envios" ADD CONSTRAINT "envios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- SQL manual (Brief 02). Ver CLAUDE.md: RLS tenant_isolation en toda tabla con tenant_id.
-- ---------------------------------------------------------------------------

ALTER TABLE "core"."integraciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."integraciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."secretos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."secretos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."claves_tenant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."claves_tenant" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."consumos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."consumos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."consumos_diarios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."consumos_diarios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."aprobaciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."aprobaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."api_keys_autonomia" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."api_keys_autonomia" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."bitacora" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."bitacora" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."bitacora_cabezas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."bitacora_cabezas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."comprobantes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."comprobantes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."documento_tipos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."documento_tipos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."documentos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."documentos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."documento_vinculos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."documento_vinculos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."cuentas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."cuentas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."cuentas_representantes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."cuentas_representantes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."contactos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."contactos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."instalaciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."instalaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."cargos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."cargos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."puestos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."puestos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."personas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."personas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."vinculos_laborales" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."vinculos_laborales" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."estructuras_sueldo" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."estructuras_sueldo" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."estructuras_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."estructuras_items" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."ids_externos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."ids_externos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."perfil_empresa" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."perfil_empresa" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."ajustes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."ajustes" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."eventos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."eventos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."eventos_entregas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."eventos_entregas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."trabajos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."trabajos" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."plantillas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."plantillas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."notificacion_reglas" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."notificacion_reglas" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."notificaciones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."notificaciones" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

ALTER TABLE "core"."envios" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "core"."envios" AS PERMISSIVE FOR ALL TO opai_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- Unicidad parcial: RUT de cuenta, email de contacto, usuario de persona, un vínculo vigente por
-- persona, clave única de trabajo.
CREATE UNIQUE INDEX "cuentas_tenant_rut_key" ON "core"."cuentas"("tenant_id", "rut") WHERE "rut" IS NOT NULL;
CREATE UNIQUE INDEX "contactos_tenant_cuenta_email_key" ON "core"."contactos"("tenant_id", "cuenta_id", "email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX "personas_tenant_usuario_key" ON "core"."personas"("tenant_id", "usuario_id") WHERE "usuario_id" IS NOT NULL;
CREATE UNIQUE INDEX "vinculos_laborales_vigente_key" ON "core"."vinculos_laborales"("tenant_id", "persona_id") WHERE "estado" = 'vigente';
CREATE UNIQUE INDEX "trabajos_tenant_clave_unica_key" ON "core"."trabajos"("tenant_id", "clave_unica") WHERE "clave_unica" IS NOT NULL;

-- Estructuras de sueldo: exactamente una referencia según el nivel y vigencia coherente (ADR-005).
ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_nivel_check" CHECK (
  ("nivel" = 'cargo' AND "cargo_id" IS NOT NULL AND "puesto_id" IS NULL AND "persona_id" IS NULL) OR
  ("nivel" = 'puesto' AND "puesto_id" IS NOT NULL AND "cargo_id" IS NULL AND "persona_id" IS NULL) OR
  ("nivel" = 'persona' AND "persona_id" IS NOT NULL AND "cargo_id" IS NULL AND "puesto_id" IS NULL)
);
ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_vigencia_check"
  CHECK ("vigente_hasta" IS NULL OR "vigente_hasta" >= "vigente_desde");
ALTER TABLE "core"."estructuras_sueldo" ADD CONSTRAINT "estructuras_sueldo_montos_check"
  CHECK ("sueldo_base" >= 0 AND "colacion" >= 0 AND "movilizacion" >= 0);

-- Bitácora append-only (ADR-023): nada se actualiza ni se borra, ni siquiera el propietario.
CREATE OR REPLACE FUNCTION "core"."bitacora_inmutable"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'core.bitacora es append-only: % no permitido', TG_OP;
END;
$$;
CREATE TRIGGER "bitacora_sin_update_delete" BEFORE UPDATE OR DELETE ON "core"."bitacora"
  FOR EACH ROW EXECUTE FUNCTION "core"."bitacora_inmutable"();
CREATE TRIGGER "bitacora_sin_truncate" BEFORE TRUNCATE ON "core"."bitacora"
  FOR EACH STATEMENT EXECUTE FUNCTION "core"."bitacora_inmutable"();
REVOKE UPDATE, DELETE, TRUNCATE ON "core"."bitacora" FROM opai_app;

-- Tablas de plataforma sin tenant (ajustes_plataforma, precios_recursos): sin RLS. La aplicación
-- las lee; solo las capacidades platform.* las escriben (autorización en la capacidad).

-- Zona horaria de la base en UTC (CLAUDE.md: tiempo en UTC). El adaptador de Prisma envía instantes
-- sin zona y Postgres los interpreta en la zona de la sesión. Neon ya usa UTC; esto lo fija para
-- cualquier base (local, CI) y aplica a las conexiones nuevas.
-- Requiere ser dueño de la base (Neon: neondb_owner). Si no, se avisa y se fija por rol abajo.
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sin permiso para ALTER DATABASE; la zona UTC se fija por rol.';
END
$$;
