# Export reporteria-dt v2 (Claude Design)

Diseño de **Asistencia · Reportería DT y portal de fiscalización** (CAR-89, Briefs 18–19): los reportes obligatorios de la Res. Ex. N.º 38 de la Dirección del Trabajo, la verificación por hash, correcciones y oposición del trabajador, contingencia e incidentes, el portal de fiscalización, la auditoría de accesos del fiscalizador, los accesos de mandante y EST, respaldos y retención, y el checklist de certificación.

**Origen:** Claude Design, con el Design System de OPAI 2.0 V2 (los `.dc.html` referencian el bundle `_ds/opai-2-0-design-system-v2-…`, que no se incluye en este export — ver «Qué no se copió»).

**Versión:** v2. **Aprobado por Carlos el 30-10-2026 a las 21:19 CLT.**

Reemplaza al export v1 del PR #164, que queda tal cual en su propia carpeta (`docs/2.0/diseño/export-reporteria-dt/`); este export vive en una carpeta aparte y no lo modifica.

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). Los `.dc.html` existen solo para comparar la implementación con el diseño aprobado.

## Qué no se copió

- `_ds/` — el bundle del Design System con el que se renderizan los `.dc.html` en Claude Design. No se incluye porque trae datos reales de la cuenta de diseño; los tokens y componentes que importa están en `packages/ds` (`main`).
- `uploads/` — el prompt de origen y adjuntos de la sesión de diseño, con datos reales de la cuenta. No se incluyen.

Para ver el export renderizado hay que abrirlo en Claude Design (o reconstruir `_ds/` localmente); en el repo queda solo como referencia de texto y estructura.

## Pantallas

- `Indice.dc.html` — índice de las pantallas, con los roles que ve cada una.
- `01 Reportes DT.dc.html` — los 6 reportes obligatorios + Art. 26 + Verificar por hash, y «Documentación laboral y previsional» (enlaza a Nómina). Ve: owner, admin, RRHH · supervisor (sus instalaciones).
- `02 Reporte de asistencia.dc.html` — reporte de asistencia en detalle, con marcas corregidas. Ve: owner, admin, RRHH · supervisor · mandante (sus instalaciones) · fiscalizador.
- `03 Verificar por hash.dc.html` — verificación de una marcación por su hash. Ve: pública (cualquiera con el comprobante) · ERP.
- `04 Correcciones y oposicion.dc.html` — correcciones de marcas, cuenta regresiva de 48 h y vista del trabajador para aceptar u objetar. Ve: owner, admin, RRHH · supervisor (propone) · trabajador (acepta u objeta).
- `05 Contingencia e incidentes.dc.html` — marcas de contingencia e incidentes técnicos. Ve: owner, admin, RRHH.
- `06 Portal de fiscalizacion.dc.html` — ingreso del fiscalizador DT (correo @dt.gob.cl), búsqueda por RUT del empleador y registros sin restricción de rango. Ve: Fiscalizador DT, solo lectura, ruta propia sin el shell del ERP.
- `07 Auditoria fiscalizador.dc.html` — auditoría de los accesos del fiscalizador (fecha, correo, RUT consultado, IP, qué vio). Ve: owner, admin · Inspector DT (solo lectura).
- `08 Accesos de mandante y EST.dc.html` — dar o revocar acceso de mandantes y empresas de servicios transitorios. Ve: owner, admin, RRHH.
- `09 Respaldos y retencion.dc.html` — exportaciones con manifiesto y hash, retención de 5 años, verificación diaria de la cadena. Ve: owner, admin.
- `10 Checklist certificacion.dc.html` — los 33 requisitos de la Res. 38 con su estado y evidencia. Ve: solo owner.
- `Hoja de componentes.dc.html` — componentes del DS usados en este export, con las piezas nuevas propuestas (`CuentaRegresiva`, `Hash`, `CabeceraOficial`, `LeyendaSiglas`, `Titular`, `SyncHora`).
- `P01-Reportes.dc.html` … `P10-Certificacion.dc.html`, `Verificador-Hash.dc.html` y `Hoja-Panel.dc.html` — componentes fuente que importan las pantallas anteriores (uno por pantalla, más el verificador de hash y el panel de ejemplos de componentes).
- `adt.js` — datos de ejemplo, navegación y configuración de pantallas compartidos entre los `.dc.html` de este export.
- `support.js` — runtime genérico de Claude Design (`dc-runtime`) que interpreta los `.dc.html`.

Cada pantalla trae sus artboards en 1280, 1024 y 375 px, en claro y oscuro, con los estados vacío, cargando, error y sin permiso.

## Fuera de alcance de este diseño

- Marcación del guardia, PIN y Face ID (Terreno/Asistencia).
- LRE, contratos y finiquito en Mi DT (Nómina · Cumplimiento DT).
- Trámite con el tercero certificador.

## Pendientes para la construcción

1. En `Hoja-Panel.dc.html`, el ejemplo del componente `Forbidden` decía «Pídele acceso a» y el nombre real del dueño del proyecto; **ya se corrigió en este export** a «Pídele acceso a un administrador», igual que en el resto de las pantallas (`P01-Reportes.dc.html`, `P03-Hash.dc.html`, `P04-Correcciones.dc.html`, `P05-Contingencia.dc.html`, `P07-Auditoria.dc.html`, `P08-Mandantes.dc.html`, `P09-Respaldos.dc.html`, `P10-Certificacion.dc.html`).
2. Revisar la escala de gravedad (hoy `Severidad` en incidentes y contingencia usa «Total» / «Parcial»; ver `05 Contingencia e incidentes.dc.html` y `P05-Contingencia.dc.html`).

## Hallazgo menor (no bloquea)

- En `P08-Mandantes.dc.html`, dos entradas del historial («Timeline») tienen `who: "Marcela Rojas"` pero `initials: "CI"` (no coincide con «MR»); es un residuo de un cambio de nombre anterior en el archivo de origen, no algo introducido en esta copia.
