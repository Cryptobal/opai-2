# CAR-364 · Plantilla ficticia para auditar el editor (Sesión Diseño, 14-nov-2026)

- **Entra:** la preparación de datos de la auditoría (`apps/web/e2e/auditoria/datos.ts`) crea, si falta, una «Plantilla QA auditoría» en blanco desde «Nueva plantilla». Así la auditoría puede abrir el editor de plantillas (`/documentos/plantillas/[id]`), la última vista de CAR-364 sin medir. Antes salía «sin registro para abrir».
- **Contexto:** en la corrida del 13-nov (#692), axe no marcó nada en las otras 352 vistas.
- **Pendiente:** confirmar con la corrida de este PR que axe no marca `scrollable-region-focusable` en el editor. Si lo marca, el arreglo va en el DS o en el editor.
