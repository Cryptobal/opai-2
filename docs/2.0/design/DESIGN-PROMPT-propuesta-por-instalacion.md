# Design Prompt · Propuesta técnica por instalación (CAR-138)

**Estado:** propuesta de diseño para revisión; **no aprobado**. Lo prepara «Comercial · Code» (7-nov-2026, autorizado por Carlos). No hay pantallas construidas ni se construirán hasta que el diseño aprobado de Claude Design y la revisión visual (A2.10) existan. Contrato técnico ya integrado: [`BRIEF-CAR-138`](../briefs/BRIEF-CAR-138-propuesta-por-instalacion.md) (#387 catálogo, PR 2 resolvedor `core.campos.*`).

```
Diseña con el Design System OPAI 2.0 V2 (nunca el estilo de 1.0). Mobile e iPad primero: 375, 1024 y 1280 px. Touch targets ≥ 44 px, foco visible, contraste AA, claro y oscuro. Datos ficticios.

Contexto: en OPAI 2.0, CPQ genera una propuesta técnica en PDF que se envía al cliente. Hoy hay biblioteca de bloques, armador y plantilla por empresa (CAR-144). Se agrega: (1) un capítulo por instalación, (2) texto asistido por IA por sección, (3) referencias de clientes que aceptaron aparecer, (4) un prompt exportable, (5) importar una plantilla HTML. Todo valor del documento viene del catálogo único de campos ({{cuenta.nombre}}, {{#cada instalaciones}}…); los montos solo de la cotización: nunca de la IA.

Parte de los diseños aprobados de CPQ (DESIGN-PROMPT-cpq-v4-modulo-completo) y del armador de propuesta existente. Patrones: DetailScreen, FormScreen, hoja lateral (Sheet) y tabs por ruta del DS.

Pantallas:
1. Armador de propuesta · capítulos por instalación. Lista de capítulos: «Presentación», «Propuesta técnica», y un capítulo por cada instalación de la cotización (nombre, comuna, N.º de puestos). Cada instalación se puede incluir/excluir y reordenar. El texto de cada capítulo sale de la plantilla de la empresa, ya con los datos del cliente; lo editado a mano muestra la marca «Editado» y nunca se sobrescribe.
2. Editor de sección (hoja). Texto con tokens como chips (campos del catálogo, con ejemplo al pasar el cursor); botón «Sugerir con IA» que propone un borrador y muestra: fuentes usadas, qué datos faltaron y «Datos confirmados» frente a «Inferido». Acciones: Aceptar, Pedir otra versión, Descartar. Un token inválido o no permitido para propuesta se marca en línea con el motivo.
3. Contexto comercial del negocio (en la ficha del negocio): notas de reuniones y correos con fuente y fecha, cada dato como «Confirmado» o «Inferido», visible solo para quien tiene permiso. Alimenta a la IA; nunca se envía al cliente tal cual.
4. Referencias de clientes. Lista de cuentas activas con interruptor «Autoriza usarse como referencia» (quién lo autorizó y cuándo). En el armador, selector de referencias filtrado por rubro o comuna; sin autorizadas, estado vacío con explicación.
5. Prompt exportable. Pantalla de solo lectura que genera, desde el catálogo vigente, el prompt para usar en otra IA (campos disponibles por finalidad, sintaxis, reglas «no inventar montos» y «dejar faltantes»), con botón Copiar y versión del catálogo.
6. Importar plantilla HTML. Carga de archivo, vista previa saneada, lista de lo que se eliminó o no se admite (scripts, estilos remotos, formularios), tokens detectados con su validación, versión por empresa y botón Activar. Si hay problemas, no se puede activar.
7. Confirmar envío. Resumen de lo que viaja al cliente (capítulos, instalaciones, referencias), faltantes sin resolver y «Se congelará el contrato de campos (versión N)».

Estados de cada pantalla: cargando (skeleton con la forma), vacío con acción, error, sin permiso, y «sin conexión a la IA» (se puede seguir editando a mano).
Entrega: 375/1024/1280 en claro y oscuro, microcopy en español neutro, y una lista de componentes nuevos que falten al DS.
```

## Decisiones de diseño que se piden a Carlos (no bloquean el backend)

1. ¿El capítulo por instalación es parte del PDF único o un PDF por instalación? (propuesta: uno solo, con índice).
2. ¿La IA puede ver el contexto comercial completo del negocio o solo lo marcado «Confirmado»? (propuesta: solo lo confirmado por defecto).
3. ¿Quién autoriza una referencia: el comercial a cargo, o solo gerencia? Se requiere dejar constancia.

## Orden de construcción (backend primero, sin pantallas)

PR 2 resolvedor → PR 3 CPQ consume y congela → PR 4 contexto comercial → PR 5 IA por sección → PR 6 capítulo en servidor/PDF → PR 7 referencias → PR 8 prompt exportable → PR 9 HTML. Las pantallas de arriba se construyen solo con diseño aprobado.
