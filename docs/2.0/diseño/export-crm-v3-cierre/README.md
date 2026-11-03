# Export CRM v3: cierre comercial y seguimiento

- **Prompts:** `docs/2.0/design/DESIGN-PROMPT-comercial-cierre.md` y `DESIGN-PROMPT-seguimiento-comercial.md`.
- **Entrega:** Carlos la subió el 3-nov-2026 a las 12:45 («listo los diseños»).
- **Revisión:** pendiente la pasada detallada pantalla por pantalla, que se hace en el brief de cada PR.

**Estructura del export:**
- Los archivos grandes contienen las pantallas reales: `NegocioV2`, `CuentaV2`, `Negocios`, `Pendientes`, `MisTareas`, `ReportesComerciales`, `SegHoja`, `SegConfig`, `ConfigComercial`, `Contactos`, `ArchivarContacto` y `Comercial CRM`.
- Los archivos chicos, de alrededor de 1,4 KB (`Actividad`, `CorreosNegocio`, `GanarNegocio`, `CuentaSII`, `Etiquetas`, `Exportar`, `Fusionar`, `Transferir`, `Paso*`, `ConfigSeguimiento*`…), son atajos que importan esas pantallas con `screen="…"`. Por ejemplo, `NegocioV2` con `screen="actividad"`, `correos`, `ganar` o `seguimiento`, y `CuentaV2` con `screen="sii"`, `fusionar` o `etiquetas`.

**Mapa a PRs:**

| Pantallas | PR |
|---|---|
| `NegocioV2·actividad`, `MisTareas`, `CuentaV2·etiquetas`, `ArchivarContacto` | Actividad y tareas |
| `NegocioV2·ganar`, `CuentaV2·sii` | Ganar con efectos y SII |
| `NegocioV2·seguimiento`, `Pendientes`, `SegHoja`, `SegConfig`, `InicioSeguimientos`, `Paso*`, `ClienteRespondio` | Seguimiento comercial |
| `NegocioV2·correos`, `NegocioV2·bandeja` | Correo (Gmail) |
| `ReportesComerciales`, `Negocios·exportar`, `Negocios·transferir`, `CuentaV2·fusionar` | Reportes y herramientas de cartera |
