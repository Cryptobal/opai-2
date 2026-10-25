# Extracción de OPAI 1.0 — Maestros (cuentas, contactos, instalaciones, personas, cargos, estructuras, documentos)

**Fuente:** `Cryptobal/opai` @ `53bb97d` (23-oct-2026): `prisma/schema.prisma` (modelos `CrmAccount`, `AccountRepresentanteLegal`, `AccountPersoneria`, `CrmContact`, `CrmInstallation`, `OpsPersona`, `OpsGuardia`, `CpqCargo`, `CpqRol`, `CpqRolCargoSalary`, `CpqPuestoTrabajo`, `OpsPuestoOperativo`, `PayrollSalaryStructure`, `PayrollSalaryStructureBono`, `PayrollBonoCatalog`, `Documento`, `DocumentoEnlace`, `DocumentoTexto`, `DocumentFolder`, `TipoDocumento`, `InstallationDocRequirement`, `OpsDocumentoPersona`, `Document`, `DocSignatureRequest`, `DocSignatureRecipient`, `Notification`, `NotificationPreference`, `TenantAiProvider`), `src/lib/payroll/resolve-salary.ts`, `src/lib/persona-encryption.ts`, `src/lib/chile-rut.ts`.
**Propósito:** reglas y campos verificados para construir los maestros del núcleo de 2.0 (Brief 02) sin reescribir desde memoria. Lo no verificado se marca.

## 1. Cuentas (`crm.accounts`)

| Hecho en 1.0 | Para 2.0 |
|---|---|
| Ciclo de vida canónico `status`: `prospect` → `client_active` → `client_inactive` (`type` e `isActive` son legado derivado) | `estado`: `prospecto` \| `cliente_activo` \| `cliente_inactivo`. Un solo campo |
| `name` (comercial), `legalName` (razón social), `rut`, `giro` (actividad SII, distinto de `industry` = segmento interno), `industry`, `size`, `segment`, `source` (origen del prospecto), `website`, `address`, `commune`, `city`, `notes`, `logoUrl`, `startDate`/`endDate` | Se conservan en el núcleo: nombre, razón social, RUT (normalizado y validado, único por tenant), giro, origen, sitio web, dirección estructurada, notas, `cliente_desde`/`cliente_hasta`. Logo como documento vinculado |
| Representantes legales como tabla (`nombre`, `rut`, `email`) y personería (`fechaEscritura`, `tipoEscritura`, `notaria`) | Igual: `cuenta_representantes` y columnas de personería en la cuenta (los usan Documentos y contratos) |
| Facturación y cobro: `contactoEstadoPagoId`, `contactoCobranzaId`, `layoutDocumentoCobro`, `numeroOrdenContrato`, `cesionNotificarDeudor`, `hesRefMode` | Faceta de **Finanzas** (fase 5), no del núcleo |
| `useAsReference` (cartera en propuestas) | Faceta de **CPQ** (fase 2) |
| `portalConfig`, `portalEjecutivoId`, `portalTourShown`, `portalSecurityPolicyEnabled` | Faceta del **Portal Cliente** (fase 3) |
| `ownerId` (ejecutivo) | Faceta de **Comercial** (fase 2) |

## 2. Contactos (`crm.contacts`)

- Pertenecen a una cuenta (obligatoria). Campos: `firstName`, `lastName`, `email`, `phone`, `roleTitle`, `isPrimary`.
- Flags por tipo de comunicación: `recibeFacturacion`, `recibeNotasCredito`, `recibeCobranza`, `recibeOperacional`, `recibeCesion` (Ley 19.983, falla segura: sin marcado nadie recibe).
- Acceso al portal: PIN bcrypt, contraseña, magic token 48 h, bloqueo 15 min tras intentos, `googleId`, historial de contraseñas.

**Para 2.0:** núcleo con nombres, apellidos, email (minúsculas, único por cuenta), teléfono normalizado, cargo, `es_principal` (uno por cuenta) y `roles` (`comercial`, `operacional`, `facturacion`, `cobranza`; `cesion` lo agrega Finanzas). Todo lo de acceso al portal es faceta del Portal Cliente (fase 3).

## 3. Instalaciones (`crm.installations`)

| Hecho en 1.0 | Para 2.0 |
|---|---|
| `accountId` nullable y `leadId` (instalación de un lead sin cuenta) | `cuenta_id` obligatoria: un prospecto es una cuenta en estado `prospecto` |
| `status`: `prospect` \| `active` \| `inactive` (`isActive` derivado por trigger) | `estado`: `prospecto` \| `activa` \| `inactiva` |
| `name`, `address`, `city`, `commune`, `region`, `lat`/`lng` (Float), `notes`, `startDate`/`endDate` | Igual, con dirección estructurada + formateada + `place_id`, coordenadas `Decimal(10,7)`, vigencia |
| `geoRadiusM` por defecto 1000 m (tolerancia de marcación; GPS es evidencia, no bloquea) | `geocerca_m` por instalación, por defecto 1000 |
| `marcacionCode` (8 caracteres, URL/QR) y `pairingCode` | Facetas de **Asistencia** (fase 4) y **Terreno** (fase 3) |
| `teMontoClp`, `maxRondaDurationMinutes`, `nocturnoEnabled`, `chatEnabled`, `publicReport*`, `metadata` (dotación sugerida) | Facetas de Operaciones y Rondas; `chat` y `publicReport` no se portan |
| `activatedByDealId` | Faceta de **Comercial** |

## 4. Personas (`ops.personas` + `ops.guardias`)

En 1.0 la persona está partida en dos modelos: `OpsPersona` (identidad y datos RRHH) y `OpsGuardia` (todo lo operativo, de acceso, DT y ATS), más `laborClass` (`OPERATIVO` costo / `ADMINISTRATIVO` gasto), `cargoStaff` para el equipo interno y `adminId` (usuario ERP 1:1).

**Identidad y contacto (OpsPersona):** `firstName`, `lastName`, `rut` (nullable, índice), `email`, `personalEmail` (obligatorio por Res. 38 para el comprobante), `phone`, `phoneMobile`, dirección con `googlePlaceId`, `addressFormatted`, `commune`, `city`, `region`, `lat`/`lng`, `birthDate`, `sex`, `nacionalidad`, `status` (`active` \| `inactive`).
**Previsión (OpsPersona, cifrados AES con clave de plataforma: `afp`, `healthSystem`, `isapreName`):** AFP, sistema de salud, isapre y % extra, régimen previsional, tipo de pensión, jubilado, cotiza AFP/AFC/salud.
**Tallas de uniforme, estatura, peso (OpsPersona).**
**Guardia (OpsGuardia):** `code` único por tenant, `status`, `lifecycleStatus` (`postulante` → `seleccionado` → `contratado` → `inactivo`), `hiredAt`, `terminatedAt`, `terminationReason`, lista negra (`isBlacklisted`, motivo, fecha), `availableExtraShifts`, PIN de marcación (bcrypt, historial, bloqueo), Face ID (AWS, consentimiento), `currentInstallationId`, instalación prevista, anticipos, `salaryStructureId`, OS-10 y vencimiento, contrato (`contractType` `plazo_fijo` \| `indefinido`, periodos 1–3, `contractBecameIndefinidoAt`, `contractAlertDaysBefore` 5), DT (`dtResolucionJornada`, vigencia, `tipoJornada`, `maxHorasSemanales` 42, `isArticulo22`), ATS y turnos extra (evaluación, uniforme).

**Para 2.0 (ADR del arranque: "Persona única; el tipo es atributo del contrato o cargo"):**

1. `core.personas`: identidad, contacto, dirección estructurada, nacimiento, sexo, nacionalidad, `estado` (`activa` \| `inactiva`), `bloqueada` con motivo (lista negra), `usuario_id` 1:1 opcional. RUT obligatorio y único por tenant.
2. `core.vinculos_laborales`: la relación laboral vigente (cargo, tipo de contrato, inicio, término, motivo), uno vigente por persona. Reemplaza `lifecycleStatus`, `hiredAt/terminatedAt` y `contractType`.
3. Previsión, cuentas bancarias, anticipos y tallas: facetas de **Nómina** (fase 6) y Operaciones; no entran al núcleo.
4. PIN, Face ID, código de marcación, DT y jornada: facetas de **Asistencia** y **Portales** (fases 3 y 4).
5. ATS y evaluación de turnos extra: backlog.

## 5. Cargos, roles de turno y puestos

- `cpq.cargos` (`CpqCargo`): `name` único por tenant, `description`, `colorHex`, `active`, `salarySensitive` (si es true, el sueldo solo lo ve quien tiene `view_sensitive_salary`).
- `cpq.roles` (`CpqRol`): **patrón de turno** (`patternWork` / `patternOff`, por ejemplo 4×4) con `salary` sugerido; `CpqRolCargoSalary` cruza rol × cargo con `salaryDay` / `salaryNight`.
- `cpq.puestos_trabajo` (`CpqPuestoTrabajo`): tipo de puesto (portería, CCTV…).
- `ops.puestos_operativos` (`OpsPuestoOperativo`): puesto en una instalación: `name`, `cargoId`, `rolId`, `puestoTrabajoId`, `shiftStart`/`shiftEnd`, `weekdays[]`, `requiredGuards`, `baseSalary`, `teMontoClp`, `salaryStructureId`, `active`, `activeFrom`/`activeUntil`.

**Para 2.0:** `core.cargos` (nombre único, descripción, clase `operativo` \| `administrativo`, `sueldo_sensible`, activo, orden; catálogo por vertical) y `core.puestos` (puesto de servicio en una instalación: cargo, nombre, patrón de turno `dias_trabajo`/`dias_descanso`, horario `[inicio, fin)`, jornada `dia` \| `noche` \| `rotativa`, dotación requerida, vigencia, estado). El patrón de turno deja de ser una entidad aparte: va en el puesto. El "tipo de puesto" no se porta (es el nombre del puesto).

## 6. Estructuras de sueldo (`payroll.salary_structures`)

- `sourceType`: `PUESTO` \| `GUARDIA_RUT` \| `PERSONA`; `sourceId`.
- Campos: `baseSalary`, `colacion`, `movilizacion`, `gratificationType` (`AUTO_25` \| `CUSTOM` + `gratificationCustomAmount`), `netSalaryEstimate`, `isActive`, `effectiveFrom`/`effectiveUntil`, `createdBy`.
- Bonos desde catálogo (`PayrollBonoCatalog`: `FIJO` \| `PORCENTUAL` \| `CONDICIONAL`, imponible, tributable, monto/porcentaje por defecto) con override por estructura.
- **Resolución** (`resolve-salary.ts`): override por RUT del guardia > estructura del puesto asignado > nada. Los montos son `Decimal(12,2)` en 1.0.

**Para 2.0 (ADR-005):** tres niveles `cargo` → `puesto` → `persona`, resolución `persona → puesto → cargo` en `packages/domain`; CLP en enteros; gratificación `legal_25` (con tope 4,75 IMM/12, parámetro) \| `monto_fijo` \| `ninguna`; ítems de bono `fijo` \| `porcentual` con imponible/tributable; vigencia obligatoria sin solapes; el nivel persona exige motivo y queda auditado. El bono condicional (asistencia perfecta, rondas) es de Nómina.

> **Actualizado el 25-oct-2026 (ADR-036, decisión de Carlos):** las capas pasan a ser instalación (por defecto), puesto y sueldo por RUT; cada asignación usa una sola capa, la más específica que exista, sin combinar conceptos entre capas. El cargo deja de ser capa de sueldo y el «grupo de sueldo» queda fuera de la v1.

## 7. Documentos

Tres sistemas conviven en 1.0:

1. **`Documento` (`crm.files`) + `DocumentoEnlace` (`crm.file_links`)**: el "documento unificado": `fileName`, `mimeType`, `size`, `storageProvider`/`storageKey` (R2), `contentHash` (SHA-256, dedupe por tenant), `portalVisible`, procedencia (correo, Drive), tipo (`tipoId`), `issuedAt`/`expiresAt`, `status`, validación, **escalera de hitos de vencimiento** (`lastExpiryMilestone`, por defecto `[30,14,7,3,1,0]`, "en trámite" hasta fecha, "ya no aplica" con motivo), `needsClassification`/`needsAttention`; enlace polimórfico `entityType`/`entityId` con `role` `owner` \| `reference` y carpeta por entidad (`DocumentFolder` jerárquica, `portalVisible`); `DocumentoTexto` con texto extraído para IA.
2. **`OpsDocumentoPersona`**: documentos de guardia (legado, mismo esquema de vigencia).
3. **`docs.documents` (`Document`)**: documentos **generados** desde plantillas (Tiptap JSON con tokens), `module`/`category`, estados `draft → review → approved → active → expiring → expired → renewed`, PDF, firma (`DocSignatureRequest` secuencial o paralela; `DocSignatureRecipient` `signer` \| `cc`, métodos `typed` \| `drawn` \| `uploaded` \| `stamped`, IP y user agent, token público de vista).

**`TipoDocumento` (`ops.tipos_doc_operacional`)**: `codigo` único por tenant, `nombre`, `capa` (`global` \| `instalacion` \| `guardia` \| `cuenta` \| `negocio`), `obligatorio`, `tieneVencimiento`, `diasAlerta` 30, `normativa` ("D.S. 93 Art. 13"), `criticoLegal` (T-7/T-1 con tarjeta individual), `portalVisibleDefault`, `milestones`; `InstallationDocRequirement` exige tipos extra por instalación.

**Para 2.0 (ADR-019):** un solo servicio `core.documentos` con el modelo del punto 1 (archivo, hash, tipo, vigencia, versión, vínculos polimórficos `propietario` \| `referencia`, visibilidad por portal), tipos por capa (`empresa`, `cuenta`, `instalacion`, `persona`, `puesto`) y escalera de vencimiento configurable. El punto 3 (generados, plantillas, firma) es el módulo Documentos (fase 2, tras Comercial). Requisitos por instalación: con Operaciones (fase 3). No se portan: procedencia de Gmail/Drive, carpetas jerárquicas (la carpeta es la entidad).

## 8. Notificaciones, preferencias e IA

- `Notification` (por tenant, con `type`, `title`, `message`, `link`) + `NotificationReadState` por usuario; `NotificationPreference` por suscriptor con JSON `{bell, email, push}` por clave y horas de silencio; `PushOutbox` agrupa ráfagas por `groupKey`. Resultado: ≈1.000 notificaciones diarias (ADR-020 lo corrige con silencio por defecto).
- `TenantAiProvider` (proveedor por tenant con `apiKey` en texto) y `TenantAiModel` (`costTier`, `isDefault`); `AiUsageLog` por llamada. 2.0 reemplaza esto por el catálogo de integraciones con secretos cifrados, clases de tarea y medidor de consumos (ADR-027, ADR-031).

## 9. Utilidades que se reescriben en `packages/domain`

- RUT (`chile-rut.ts`): `cleanRut`, `formatRut` (`16.234.567-8`), `isValidRut` (módulo 11), `toSiiRut` (sin puntos, con guion). 2.0: `normalizarRut` (forma canónica `16234567-8`), `formatearRut`, `rutValido`, `digitoVerificador`, con tests.
- Fechas en zona de Chile (`dates-cl.ts`): 2.0 guarda `timestamptz` y presenta con la zona del tenant.

## 10. Lo que no se porta

Contactos y guardias con credenciales dentro del maestro (van a los portales), carpetas jerárquicas de documentos, procedencia Gmail/Drive, chat por instalación, reporte QR público, ATS, gamificación, tallas y anticipos en el núcleo, `Setting` key-value sin tipo.
