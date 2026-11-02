# Configuración v1.1 · PR-A · navegación, sidebar y celular

Fuente: encargo de Carlos recibido el 1-nov-2026, basado en `/workspace/qa/menus-config-1142/informe.md` v2 y `mockup/notas.md`. Aprobación indicada en el encargo: 1-nov-2026 18:59 CLT. Esta nota registra la implementación y sus límites; no agrega decisiones de negocio.

## Alcance y criterios

| MC | Implementación y verificación |
| --- | --- |
| MC-04 | Sidebar con secciones planas, Bandeja reutilizando la bandeja existente, contador real, iniciales del nombre y Owner presentado como Administrador. Fijados se conserva en todas las rutas del ERP. **Parcial:** no se crean enlaces globales de Rondas ni Resumen de Finanzas: hoy Rondas solo tiene páginas dentro de una instalación y su manifest no declara navegación; Finanzas declara Compras, Plan de cuentas y Flujo. Se conservan los destinos reales y sus filtros de módulo/permisos. |
| MC-16 | Una entrada canónica activa, sin encabezados de acordeón resaltados; iconos distintos para los destinos actuales y espacio inferior de scroll. Los fijados conservan el enlace y no duplican el fondo activo. |
| MC-06 | Cabecera fija Configuración, búsqueda global compacta y Ctrl+K conservado; campana con conteo real cuando hay pendientes. |
| MC-10 | Avatar, nombre y correo una vez; Mi cuenta, Preferencias con pista completa, Portal de inicio conservado al final del bloque principal; separador y salida neutra. Cambio de contraseña accesible dentro de Mi cuenta. Menú alineado al ancho del sidebar. |
| MC-22 | Todas las tarjetas enlazan al grupo en los tres tamaños. |
| MC-01 | EncabezadoGrupo sobre lista y panel, con migas, título y bajada compartidos. No se muestra la alerta B1 porque no hay un destino de propuesta integrado en la app; no se incorpora la variante B1. |
| MC-12 | 404 propio de grupo, ruta solicitada escapada como texto y vuelta a Configuración. El proxy conserva el HTTP 404. |
| MC-03, solo ruta | Agente interno como tercera entrada visible de Agentes cuando está activo/en trial y tiene ajustes y permiso. Nueva ruta `/configuracion/grupo/agentes/agente-interno`; la anterior redirige. Reutiliza el mismo formulario y las capacidades de configuración, sin alterar dryRun ni escrituras. |
| MC-19 | Padre explícito por URL para grupos, entradas actuales, módulos, nueva ruta del agente y Preferencias. Filas móviles con descripción compartida, tarjeta y chevron. |
| MC-13 | Barra Inicio, Pauta y Personas cuando son visibles, Bandeja y Más; sin reemplazos de Comercial. Más deriva del mismo menú y excluye la barra y la cuenta. Portada móvil en una tarjeta. |

## Adaptaciones técnicas de Codex

- El menú plano no guarda automáticamente la apertura del acordeón al navegar: esa escritura heredada invalidaba el layout durante el cambio de ruta. Se conservan las preferencias ya guardadas; la regresión e2e comprueba que navegar no escribe `navegacion_area_abierta`. Adaptación técnica de Codex al menú plano, sin nuevas decisiones de negocio.
- El padre móvil se resuelve con la URL confirmada, para que el enlace no cambie mientras su propia navegación está pendiente.
- Bandeja tiene una ruta de lectura que monta el componente ya existente de Inicio; no agrega consultas ni capacidades de negocio nuevas.
- La ruta del agente se mueve conservando el filtro actual por licencia/esquema/permisos y el formulario actual. No se implementa su formulario de cuatro tarjetas.
- La preferencia previa de área principal se conserva en Preferencias, pero ya no sustituye las pestañas móviles decididas en este encargo. No se eliminan los fijados ni Portal de inicio.
- El inventario de paridad se regenera con el gate; las capacidades siguen en los componentes compartidos que ya las invocaban, por lo que el contenido generado puede permanecer idéntico.

## Pendiente de Carlos y fuera de alcance

Sin enlace de propuesta B1, la alerta opcional de Operación no se muestra. Siguen pendientes el riel colapsado, Portal de inicio, Idioma, Fijados y la ubicación definitiva de Comercial/Clientes/Firmas. No se incorporan decisiones nuevas para esos temas.

MC-02 está retirado. No se rediseñan vistas por rol ni estados cargando/error/sin permiso/buscando. Documentos permanece en Operación. La lista de ocho módulos del mockup no se usa como fixture ni como catálogo hardcodeado.

Toda la parte B queda fuera: MC-07, MC-08, MC-15, MC-18, formulario de MC-03, MC-14, MC-05, MC-17, MC-09, MC-21, MC-11 y MC-20. Los textos de grupo compartidos necesarios para la navegación no implican rediseñar el contenido de esas pantallas. Sin migraciones, cambios de RLS, permisos o topes de JS.

## Verificación de la implementación

Typecheck serial y lint sin errores; 1.786 tests unitarios aprobados; test:db completo aprobado (276 de base, 380 de capacidades con base, 32 de autenticación). Build y presupuesto de JS aprobados sin modificar topes. E2E de los cuatro specs afectados: 39 casos, seis omitidos por tamaño no aplicable; los cinco fallos intermitentes de sesión/carga se repitieron sin Vitest en paralelo y pasaron los cinco. Evidencia final: 36 PNG a 375, 1024 y 1280 en claro/oscuro, más README de reproducción. Autorrevisión de subagente sin bloqueos de seguridad, migraciones o datos; iconos persona/sol comprobados en navegador y en las capturas. No se afirma CI ni despliegue, porque este encargo no abre PR.
