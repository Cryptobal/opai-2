# Auditoría de cierre · 05 · Instalación

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 04, 05 y 16) · **Foto:** `main` en `886e262` · Solo lectura: no se cambió código, datos ni tickets.

**Avance real: 67 %** (Linear marca 100 %: sus 2 tickets están en Done).

Método: el mismo de [`asistencia.md`](asistencia.md#cómo-se-calculó-igual-en-los-tres-informes-de-esta-tanda) (alcance 70 %, estándares 15 %, pruebas 15 %). La instalación es una entidad del núcleo con pestañas que aportan los módulos; aquí se mide la ficha y la lista completas, no solo los dos tickets del proyecto.

Instalación: alcance 20,5 / 30 = 68 %; estándares 4,5 / 6 = 75 %; pruebas 50 %. Total: 0,7 × 68 + 0,15 × 75 + 0,15 × 50 = **67 %**.

## Lo más importante

1. **Las e2e de los dos tickets del proyecto están en rojo en la corrida nocturna del 16-nov** (`puestos-titular-car206` no ve «Historial de titulares»; `puestos-trasladar-car207` no ve el aviso «Su serie en … se cierra»). El 15-nov CAR-206 pasó y CAR-207 pasó al reintento. Los textos siguen en el código (`seccion-titular.tsx:66`, `hoja-trasladar.tsx:108`), así que la causa no está verificada: puede ser una regresión del 15 al 16-nov o datos de la prueba.
2. **La pestaña de personas de la ficha está siempre deshabilitada** con el texto «Disponible con Operaciones» (`ficha-instalacion.tsx`), aunque Pauta y Puestos ya existen. En 1.0 «Dotación › Guardias» es de uso diario.
3. **La lista muestra solo las primeras 100 instalaciones** (`datos.ts` pide `limite: 100` y descarta `siguiente`), y el filtro de región ofrece 9 de las 16 regiones de Chile.

## 1. Tickets contra PR

| Ticket | Estado Linear | PR | ¿En `main`? | ¿El código hace lo que pide? |
|---|---|---|---|---|
| CAR-206 · Asignar titular desde la ficha de la instalación | Done (6-nov) | #358 (Fixes), #402 aceptación | Sí | Sí: `pauta.titular.asignar` con vista previa, serie desde «Rige desde» e historial. **e2e en rojo el 16-nov.** |
| CAR-207 · Trasladar guardia de instalación | Done (6-nov) | #363 (Fixes), #371 arreglo visual, #402 aceptación | Sí | Sí: `pauta.titular.trasladar` cierra vínculo y serie y abre los nuevos en una acción auditada. **e2e en rojo el 16-nov e intermitente el 15-nov.** |

Sin PR cerrados sin integrar ni reversiones en `(erp)/instalaciones`. El proyecto no tiene tickets abiertos, pero la ficha tiene trabajo abierto en otros proyectos:

| Ticket | Proyecto | Estado | PR |
|---|---|---|---|
| CAR-84 · Ticket con instalación (pantalla) | 06 Operaciones | In Progress | #868 abierto (servidor ya integrado en #821) |
| CAR-83 · Pestaña «Visitas» | 06 Operaciones | In Progress | #871 abierto |
| CAR-238 · Inventario entregado a la instalación | 07 Inventario | In Progress | #839 abierto |
| CAR-536 · Campos personalizados en la ficha | 20 Núcleo | In Progress | #926 abierto |
| CAR-479, CAR-553, CAR-567 · Acceso por instalación | 09 Acceso | In Progress | #917, #934, #944, #950 abiertos |
| CAR-541 · Mapa de puntos de Rondas | — | — | #933 abierto |
| CAR-473 · Pestaña Central | 17 Central | Backlog | — |
| CAR-550 · Ficha al patrón único | 21 Diseño | Backlog | — |
| CAR-557 · Pestañas cortadas, sigla PPC, lista sin Vistas | 21 Diseño | Backlog | — |

## 2. Alcance contra 1.0

Fuente 1.0: `crm/installations` y `CrmInstallationDetailClient.tsx` (pestañas Resumen, Dotación, Operación, Documentos, Cliente, Historial, según `installation-detail-tabs.ts`) y `portal/supervisor/instalaciones/[id]/*`.

| # | Qué hace 1.0 | En 2.0 | Detalle |
|---|---|---|---|
| 1 | Lista con búsqueda y filtros | Parcial | Búsqueda en servidor y filtros de cuenta, estado y región; sin paginación más allá de 100; regiones incompletas; filtro de cuentas también con tope de 100 |
| 2 | Crear con dirección y geocerca | Está | `/instalaciones/nueva`, autocompletado `core.geo.autocompletar` |
| 3 | Editar, activar o desactivar, archivar (1.0: eliminar) | Está | Menú ⋯ |
| 4 | Mapa con ubicación y geocerca | Está | `MapaOpai` en Resumen |
| 5 | Cuenta del cliente | Está | Enlace en la cabecera |
| 6 | Contactos de la instalación | Falta | Ni la ficha ni `InstalacionDetalle` traen contactos |
| 7 | Puestos: crear, editar, desactivar | Está | Pestaña Puestos (1.0 además duplicaba) |
| 8 | Asignar titular con historial | Está | CAR-206 |
| 9 | Trasladar guardia | Está | CAR-207 |
| 10 | Dotación: guardias vigentes, vacantes | Falta | Pestaña deshabilitada |
| 11 | Refuerzos | Parcial | Existen en la Pauta, no en la ficha |
| 12 | Sueldo por instalación | Está | Pestaña Sueldo (capas) |
| 13 | Supervisores a cargo | Está | CAR-38 |
| 14 | Negocios y cotizaciones | Está | Pestaña Negocios (módulo Comercial) |
| 15 | Rondas | Está | Pestaña Rondas |
| 16 | Accesos | Está | Pestaña Accesos (#840); hay PR abiertos que la amplían |
| 17 | Dispositivos | Está | Pestaña Dispositivos |
| 18 | Documentos, generar documento y firma | Está | Pestaña Documentos y `/generar-documento` |
| 19 | Historial | Está | Pestaña Actividad |
| 20 | Marcaciones de la instalación | Falta | Asistencia no aporta pestaña |
| 21 | Libro de novedades e incidentes | Falta | No hay pestaña; el libro está en Terreno |
| 22 | Tickets de la instalación | Parcial | Servidor integrado (#821); pantalla en #868 |
| 23 | Visitas de supervisión | Falta | #871 abierto |
| 24 | Informes y cumplimiento | Parcial | Informe por instalación en Pauta (CAR-330), no en la ficha |
| 25 | Finanzas de la instalación | Parcial | Rentabilidad por instalación en Finanzas (CAR-174), no en la ficha |
| 26 | Uniformes, inventario y teléfonos | Falta | #839 abierto |
| 27 | «Ver como cliente» y reporte al cliente | Parcial | Portal Cliente parcial; #827 y #833 abiertos |
| 28 | Ficha en el portal Supervisor (hoy, guardias, libro, rondas, solicitudes) | Parcial | Solo datos y puestos |
| 29 | Aparece en el buscador general | Está | `core.buscar` |
| 30 | Alcance del supervisor por instalación | Está | ADR-022, en la consulta |

No se portan por decisión (backlog): protocolo y exámenes (Conocimiento), cámaras, encuestas, chat de instalación.

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Lista y ficha (CAR-545) | Parcial | Vista dividida y `DetailScreen` sí; «Editar» solo en ⋯, pestañas cortadas a 1280 y 427 px (CAR-550 y CAR-557, en Backlog) |
| Paginación y búsqueda reales | Parcial | Búsqueda real; paginación no (tope de 100) |
| Sin duplicados (CAR-580) | Sí | Una sola pantalla de instalación; aliases declarados |
| Sin textos internos (CAR-579) | Parcial | «Disponible con Operaciones» en una pestaña que nunca se habilita, aunque el tenant tenga Operaciones |
| Permisos por rol | Sí | `core:instalaciones.*`; las pestañas de módulo se muestran solo con módulo activo y permiso |
| MCP para todo lo de pantalla | Sí | `core.instalaciones.*`, `core.puestos.*`, `core.dispositivos.*`, `pauta.titular.*` |

## 4. Pruebas

| Flujo | Pruebas | Estado |
|---|---|---|
| Lista, alcance y consultas | `instalaciones-consultas-db`, `maestros-instalaciones`, `comercial-instalaciones-alcance`, `capa-instalacion` | Verde |
| Asignar titular | `puestos-titular-car206.spec.ts` | Rojo el 16-nov |
| Trasladar | `puestos-trasladar-car207.spec.ts` | Rojo el 16-nov; intermitente el 15-nov |
| Ficha en celular apaisado | `ficha-apaisado.spec.ts` | Rojo el 15 y 16-nov |
| Accesos, generar documento, pauta por instalación | specs `@preview` | Verde en `preview-e2e` del 16-nov |
| Crear y editar instalación, archivar con puestos activos | — | Sin e2e |

## 5. Tickets propuestos (por impacto en la operación)

| # | Título | Qué hacer | Listo cuando | Prioridad |
|---|---|---|---|---|
| I1 | e2e rojos de Puestos y de la ficha | Revisar por qué fallan CAR-206, CAR-207 y `ficha-apaisado` desde el 15-16 nov; arreglar la regresión o la prueba | Tres noches seguidas en verde | Alta |
| I2 | Pestaña de personas en la ficha | Mostrar las personas vigentes por puesto (titular, reemplazos, vacantes) desde Pauta y vínculos; quitar «Disponible con Operaciones» | Con Pauta activa la pestaña se habilita; sin Pauta se oculta (no se deshabilita con texto); e2e a 375 y 1280 | Alta |
| I3 | Lista con paginación y regiones completas | Usar `siguiente` («Cargar más» o desplazamiento), filtro de cuentas buscable y las 16 regiones desde un catálogo del núcleo | Con más de 100 instalaciones se ven todas; prueba con 150 | Media |
| I4 | Contactos de la instalación | Vincular contactos de la cuenta como contacto en sitio, con rol | Se ven y editan en Resumen; capacidad con MCP | Media |
| I5 | Pestañas de Asistencia y Novedades | Que Asistencia y el libro de novedades aporten su pestaña, como Rondas y Accesos | Pestaña visible solo con módulo activo y permiso | Media |
| I6 | Ficha del supervisor | Llevar al portal Supervisor el día de la instalación: turnos, presentes, rondas y novedades | Supervisor de prueba lo ve a 375 px | Baja |
| I7 | Finanzas en la ficha | Enlazar la rentabilidad por instalación (CAR-174) y el gasto rendido (Rendiciones) | Tarjeta en Resumen con enlace al informe | Baja |

No se proponen tickets para el patrón de ficha ni para pestañas cortadas: ya están en CAR-550 y CAR-557.

## Tickets creados (16-nov)

I1 CAR-595 · I2 CAR-596 · I3 CAR-607 · I4 CAR-608 · I5 CAR-609 · I6 CAR-610 (proyecto 11 Portales) · I7 CAR-611. Transversal: CAR-624 (listas que descartan `siguiente`, proyecto 22).
