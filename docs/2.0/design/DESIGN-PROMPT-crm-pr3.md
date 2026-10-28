# DESIGN PROMPT — CRM PR 3: REPORTES, EXPORTACIÓN, CAMPOS PERSONALIZADOS, FUSIONAR Y TRANSFERIR (OPAI 2.0)

Para pegar en Claude Design, en el proyecto del CRM v3 (`09192972-8bd5-4ed8-a86a-3308e220a07b`), **con el Design System de OPAI 2.0 V2**. Mismas reglas, formatos, viewports (375, 1024 y 1280) y estados obligatorios que `DESIGN-PROMPT-crm-pr2.md` §1, §5. Va después del PR 2 (usa etiquetas y actividad). Tarea: CAR-27. Alcance: `docs/2.0/diseño/alcance-crm.md` §2; especificación `docs/2.0/modulos/comercial.md` §3 y §11.

## 1. Reportes comerciales (`/negocios/reportes`, acción secundaria de Negocios)
Tablero (`DashboardScreen`) con filtros de período, responsable, tipo, origen y etiqueta:
- **Embudo y conversión** por etapa (cuántos entran, cuántos avanzan, % de conversión) y **días promedio en cada etapa** (sale del historial de etapas del PR 1).
- **Ganados y perdidos** en el período, con valor mensual; **motivos de pérdida** (barras por motivo, con competidor).
- **Pronóstico** del valor mensual abierto ponderado por probabilidad, por mes de cierre estimado.
- **Por responsable** y **por origen** (tabla ordenable).
En el teléfono: tarjetas apiladas con las cifras clave y un gráfico por tarjeta; el tablero completo es de iPad y escritorio.

## 2. Exportar a Excel
Acción «Exportar» en las listas de Negocios, Cuentas y Contactos: hoja con «lo que ves» (filtros actuales) o «todo», columnas a incluir y aviso de datos personales (Ley 21.719: queda registrado quién exportó). Estado «preparando» y descarga.

## 3. Campos personalizados
**Configuración → Comercial → Campos** (y la misma pieza para cuenta y contacto): lista ordenable de campos con nombre, tipo (texto, número, fecha, lista, sí/no), obligatorio, y en qué entidad aparece. En las fichas aparecen en una sección «Campos de <empresa>» del Resumen y en los formularios de crear/editar.

## 4. Fusionar
Desde una cuenta o un contacto: «Fusionar con…» → elegir el duplicado → **comparación lado a lado** campo por campo para elegir qué valor queda → resumen de lo que se mueve (contactos, instalaciones, negocios, documentos, actividad) → confirmar (irreversible; un agente pide aprobación humana).

## 5. Transferir
Cambiar el responsable de **uno o varios** negocios (selección múltiple en la lista y el tablero) y de las cuentas de un usuario que se va: hoja con el nuevo responsable, qué se transfiere (negocios abiertos, tareas pendientes) y aviso al nuevo responsable.

## 6. Archivos del export
`Reportes.dc.html`, `Exportar.dc.html`, `CamposPersonalizados.dc.html`, `Fusionar.dc.html`, `Transferir.dc.html` y `shots/`.
