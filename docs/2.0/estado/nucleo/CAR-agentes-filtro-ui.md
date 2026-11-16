# [Sesión Cursor Cloud] Agentes: filtro de keys y tarjetas de acceso

**Rama:** `cursor/agentes-filtro-keys-ui-db21`

## Qué entró

- Lista de API keys: por defecto solo activas; selector Activas / Revocadas e inválidas / Todas con conteos (`?estado=`).
- Sustitución de enlaces subrayados por filas `FilaSeleccionable` hacia Conectar tu IA y Eventos salientes.
- Prueba unitaria `apps/web/test/agentes-filtro-keys.test.ts`; ajuste e2e de configuración-acceso y preview de marcas.

## Pendiente

- Integración a `main` cuando el CI esté en verde.
- `preview-e2e` con etiqueta `e2e` si Carlos pide capturas formales del layout nuevo (el spec `@preview` ya cubre la lista).

## Decisiones

- Filtro en pantalla sobre el listado existente (`core.apikeys.list`), sin cambiar la capacidad ni el modelo: decisión reversible y suficiente para el volumen actual (hasta 100 keys por página).