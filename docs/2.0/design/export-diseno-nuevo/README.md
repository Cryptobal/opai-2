# Export «Diseño nuevo» (prototipo completo, CAR-335)

Diseño oficial de OPAI 2.0 desde el 12-nov-2026. Reemplaza al marco «Hilo» (ADR-090) y a la regla de diseñar con Hilo (ADR-102). Lo hizo Claude como prototipo interactivo en la sesión del proyecto y **Carlos lo aprobó el 12-nov-2026 a las 18:27 CLT** en el chat del proyecto «Opai 2.0»: «Ya que pasa a ser este el diseño, suma las 6 ideas extras… crea ya el sistema de diseño y avanzamos con este, con este cambio total». Decisión: [ADR-109](../../01-decisiones.md). Plan: [`BRIEF-CAR-335-diseno-nuevo.md`](../../briefs/BRIEF-CAR-335-diseno-nuevo.md). Tarea: CAR-335.

Prototipo en vivo (privado de Carlos): <https://claude.ai/artifact/DymV6LrNy727k7PtCDjb9b>.

## Referentes

Vercel/Geist (blanco y negro, líneas finas, un solo color de acento), Linear (menú lateral con el agente como sección propia), Stripe (el color solo marca estados), Mercury y Ramp (Inicio como cola de trabajo) y Attio (el agente dentro de la ficha).

## Tableros

| Archivo | Tamaño | Qué es |
|---|---|---|
| `Escritorio.dc.html` | 1440 × 900 | ERP completo y los otros cinco portales |
| `iPad.dc.html` | 1024 × 768 | Lo mismo, con el menú cerrado por defecto |
| `Telefono.dc.html` | 390 × 844 | Lo mismo, con barra inferior (Inicio, Agente, Menú, Yo) |

Los tres comparten una sola lógica; solo cambian el tamaño y la plantilla del teléfono. Los datos son marcadores (`[CUENTA A]`, `[MONTO]`), sin datos reales; el único nombre propio es «Gard Security» como empresa de ejemplo.

## Qué fija este diseño

1. **Color.** Blanco y negro con líneas finas. Un solo color de acento, **el de la empresa** (cada tenant elige el suyo; el sistema ajusta el tono para día y noche). El color restante solo marca estados (bien, aviso, alerta). Fuentes Geist y Geist Mono.
2. **Menú lateral.** Inicio, Bandeja y Agente arriba; después las áreas (Comercial, Operaciones, Personas, Finanzas, Documentos) con ícono y en acordeón (abrir una cierra las otras). Configuración y «Novedades de OPAI» van abajo, fuera de la lista de módulos. Se puede cerrar; cerrado, se asoma al pasar el mouse (o al tocar un ícono) y se vuelve a cerrar al elegir. **Ajuste del 14-nov-2026 (CAR-442, pedido de Carlos: «igual que Linear»):** en escritorio con mouse el ancho se cambia arrastrando el borde (200 a 330 px) y, cerrado, no queda riel. Arriba a la izquierda queda el botón «Mostrar el menú», y el borde izquierdo de la ventana también lo asoma. La tecla «[» lo cierra y lo abre. En pantallas táctiles sigue el riel de íconos.
3. **Barra superior.** Botón de menú, ruta, buscador único («Busca o pídele algo a OPAI», ⌘K) y el tema como ícono. En teléfono el tema vive en «Yo».
4. **Listas.** Todas iguales: título, vista guardada, botón «+ Nuevo» siempre arriba a la derecha, secciones internas como pestañas, filtros, tabla con casillas y barra de acciones sobre la selección. Estados de carga, vacío, sin permiso, error y sin conexión con el mismo estilo.
5. **Ficha.** Se abre a la derecha (58 %), se puede ampliar a pantalla completa y se edita ahí mismo, con líneas en cotizaciones, ventas y compras. «Preguntar a OPAI» responde dentro de la ficha y propone acciones que se aprueban o descartan.
6. **Inicio.** Cola de trabajo (necesita tu atención, actividad, agenda) e indicadores que cada empresa elige desde Indicadores.
7. **Pantallas especiales.** Pauta mensual y flujo de caja como planilla; embudo de negocios; carpetas en Documentos.
8. **Portales.** ERP, Supervisor, Trabajador, Terreno, Cliente y Plataforma con el mismo marco. En Plataforma no va la sección Agente (ADR-055).

## Qué falta diseñar

Acceso (login), formularios largos por pasos, PDF y correos con la marca del tenant, y el detalle de cada módulo cuando le toque su bloque. Se diseñan con este mismo sistema.
