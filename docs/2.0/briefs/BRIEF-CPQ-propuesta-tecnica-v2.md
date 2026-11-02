# Encargo · CPQ › Propuesta técnica v2 (biblioteca + armador + envío)

Linear: CAR-144 (https://linear.app/carlos-irigoyen/issue/CAR-144).

## Hoja de alcance (una página)

**Pasa de 1.0 a 2.0 (piso):**
- PDF de propuesta por cotización con la marca del tenant (1.0 genera PROP-AAAA-NNN multi-instalación).
- Secciones redactadas de la propuesta (1.0: «proposalAi»): en 2.0 «Proponer texto con IA» deja borrador, nunca publica.
- Detalle del servicio por instalación (puestos, dotación, turnos, horario, días) desde la cotización.
- Envío al cliente junto con la cotización, con historial de lo enviado.

**No pasa:**
- Nombres, RUT o sueldos de trabajadores en la propuesta; costo, margen o líneas ocultas al cliente.
- HTML libre, colores o fuentes sueltas en bloques (todo sale de la marca).
- Enlace público con aceptación en línea, Portal Cliente y exportación a planilla (CAR-68 posteriores).
- Presentación de empresa suelta (`presentacion`) y cotización simple nueva: fuera de este PR.

**Mejoras que se suman:**
- Biblioteca de bloques por tenant (14 tipos del design prompt §2), versionada, borrador/publicado, fijo/opcional,
  historial con comparar y restaurar, variables como chips ({cliente}, {instalaciones}, {fecha}, {ejecutivo}).
- Plantilla de propuesta (Configuración › Marca y plantillas › Propuesta técnica): base, orden por defecto,
  fijos/opcionales, apertura máxima, nombre visible.
- Armador desde la ficha de la cotización (3 columnas en 1280; pasos Bloques → Contenido → Vista previa en 375),
  sección del servicio automática con «Desde CPQ-AAAA-NNN vN», aviso «La cotización cambió» + «Actualizar desde la cotización»,
  «Editado para este cliente» + «Volver al texto de la biblioteca», párrafo libre, apertura ≤ plantilla.
- PDF A4 con índice y paginación según bloques activos, marca de agua BORRADOR antes de enviar.
- Envío y aprobación: casillas Cotización / Propuesta técnica, pendiente de aprobación (ningún correo sale sin
  aprobación humana), congela ambas versiones; cada envío guarda versión de cada bloque, plantilla y marca; «Reimprimir».
- Estados C1–C8 del mockup (vacía, bloque sin publicar, esqueletos, error PDF con reintento, imagen inválida,
  cotización sin puestos, solo lectura, enviada/congelada con «Crear nueva versión»).
