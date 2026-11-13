# Auditoría de diseño · corrida 2 (13-nov-2026, CAR-372)

Segunda corrida del workflow `auditoria-diseno` en el PR #584 (job 131611986890, commit `2acf66db`), con la empresa ficticia `qa-e2e` y nunca Gard. Desde el ADR-109 las reglas se miden contra el diseño nuevo, y el ERP se recorre en el marco predeterminado (no en Hilo).

Novedad de esta corrida: antes de auditar, el paso `@datos-auditoria` crea por pantalla, en la rama de Neon de la vista previa, una cuenta, una instalación y una persona ficticias. Las capturas quedan en el artefacto `auditoria-diseno` del run (14 días). Aquí se guardan solo el `informe.json` y este resumen.

## Resultado

| Medida | Corrida 1 (12-nov) | Corrida 2 (13-nov) |
|---|---|---|
| Rutas | 169 | 171 |
| Capturas | 276 | 323 |
| Fichas del ERP abiertas | sin datos para abrir instalaciones ni personas | 65 de 112 |
| Vistas con más de un botón principal | 33 | 36 |
| Vistas con acciones repetidas | 27 | 27 |
| Hallazgos de accesibilidad (axe) | 10 | 7: 5 tablas con desplazamiento sin foco (CAR-364, PR #599) y 2 campos sin etiqueta |
| Desborde, textos en inglés y errores de consola | 0 | 0 |
| Fechas mal formateadas | — | 1: `/personas/[id]/sueldo` muestra `2026-11-12` (CAR-368) |

Las vistas con más de un primario suben porque ahora se abren más fichas, por ejemplo la de instalación con sus pestañas. Es el mismo patrón de CAR-360, en el que la lista y la ficha compiten con «Nueva» y la acción de la ficha. Ejemplo: en `/instalaciones/[id]/dispositivos` conviven «Nueva instalación» en la cabecera, «Nueva» en la lista y «Emparejar dispositivo».

## Guardia y Terreno por dentro

- **Terreno:** el emparejamiento del equipo funciona: el teléfono queda asignado a «Instalación QA auditoría». Se abren por dentro Inicio («¿Quién eres?»), Cola, Portería y Rondas. Marcar y Novedades vuelven al login porque nadie está asignado a la instalación y no hay nombre que elegir. Falta asignar la persona ficticia a un puesto de la instalación.
- **Guardia:** no se pudo entrar. La prueba tomó la primera persona de la lista («Persona Ficticia QA», sin vínculo ni PIN). La persona ficticia de la auditoría no aparece en la lista por defecto, probablemente porque su vínculo aún no está vigente. Desde esta corrida, la prueba la busca por su nombre.

## Pendiente (CAR-372)

1. Asignar la persona ficticia a un puesto de la instalación para elegirla en Terreno.
2. Dejarla con vínculo vigente y PIN para entrar a Guardia.
3. Crear un negocio con cotización para abrir las 47 fichas que siguen sin datos (negocios, cotizaciones, contratos y otras).
4. Medir los clics de las tareas clave: emitir factura, cotizar, marcar asistencia y hacer una ronda.
