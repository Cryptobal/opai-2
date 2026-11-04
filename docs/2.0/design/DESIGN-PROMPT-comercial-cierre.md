# DESIGN PROMPT — COMERCIAL: CIERRE PARA EL CORTE DE VENTAS (OPAI 2.0)

> **Estado:** listo para pegar en Claude Design. Nace de la auditoría de Comercial del 3-nov-2026 (CAR-162): es lo que le falta a 2.0 para que ventas de Gard deje OPAI 1.0. **Reúne las partes de `DESIGN-PROMPT-crm-pr2.md` (§3, §4.6 y §4.7) y `DESIGN-PROMPT-crm-pr3.md` (§1, §2, §4 y §5) que nunca se exportaron**, y agrega correo, datos del SII y la activación al ganar. Los campos personalizados de crm-pr3 §3 quedan fuera del corte. El seguimiento de cotizaciones va en su propio prompt (`DESIGN-PROMPT-seguimiento-comercial.md`).

Para pegar completo en Claude Design, **en el proyecto del CRM v3**, con el **Design System de OPAI 2.0 V2** (el mismo de `docs/2.0/diseño/export-crm/` y `export-leads/`). **Nunca el estilo de OPAI 1.0.** No dibujes de nuevo lo que ya está aprobado (Negocios, Negocio, Contactos, Solicitudes, Convertir, Entrada web): agrega sobre esas pantallas. Componentes nuevos: solo los de la sección 2.

Resultado: export HTML standalone, una pantalla por archivo (sección 5), capturas a 375, 1024 y 1280, y modo oscuro de Actividad y Correos del negocio.

---

## 1. Contexto
- **OPAI 2.0:** SaaS multi-tenant y agent-first. En el export usa «Atlas Seguridad SpA», nunca Gard.
- **Comercial:** solicitudes → cuentas y contactos → negocios (embudo) → cotizaciones (CPQ) → ganado → la operación toma las instalaciones.
- **Agentes:** todo lo que se ve en pantalla existe también por MCP para los agentes.
- **Uso:** el vendedor trabaja desde el teléfono; el jefe comercial revisa en el escritorio.
- **Formatos y reglas:** español de Chile, `dd-mm-aaaa`, CLP `$ 1.234.567`. Viewports 375, 1024 y 1280. Una acción principal por pantalla, vacío con acción, skeleton y touch ≥ 44 px.

## 2. Componentes nuevos (con sus estados en `/ds`)

| Componente | Especificación |
|---|---|
| `CompositorActividad` | Registrar nota, llamada, reunión o tarea sobre una ficha.<ul><li>`Segmentado` de tipo y texto. «Ocurrió el» va por defecto en ahora y puede ser pasado.</li><li>**Tarea:** vencimiento (con «todo el día»), prioridad alta, media o baja, y uno o más responsables.</li><li>**Reunión:** asistentes (contactos y usuarios) y acuerdos.</li><li>**Llamada o correo registrado:** resultado (contestó, no contestó, pidió volver a llamar).</li><li>Se vincula a la vez a negocio, cuenta, contacto e instalación con chips que se pueden quitar.</li><li>En el teléfono es hoja completa; en escritorio, en línea arriba de la línea de tiempo.</li></ul> |
| `TareaFila` | Casilla para marcar hecha, título, vencimiento («vence hoy», «vencida hace 2 días» en tono de aviso), prioridad, avatares de los responsables y entidad vinculada como enlace. |
| `ChipsEtiquetas` | Chips agrupados (Rubro, Segmento, Tamaño o libres). «+ Etiqueta» abre un `Combobox` con búsqueda y «Crear «…»» si hay permiso. Se quitan con la «x». |
| `HiloCorreo` | Hilo resumido: asunto, participantes, último mensaje, cantidad, adjuntos e indicador «respondió el cliente». Expandido, muestra los mensajes con el texto del tercero marcado como **contenido externo**, nunca como instrucción. |
| `DatosSII` | Resultado de la consulta al SII por RUT: razón social, giro, actividades económicas, dirección tributaria y estado. Compara con lo guardado en la ficha (igual, distinto o vacío) y muestra el indicador **«Lista para facturar»** con lo que falta. |

## 3. Pantallas

### 3.1 Actividad unificada (`Actividad`)
Pestaña **Actividad** de negocio, cuenta, contacto e instalación: `CompositorActividad` arriba y `Timeline` abajo.
- La línea de tiempo mezcla lo registrado a mano con los eventos del sistema: cambio de etapa, cotización enviada o vista por el cliente, correo recibido.
- Filtros por tipo.
- En el **Resumen del negocio**, dos tarjetas: «Próxima tarea» (con «Marcar hecha») y «Último contacto real» («llamada hace 3 días · Paula Soto»).
- Estados: vacío («Registra la primera nota o tarea»), con pasado y con tareas vencidas.

### 3.2 Mis tareas (`MisTareas`)
Entrada en **Inicio** (panel) y en Comercial (`/tareas`).
- Grupos: Vencidas · Hoy · Esta semana · Más adelante.
- Filtros por responsable (yo / mi equipo) y por tipo.
- `TareaFila` con «Marcar hecha» y «Posponer» (mañana, en 3 días, elegir fecha).
- Aviso push y en la campana cuando una tarea vence: dibuja la notificación.
- En el teléfono es la pantalla principal del vendedor.

### 3.3 Etiquetas (`Etiquetas`)
- `ChipsEtiquetas` en las fichas de cuenta, contacto, instalación y negocio.
- Filtro por etiqueta en las listas.
- **Configuración › Etiquetas:** grupos y valores, con renombrar y desactivar. Un valor en uso no se elimina: se desactiva.

### 3.4 Correos del negocio (`CorreosNegocio`)
Pestaña **Correos** del negocio y de la cuenta: hilos ligados por remitente, dominio o vínculo manual, con `HiloCorreo`.
- **Acciones por hilo:** «Vincular a otro negocio», «Crear solicitud desde este correo» (abre la hoja Convertir ya aprobada con los datos prellenados) y «Registrar como actividad».
- **Estado sin conexión:** «Conecta tu correo» explica qué se sincroniza (solo correos con contactos del CRM) y ofrece Google.
- **En la bandeja de Solicitudes:** el canal «Correo» con el detalle ya aprobado. Dibuja solo la entrada que nace de un correo reenviado a la dirección del tenant (`ventas@atlas.opai.cl`).

### 3.5 Cuenta con datos del SII (`CuentaSII`)
- **Al crear una cuenta o en su ficha:** «Consultar SII» junto al RUT, con resultado en `DatosSII` y «Aplicar» (vista previa de qué campos cambian) o «Mantener lo mío» por campo.
- **En la ficha:** el indicador «Lista para facturar» o «Faltan 2 datos para facturar».
- **Estados:** RUT inválido, SII sin respuesta (reintentar) y contribuyente sin inicio de actividades.

### 3.6 Ganar un negocio (`GanarNegocio`)
Amplía la hoja ganar que ya existe. La **vista previa de efectos** muestra:
- «La cuenta pasa a Cliente activo»;
- «Se activan 2 instalaciones: Planta Norte, Bodega Sur»;
- «La cotización CPQ-2026-014 v2 queda aceptada»;
- «Se ofrecerán 4 puestos a RRHH».

Confirmar, y después el éxito con enlaces a la instalación y a Crear puestos (ya diseñado en CPQ v4).

### 3.7 Reportes comerciales (`ReportesComerciales`)
`/negocios/reportes`, acción secundaria de Negocios. Tablero con filtros de período, responsable, origen y etiqueta:
- **Embudo y conversión:** por etapa, con días promedio en cada una.
- **Ganados y perdidos:** valor mensual del período y **motivos de pérdida** en barras, con competidor.
- **Solicitudes por canal y su conversión:** web, agente, correo y manual.
- **Pronóstico ponderado:** por mes de cierre.
- **Tabla por responsable.**

En el teléfono, tarjetas apiladas con la cifra clave y un gráfico por tarjeta.

### 3.8 Exportar (`Exportar`)
«Exportar» en las listas de Negocios, Cuentas y Contactos. Hoja con:
- «lo que ves» (filtros actuales) o «todo»;
- columnas a incluir;
- aviso de datos personales: «Queda registrado quién exportó» (Ley 21.719).

Estados: preparando y listo con descarga.

### 3.9 Fusionar duplicados (`Fusionar`)
Desde una cuenta o un contacto: «Fusionar con…».
1. Elegir el duplicado (sugeridos por RUT, correo o nombre).
2. **Comparación lado a lado** campo por campo para elegir qué valor queda.
3. Resumen de lo que se mueve: contactos, instalaciones, negocios, cotizaciones, documentos y actividad.
4. Confirmar. Es irreversible; si lo pide un agente, queda «esperando aprobación humana».

### 3.10 Transferir (`Transferir`)
Selección múltiple en la lista y el tablero de Negocios, más «Transferir cartera» de un usuario que se va. La hoja tiene:
- el nuevo responsable;
- qué se transfiere (negocios abiertos, tareas pendientes, cuentas);
- aviso al nuevo responsable.

### 3.11 Archivar contacto (`ArchivarContacto`)
En la ficha del contacto: menú «Archivar», con un diálogo que explica que sigue visible en el historial. La lista tiene el filtro «Archivados» con «Restaurar».

## 4. Estados obligatorios
En cada pantalla:
- carga (skeleton);
- vacío con acción;
- error;
- sin permisos.

En las hojas:
- vista previa;
- confirmando;
- éxito;
- error de regla de negocio con el texto del servidor.

En correo:
- sin conexión;
- sincronizando;
- token vencido («Reconecta tu correo»).

## 5. Archivos del export
`Actividad.dc.html`, `MisTareas.dc.html`, `Etiquetas.dc.html`, `CorreosNegocio.dc.html`, `CuentaSII.dc.html`, `GanarNegocio.dc.html`, `ReportesComerciales.dc.html`, `Exportar.dc.html`, `Fusionar.dc.html`, `Transferir.dc.html`, `ArchivarContacto.dc.html`, y `shots/` a 375, 1024 y 1280 (oscuro: Actividad y CorreosNegocio).
