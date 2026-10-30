# Integración de OPAI 2.0 con la Dirección del Trabajo (DT): investigación
Fecha: 29-oct-2026. Solo fuentes públicas. Nada se escribió en ningún sistema ni se contactó a nadie.

## Resumen y recomendación
1. La DT **no publica una API abierta y documentada para empleadores ni para software** de remuneraciones. Su propia FAQ del LRE (última modificación 31-05-2023) dice que la carga es por archivo CSV/TXT o por formulario en Mi DT, y que la API es una «próxima evolución».
2. El único web service público que se encontró, `sccnlpservices.dirtrab.cl/RelacionLaboral.asmx` (SOAP, `registrarContratos`), usa usuario y clave y lleva el campo `idPuerto`. Probablemente es del sistema de trabajadores portuarios. **No está confirmado** que sirva para contratos generales.
3. Nubox y Rex+ anuncian «integración directa con Mi DT» y Talana tiene una «extensión Mi DT» para altas, bajas y anexos. **Ninguno publica cómo funciona**, sea con un convenio o API privada de la DT o automatizando el portal. Eso no está confirmado.
4. Siempre se autentica una persona natural con ClaveÚnica: el empleador o un **representante laboral electrónico** que designa la empresa. Para el finiquito, además, el **trabajador** acepta con su propia ClaveÚnica.
5. El registro de asistencia es el único trámite con certificación formal (Res. Ex. N°38 de 2024). La certifica una empresa privada independiente, la DT autoriza el sistema, la autorización dura 2 años y la DT publica un listado.
6. **Qué integrar primero:** (a) generar el **LRE** en el formato oficial y validarlo antes de cargarlo, porque es un archivo con formato público, se carga cada mes y lo usan todos los tenants; (b) generar el archivo o los datos de **altas, bajas y anexos** listos para Mi DT; (c) preparar los datos de la **propuesta de finiquito**. El usuario del tenant firma y envía en Mi DT. Ese paso no se automatiza.
7. **Qué no automatizar:** el inicio de sesión con ClaveÚnica a nombre de otra persona. Guardar la ClaveÚnica del representante para robotizar el portal tiene riesgo legal y de seguridad, porque la ClaveÚnica es personal. No lo recomiendo.
8. **Cómo cobrarlo:** como complemento «Cumplimiento DT» del módulo Nómina, **por trabajador con un mínimo mensual** por tenant (decidido en [ADR-057](../01-decisiones.md); estructura de precios en ADR-058). Si la DT abre una API o se firma un convenio, el envío directo entra como nivel superior.
9. **Asistencia certificada:** la certificación es opcional y cara, pero diferencia a OPAI. En seguridad privada hay turnos y control de jornada, así que vale una evaluación aparte. Mientras tanto, OPAI puede exportar la asistencia sin presentarse como sistema autorizado.
10. Siguiente paso sugerido, si Carlos lo aprueba: preguntar a la DT por el canal oficial (Consultas o Transparencia) si existe un convenio o API para software de remuneraciones.

## Tabla por trámite
| Trámite | Mecanismo hoy | Requisito / autenticación | ¿Automatizable desde OPAI? |
|---|---|---|---|
| Registro de contratos y anexos (Ley 21.327, art. 9 CT, plazo de 15 días) | Portal Mi DT, con formulario o contrato electrónico (CLE). La carga masiva no está confirmada. WS SOAP `RelacionLaboral`, probablemente portuario (no confirmado). | Empleador o representante laboral electrónico con ClaveÚnica | **Parcial**: OPAI prepara los datos con los campos que pide la DT (ver la lista de Talana) y el usuario los ingresa o carga. El envío directo solo con un convenio (no confirmado). |
| Libro de Remuneraciones Electrónico (LRE) | Carga mensual de un **CSV/TXT** con `;`, headers fijos y nombre `rutempleador_aaaamm`, o formulario en pantalla. API anunciada como futura. | Representante laboral electrónico con ClaveÚnica. No pide certificación del software. | **Sí, la generación del archivo y su validación. Parcial, el envío**, que hace el usuario |
| Finiquito electrónico | El empleador crea la propuesta en Mi DT, autoriza la revisión de Previred y firma. El trabajador acepta, acepta con reserva o rechaza con su ClaveÚnica. El pago va vía TGR. Rex+ anuncia una carga por CSV (próximamente). | Empleador y trabajador, cada uno con su ClaveÚnica. La alternativa presencial es ante la Inspección, un notario u otro ministro de fe. | **Parcial**: OPAI calcula, prepara los datos y hace el seguimiento. La firma y la aceptación ocurren en Mi DT. |
| Cartas de aviso de término | Existe la comunicación de término en Mi DT (Rex+ ofrece «Términos de contrato»). La carta debe indicar si el finiquito será electrónico o presencial (art. 162 CT). No confirmé si hay carga masiva. | Empleador o representante con ClaveÚnica | **Parcial**: OPAI genera la carta y los datos. El registro se hace en el portal. |
| Registro de jornada y asistencia | Sistema electrónico propio que cumpla la Res. Ex. N°38 (26-04-2024). | Certificación de una empresa privada independiente y luego autorización de la DT, que dura 2 años. Se autoriza el sistema, no el empleador. | **Sí**, pero solo para llamarlo sistema autorizado. Exige certificación y autorización, con costo y plazo. |
| Registro Electrónico Laboral (REL) | Es el paraguas de Mi DT (LRE, contratos, etc.) y se usa por el portal. | Persona jurídica: entra con la clave del SII y designa representantes laborales electrónicos. | **No** de forma directa. Es un portal. |

## Detalle por pregunta
- **(a) API, archivo o portal:** el LRE se carga por archivo (formato público en el Manual y el Suplemento LRE). El resto se hace en el portal Mi DT. No se encontró una API pública de empleadores. El back-end usa 3scale con SSO y token, según la política de datos del LRE, pero eso no es un acceso para terceros. El sitio certificados.cl dice que existe una «API Mi DT» con JWT, pero no da una fuente oficial: **no confirmado, no confiable**.
- **(b) Certificación o convenio:** solo la asistencia requiere certificación y autorización. Para el LRE y los contratos no se exige certificar el software. La DT dice que «ha trabajado con empresas de software». No se encontró un convenio público.
- **(c) Quién se autentica:** el empleador, o en una persona jurídica los representantes laborales electrónicos con su ClaveÚnica. El trabajador lo hace en el finiquito.
- **(d) Proveedores:** Buk genera y descarga el LRE en CSV/TXT y el cliente lo sube. Talana configura el LRE y envía altas, bajas y anexos con la «extensión Mi DT», cuyo mecanismo no está publicado. Nubox anuncia envío directo del LRE y los contratos con reintentos «si MiDT falla», con mecanismo no publicado. Rex+ anuncia el envío del LRE, contratos y términos, más finiquitos por CSV «próximamente», y se cotiza aparte, o sea que **lo cobran como extra**. Defontana no se revisó a fondo y no está confirmado.
- **(e) Realista:** se puede generar y validar el LRE, preparar contratos, anexos, finiquitos y cartas, llevar el seguimiento de plazos (15 días para el contrato, el pago del finiquito en 5 días hábiles), guardar los comprobantes que suba el usuario y certificar la asistencia a mediano plazo. No es realista la firma o aceptación a nombre de personas ni el uso de la ClaveÚnica de terceros.

## Fuentes
- DT, FAQ sobre la API del LRE: https://www.dt.gob.cl/portal/1628/w3-article-120083.html
- DT, trámite LRE: https://dt.gob.cl/portal/1626/w3-article-119843.html
- DT, requisitos del archivo LRE: https://www.dt.gob.cl/consultas/1613/w3-article-119853.html
- DT, política de datos del LRE: https://static-content.api.dirtrab.cl/dt-docs/lre/lre_politicas_proteccion_datos_personales.pdf
- DT, WS RelacionLaboral: https://sccnlpservices.dirtrab.cl/Servicios/RelacionLaboral.asmx?op=registrarContratos
- DT, ratificación del finiquito: https://www.dt.gob.cl/portal/1626/w3-article-117245.html
- DT, manual del finiquito electrónico: https://www.dt.gob.cl/portal/1626/articles-117005_archivo_01.pdf
- DT, sistemas de asistencia autorizados (Res. Ex. 38): https://www.dt.gob.cl/1601/w3-article-124477.html
- DT, ORD. 796 y ORD. 737 (certificación): https://www.dt.gob.cl/legislacion/1624/w3-article-127049.html y https://www.dt.gob.cl/legislacion/1624/w3-article-128557.html
- Buk, LRE: https://supportcenter.buk.cl/hc/es-419/articles/36496150873883
- Talana, extensión Mi DT: https://ayuda.talana.com/hc/es-419/articles/47228664242963
- Talana, LRE: https://ayuda.talana.com/hc/es-419/articles/7499193947411
- Nubox: https://www.nubox.com/software-remuneraciones/direccion-del-trabajo
- Rex+: https://rexmas.com/conexion-dt/
- Firmavirtual, finiquito en Mi DT (secundaria): https://firmavirtual.legal/blog/servicios-notariales-digitales/finiquito-laboral-online
