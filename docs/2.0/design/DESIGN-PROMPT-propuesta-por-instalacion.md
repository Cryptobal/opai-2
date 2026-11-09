# Design Prompt · Propuesta técnica por instalación (CAR-138)

**Estado:** preparado para revisión de Carlos; **no aprobado**. Lo prepara «Comercial · Code» (actualizado el 9-nov-2026, tras el OK de Carlos a preparar los diseños, P4). No hay pantallas construidas ni se construirán hasta el diseño aprobado de Claude Design, la revisión visual (A2.10) y la autorización de ejecución (P5). Contrato técnico ya integrado: [`BRIEF-CAR-138`](../briefs/BRIEF-CAR-138-propuesta-por-instalacion.md) (#387 catálogo, #399 `core.campos.*`, #405 congelado al enviar); el contexto comercial (#408) está propuesto.

**Regla: reutiliza lo aprobado y dibuja solo las ampliaciones.** Está aprobado CPQ v3/v4 (con envío y compartir). El **armador de propuesta técnica (CAR-144) está construido, pero no tiene export aprobado en el repo**: parte de su pantalla real en el preview, no de un export, y dibuja solo lo que cambia.

## Decisiones de Carlos que este diseño respeta (no se vuelven a preguntar)
- **Un solo PDF técnico** con portada, **índice numerado** (P2, 9-nov) y un **capítulo por instalación** (7-nov).
- **IA por sección** (7-nov): ve el contexto **confirmado e inferido, siempre etiquetados**; un humano confirma; una inferencia no es un acuerdo; la economía y la dotación vienen del CPQ, nunca de la IA.
- **Referencias de clientes:** solo cuentas **activas del mismo tenant**, con **opt-in explícito de nombre y logo**; **solo gerencia o admin** lo marcan (P3, 9-nov). Sin contactos, facturación ni contratos.
- **Importar HTML:** sanitizado y versionado por empresa; **dos diseños** de partida y editor de contenido, no un importador universal.
- **Gard y otras empresas:** nada de datos reales; el ejemplo es «Atlas Seguridad SpA».

```
Diseña con el Design System OPAI 2.0 V2 (nunca el estilo de 1.0). Mobile e iPad primero: 375, 1024 y 1280 px. Touch targets ≥ 44 px, foco visible, contraste AA, claro y oscuro. Datos ficticios.

Contexto: CPQ genera la propuesta técnica en PDF que se envía al cliente junto con la cotización. Ya existen la biblioteca de bloques, el armador y la plantilla por empresa. Se agrega: (1) un capítulo por instalación en una sola propuesta, (2) texto asistido por IA por sección, (3) contexto comercial del negocio, (4) referencias de clientes, (5) un prompt exportable y (6) importar una plantilla HTML. Todo valor del documento viene del catálogo único de campos ({{cuenta.nombre}}, {{#cada instalaciones}}…); los montos solo de la cotización. Muestra lo existente en gris y dibuja SOLO lo nuevo.

1. Armador › capítulos por instalación (extiende el armador actual). Lista: «Portada», «Índice» (numerado, se arma solo), «Presentación», «Propuesta técnica» y un capítulo por instalación de la cotización (nombre, comuna, N.º de puestos), que se puede incluir/excluir y reordenar. Cada capítulo de instalación muestra: dirección exacta con enlace a Maps, comprensión del servicio, alcance y exclusiones, puestos y guardias (dotación), turnos, protocolos, equipos, supervisión, reportes y arranque, y la economía de esa instalación (viene del CPQ). Lo que falte y se pueda verificar aparece como «Falta: [dato]» con acción para completarlo; nunca se inventa. Lo editado a mano lleva «Editado» y nunca se sobrescribe. Vista previa del PDF con el índice numerado.
2. Editor de sección (hoja). Texto con tokens como chips (campos del catálogo, con ejemplo al pasar el cursor; uno no permitido en propuesta, como el RUT del cliente, se marca en línea con el motivo). «Sugerir con IA» propone un borrador junto al texto actual (comparar, no reemplazar) y muestra fuentes usadas, qué datos faltaron y qué viene de contexto «Confirmado» o «Inferido». Acciones: Aceptar, Pedir otra versión, Descartar. Aceptar una sección no toca las demás ni lo escrito a mano. Estados: sin conexión a la IA (se sigue editando a mano), generando, error, sin permiso.
3. Contexto comercial del negocio (pestaña en la ficha del negocio). Notas con tipo (reunión, llamada, correo, visita, documento, nota), resumen, fuente y fecha de la fuente, y el estado «Confirmado» o «Inferido». Una persona puede registrar una nota como confirmada o inferida; lo que registra un agente queda siempre inferido hasta que una persona lo confirma («Confirmar»). Archivar en vez de borrar. Aviso fijo: «El contexto alimenta los textos; no se envía al cliente tal cual». Estados: vacío con acción, cargando, error, sin permiso.
4. Referencias de clientes. Solo gerencia o admin ven y usan el interruptor «Autoriza usarse como referencia» (nombre y logo), con quién lo autorizó y cuándo; los demás ven la lista sin el interruptor. En el armador, selector de referencias autorizadas filtrado por rubro o comuna; sin autorizadas, estado vacío con explicación. Revocar la autorización la quita de las propuestas nuevas, no de las ya enviadas.
5. Prompt exportable. Pantalla de solo lectura que genera, desde el catálogo vigente, el prompt para usar en otra IA (campos por finalidad, sintaxis, reglas «no inventar montos» y «dejar faltantes») con ejemplos ficticios, botón Copiar y la versión del catálogo. Nunca incluye datos de clientes.
6. Importar plantilla HTML. Elegir uno de los dos diseños de partida o cargar un archivo; vista previa saneada; lista de lo que se eliminó o no se admite (scripts, estilos o recursos remotos, formularios, rastreadores); tokens detectados con su validación; versión por empresa y «Activar». Si hay problemas no se puede activar. Una plantilla larga se previsualiza con tablas y saltos de página.
7. Confirmar envío (extiende el paso de envío aprobado). Resumen de lo que viaja al cliente (capítulos, instalaciones, referencias), los datos faltantes sin resolver como bloqueo, y «Se congelará el contrato de campos (versión N)».

Estados de cada pantalla: cargando (skeleton con la forma), vacío con acción, error, sin permiso.
Entrega: una pantalla por archivo con capturas a 375/1024/1280 en claro y oscuro, microcopy en español neutro y una lista de componentes nuevos que falten al DS.
```

## Propuestas de diseño que Carlos puede cambiar (no bloquean el prompt)
1. **La pantalla 3 (contexto) vive como pestaña de la ficha del negocio**, no como pantalla aparte.
2. **El índice numerado se arma solo** a partir de los capítulos incluidos; no se edita a mano.

## Orden de construcción (backend primero, sin pantallas)
PR 4 contexto comercial (#408) → PR 5 IA por sección → PR 6 capítulo en servidor y PDF (con índice numerado) → PR 7 referencias → PR 8 prompt exportable → PR 9 HTML. Las pantallas de arriba se construyen solo con diseño aprobado y autorización de ejecución.
