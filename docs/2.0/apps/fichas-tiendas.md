# Fichas de tiendas · app «OPAI»

**Estado:** borrador listo para revisar. **No se ha publicado nada.**
**Ticket:** CAR-90 (Brief 17) · **Decisión:** CAR-495, Carlos, 14-nov-2026 15:34: en las tiendas se publica solo «OPAI»; «OPAI Terreno» no se publica.
**Sesión:** Sesión Apps.

Una sola app para todos los perfiles. Al entrar, cada persona cae en su portal según su acceso: ERP, Supervisor, Trabajador, Cliente o Terreno (equipo emparejado). Los textos describen lo que ya existe en OPAI 2.0. Si cambia el alcance antes de publicar, se ajustan aquí.

## Datos comunes

| Campo | Valor |
|---|---|
| Nombre | OPAI |
| Identificador | `cl.opai.app` (Android e iOS) |
| Categoría | Empresa / Business |
| Idioma principal | Español (Chile) |
| Precio | Gratis; el acceso lo da la empresa que contrata OPAI |
| Anuncios | No |
| Público | Adultos (uso laboral) |
| Sitio | https://opai.cl |
| Correo de soporte | **Falta:** lo define Carlos |
| Política de privacidad (URL pública) | Borrador en `borrador-politica-privacidad.md`, **por aprobar por Carlos**. No se publica sin su OK. Ambas tiendas la exigen |

## Google Play

**Nombre (máx. 30):** OPAI

**Descripción breve (máx. 80):**
> Turnos, rondas y operación de tu empresa en terreno, desde el celular.

**Descripción completa (máx. 4.000):**
> OPAI es la plataforma de operación para empresas con personal en terreno: seguridad, aseo, mantenimiento y servicios.
>
> Con una sola app, cada persona entra a lo suyo:
>
> • Trabajadores: ven sus turnos publicados, reciben avisos cuando cambian y revisan sus datos.
> • Supervisores: siguen las instalaciones a su cargo y lo que pasa en el día.
> • Equipos de terreno: hacen rondas con marcación de puntos por código QR, registran novedades y controlan la portería, incluso con mala señal.
> • Clientes: revisan los servicios y documentos de sus instalaciones.
> • Administración: comercial, cotizaciones, personas, documentos y finanzas en el mismo lugar.
>
> El acceso lo entrega tu empresa. Si no tienes usuario, pídeselo a tu administrador.

**Acceso para la revisión:** Google pide credenciales de prueba. Se usa una cuenta de una empresa ficticia, nunca de Gard. **Falta:** que la Sesión Núcleo cree un usuario revisor sin segundo factor obligatorio, o con instrucciones para el código.

**Seguridad de los datos (formulario):**

| Dato | Se recoge | Para qué | Se comparte |
|---|---|---|---|
| Nombre y correo | Sí | Cuenta e ingreso | No |
| Ubicación precisa | Sí, solo al marcar un punto de ronda o en terreno, nunca en segundo plano | Evidencia de la marca | No |
| Fotos | Sí, solo si la persona adjunta una | Evidencia de rondas y novedades | No |
| Actividad en la app | Sí | Auditoría y seguridad | No |

Todo viaja cifrado (HTTPS). La persona puede pedir acceso, corrección o eliminación de sus datos a su empresa (derechos ARCO, Ley 21.719).

**Clasificación de contenido:** sin contenido sensible (cuestionario IARC: app de negocios, sin interacción entre usuarios desconocidos ni compras).

## App Store

**Nombre (máx. 30):** OPAI

**Subtítulo (máx. 30):** Gestión de equipos en terreno

**Texto promocional (máx. 170):**
> Turnos, rondas y operación de tu empresa en un solo lugar. Cada persona entra directo a lo suyo.

**Descripción:** la misma de Google Play.

**Palabras clave (máx. 100):** `turnos,rondas,guardias,seguridad,aseo,terreno,supervisor,pauta,novedades,portería,operaciones`

**Clasificación por edad:** 4+ (sin contenido objetable).

**Privacidad de la app (etiquetas):** los mismos datos de la tabla de Google Play. «Vinculados a la identidad»: nombre, correo y actividad. «No se usan para rastreo.»

**Notas para la revisión:** cuenta de prueba de la empresa ficticia (igual que en Google). OPAI es una app de negocio: el acceso lo da la empresa.

## Capturas

| Tienda | Tamaño | Mínimo |
|---|---|---|
| Google Play | Teléfono, entre 320 y 3.840 px por lado | 2 (recomendado 4 a 8) |
| App Store | iPhone 6,9" (1320 × 2868) | 3 |

Se toman con la empresa ficticia `qa-e2e` (nunca Gard ni datos reales): entrada, Inicio del Trabajador con turnos, ronda en curso, Supervisor y Cliente. Ícono y pantalla de carga: el logo actual de OPAI (decisión de Carlos, 14-nov-2026).

## Antes de publicar (lista)

1. Política de privacidad: aprobar el borrador (Carlos) y luego publicarla como página pública.
2. Correo de soporte (Carlos).
3. ~~Íconos de la app~~: listos con el logo actual de OPAI.
4. Usuario revisor en una empresa ficticia (Sesión Núcleo).
5. Push nativo: Firebase lo gestiona el asistente de Carlos. Apple espera el pago de Apple Developer. Sin push nativo, el riesgo de rechazo en iOS es alto (guía 4.2).
6. Cuentas de Google Play Console y App Store Connect, y llaves de firma en 1Password (Carlos).
7. Versión de producción: `OPAI_APP_ENTORNO=produccion`, que abre `app.opai.cl`.
