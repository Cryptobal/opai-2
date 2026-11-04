# DESIGN PROMPT — Rendiciones: módulo completo, interactivo y vendible por separado (OPAI 2.0)

> **Estado:** listo para pegar en Claude Design (lo hace Carlos). Redactado por Claude (Sesión 2) el 4-nov-2026 por encargo de Carlos: «un diseño interactivo, muy completo, antes de seguir con el módulo».
>
> **Relación con v2:** el export `docs/2.0/diseño/export-rendiciones/` (8 pantallas, v2) **sigue vigente** como base visual. Este prompt lo **amplía**: portal Supervisor, kilometraje configurable por empresa, permisos visibles por rol, estados con y sin Finanzas y la **ficha comercial del módulo en Plataforma** (activar, probar, cobrar). Donde no diga lo contrario, se conserva v2.
>
> **Decisiones de Carlos ya incorporadas:** Rendiciones se vende sola (ADR-048) y **se factura y cobra aparte**: Carlos la activa o desactiva por empresa desde Plataforma (4-nov-2026). Un nivel de aprobación con aprobador asignado; el solicitante nunca aprueba ni paga lo suyo. «Pagada» se marca al confirmar el lote de pago. Kilometraje configurable por empresa (por consumo, por tarifa por km o monto fijo por tramo). Centros de costo = instalaciones activas + «Administración / Oficina central». Cuenta de destino desde la Ficha de persona, copiada al lote.

Pegar completo en Claude Design, **en el mismo proyecto del export v2 de Rendiciones**, con el **Design System de OPAI 2.0 V2** (`packages/ds/src/tokens.css`, `docs/2.0/design/export-ds-2.0/`). Nunca el estilo de 1.0. Empresa de ejemplo: «Atlas Seguridad SpA», nunca Gard.

Resultado esperado: export HTML standalone, **una pantalla por archivo**, capturas por pantalla y viewport, y **un prototipo navegable** (`FlujoCompletoRendiciones.dc.html`) que enlace todas las pantallas en el orden de la sección 2, con datos de ejemplo que cambian de estado al tocar (enviar, aprobar, devolver, pagar).

**Viewports:** 375, 1024 y 1280 en todas las pantallas; modo oscuro en Mis rendiciones, Nueva rendición (compra) y la hoja de aprobar, a 375.

## 1. Principios y estados obligatorios

- **Mobile first de verdad:** quien rinde está en terreno con una mano y el teléfono. Foto de la boleta como primer gesto; el monto y el folio se escriben con teclado numérico; sin tablas en 375 (hojas y tarjetas).
- Todas las pantallas con los cuatro estados: **cargando** (skeleton con la forma real), **vacío** (con la acción), **error** (con reintento) y **sin permiso** (explica qué permiso falta y a quién pedirlo).
- Dinero en CLP entero con separador de miles; fechas en zona de la empresa; códigos `REN-n` por empresa.
- Textos por el diccionario de la vertical (supervisor, guardia, instalación); en el export, vocabulario de seguridad.
- Pulido: foco visible, objetivos táctiles ≥ 44 px, transiciones de 150–200 ms con `prefers-reduced-motion`, contraste AA, safe-area iOS.

## 2. Recorrido del prototipo (en este orden)

1. **Plataforma › Empresa › Módulos › Rendiciones** (Carlos activa en modo prueba) → ver §5.
2. **Configuración › Módulos › Rendiciones** (administrador de la empresa) → pantalla 08 de v2, ampliada en §4.
3. **Portal Supervisor › Más › Rendiciones › Mis rendiciones** (§3.1).
4. **Nueva rendición de compra** desde el teléfono: foto de la boleta → monto, fecha, folio, proveedor, centro de costo → **aviso de boleta duplicada** → «Enviar» (§3.2).
5. **Nueva rendición de kilometraje** (§3.3) con el cálculo según el método de la empresa.
6. **Bandeja del aprobador** (gerente) → detalle → Aprobar / Devolver con motivo / Rechazar (pantallas 04 y 05 de v2, con la hoja de decisión en 375).
7. **Lotes de pago** (tesorería) → crear lote con cuentas copiadas de la Ficha → aviso «Sin datos bancarios en la ficha» → confirmar lote → las rendiciones pasan a **Pagada** → archivo de nómina Santander (06 de v2).
8. **Reporte** con filtros y exportación a Excel (07 de v2).
9. **Plataforma › Uso del módulo** (§5.3).

## 3. Pantallas nuevas o ampliadas (usuario que rinde)

### 3.1 Mis rendiciones (portal Supervisor y ERP)
- En el **portal Supervisor** la entrada es «Rendiciones» dentro de **Más** (barra inferior; Supervisor tiene Hoy · Instalaciones · Personas · Más). En el ERP, bajo el área que corresponda según `NAVEGACION.md`.
- Pestañas por ruta: **Borradores · Enviadas · Devueltas · Aprobadas · Pagadas**, con contador. Tarjeta por rendición: código, motivo corto, total, estado (tag), fecha y quién la revisa.
- Botón principal flotante «Nueva rendición» (compra / kilometraje). Estado vacío: «Aún no has rendido gastos» con el botón.
- Una **devuelta** muestra el motivo del aprobador arriba y el botón «Corregir y reenviar».

### 3.2 Nueva rendición de compra (hoja a pantalla completa en 375)
- Paso 1: **Foto de la boleta** (cámara o galería) con vista previa y quitar. Si no tiene boleta: interruptor «No tengo boleta» → obliga a escribir el motivo (se puede apagar por empresa).
- Paso 2: monto, fecha (no futura), folio, proveedor, descripción, centro de costo (instalaciones a cargo + «Administración / Oficina central»), aprobador (por defecto el de la empresa; el solicitante no puede elegirse).
- Varios gastos en una misma rendición: lista de gastos con total corriente abajo.
- **Aviso de duplicado** (no bloquea): «Esta boleta ya fue rendida en REN-12» solo si la persona puede ver esa rendición.
- Acciones: **Guardar borrador**, **Enviar a aprobación** (con confirmación que muestra aprobador y total). Vista previa antes de enviar.

### 3.3 Nueva rendición de kilometraje
- Origen y destino (instalaciones o dirección), **ruta calculada** (distancia), ida y vuelta, peaje opcional con foto.
- Muestra **cómo se calculó** según el método de la empresa: *por consumo* (litros × precio del litro + recargo), *por tarifa por km* (km × tarifa) o *monto fijo por tramo*. Siempre el desglose, nunca solo el total.
- Si la empresa no configuró el método: estado «Tu empresa aún no configura el kilometraje» con aviso al administrador.

## 4. Configuración del módulo (administrador de la empresa)
Pantalla 08 de v2 ampliada, mobile first: **Aprobación** (aprobador por defecto como **selector de personas**, no código), **Respaldo** (exigir boleta; motivo si falta), **Kilometraje** (método y variables: rendimiento km/l, precio del litro, recargo %, tarifa por km, tramos), **Centros de costo** (solo lectura: instalaciones activas + Administración), **Pagos** (cuenta de origen del lote, formato de nómina Santander) y **Avisos** (qué eventos comunican por correo, silencio por defecto). Cada cambio muestra «Quién lo cambió y cuándo».

## 5. Plataforma: Rendiciones como producto (solo Carlos y el equipo de plataforma)

### 5.1 Ficha del módulo en una empresa (Plataforma › Empresas › Módulos)
- Fila «Rendiciones» con **estado**: Prueba (con días restantes) · Activo · Suspendido, y un **interruptor** de activar/desactivar con confirmación que explica qué pasa al apagar (se ocultan menú, pantallas y herramientas MCP; **los datos se conservan**).
- **Condiciones comerciales** de la empresa: precio mensual, moneda, inicio del cobro, fin de la prueba, descuento y nota interna.
- Dependencias: «Funciona sola; con Finanzas suma conciliación del pago».

### 5.2 Catálogo de módulos y precios (Plataforma › Módulos)
Lista de módulos vendibles con precio de lista, qué incluye y cuántas empresas lo tienen activo. Rendiciones aparece como producto independiente.

### 5.3 Uso y cobro (Plataforma › Empresa › Uso)
Por mes: usuarios que rindieron, rendiciones creadas y pagadas, monto rendido, y el **cargo del módulo del mes** listo para facturar (estado: pendiente / facturado / pagado). La emisión de la factura la hace la sesión de Facturación; aquí solo se muestra el cargo.

## 6. Permisos visibles (por rol)

| Rol | Ve y usa |
|---|---|
| Supervisor | Mis rendiciones, Nueva (compra y km). No ve la bandeja del aprobador, el reporte ni la configuración |
| Gerente / Admin / Owner | Todo lo anterior, Bandeja del aprobador, Detalle de cualquier rendición, Lotes de pago, Reporte y Configuración |
| Viewer | Sin acceso al módulo (pantalla «sin permiso») |

Mostrar en el prototipo un **selector de rol** para ver cómo cambia el menú, y la pantalla «sin permiso» con el texto: «Para aprobar rendiciones necesitas el permiso Aprobar. Pídeselo a tu administrador». **El solicitante nunca ve los botones de aprobar o pagar sobre lo suyo**, aunque tenga el permiso.

## 7. Con y sin Finanzas
Dos variantes del Lote de pago y del Detalle: **sin Finanzas** (solo estado y comprobante del lote) y **con Finanzas** (aparece «Conciliado con el movimiento del banco»). Nada del módulo se rompe si Finanzas está apagado.

## 8. Lista de archivos a entregar
`01 Mis rendiciones` · `02 Nueva rendicion compra` · `03 Nueva rendicion kilometraje` · `04 Bandeja del aprobador` · `05 Detalle de rendicion` · `06 Lotes de pago` · `07 Reporte` · `08 Configuracion rendiciones` · `09 Plataforma ficha del modulo` · `10 Plataforma catalogo y uso` · `11 Sin permiso y estados` · `FlujoCompletoRendiciones` (prototipo) · `Índice`.

## 9. Fuera de alcance de este diseño
Extracción de la boleta por IA, rendir desde el portal del guardia (sin usuario), anticipos y descuento por liquidación, asiento contable (Contabilidad C1) y la emisión de la factura del cargo del módulo (sesión de Facturación).
