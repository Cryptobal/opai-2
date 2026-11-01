# Configuración v1.1 · PR-A · evidencia local

Capturas del build de producción local de esta rama con Postgres de e2e local. No acreditan despliegue en test.opai.cl. Los nombres `light`/`dark` indican el tema aplicado con tokens del DS; `telefono` usa 375×667, `ipad` 1024×768 y `desktop` 1280×860.

- `portada`, `operacion`, `agentes` y `404`: los tres tamaños, claro y oscuro.
- `usuario`: menú del avatar en los tres tamaños y temas.
- `sidebar`: detalle a 1024 y 1280 en ambos temas; también visible en las capturas completas.
- `mas`: hoja móvil en ambos temas. No existe esa hoja en escritorio.

Reproducción (requiere el build corriendo en localhost:3000, credenciales e2e y DATABASE_URL_MIGRATE de una base local con nombre e2e):

```sh
BASE_URL=http://localhost:3000 PLAYWRIGHT_BROWSERS_PATH=/tmp/opai-playwright pnpm --filter @opai/web e2e configuracion-v11-navegacion --workers=1
```

La fixture solo activa Agente y Pauta en la base de pruebas; no cambia permisos ni roles. Los seis grupos se comprueban por URL directa y por clic; el regreso móvil se prueba con Operación → Calendario → Operación → Configuración. El inventario de paridad se regenera con su test: no cambia el archivo generado porque las capacidades se conservan en componentes compartidos.

CA parcial y exclusiones en `docs/2.0/briefs/CONFIGURACION-v11-PR-A.md`. Las capturas del menú incluyen comprobación de iconos persona/sol y se toman sin animaciones para mostrar el estado final.
