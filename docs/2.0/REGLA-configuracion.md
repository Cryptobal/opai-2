# Regla: Centro de Configuración

**Estado:** borrador, aprobado en principio por Carlos (30-oct-2026, 00:53 CLT; decisiones del 00:55 incorporadas). Complementa `NAVEGACION.md` (D2: máx. 7 por área) y ADR-018/038.

## 1. Estructura
1. La portada `/configuracion` muestra **tarjetas de grupo** y el **buscador de ajustes** (`core.config.buscar`). No muestra listas largas de entradas.
2. Grupos cerrados (máx. 6): `empresa`, `operacion`, `personas-acceso`, `agentes`, `modulos`, `uso-registros` («Uso y registros»: Integraciones, Consumos, Auditoría). Crear un grupo nuevo o dividir uno lo decide Carlos caso a caso.
3. **Máximo 7 entradas por grupo.** Si se pasa, no hay scroll interno: se propone dividir y lo decide Carlos caso a caso. **Excepción: Módulos** — con más de 7 módulos con ajustes, la tarjeta abre su propia lista con todos y no se divide.
3b. Lo personal (Preferencias: tema, idioma, notificaciones) no va en Configuración: va en el menú de usuario, junto a «Mi cuenta».
4. Las subpantallas (solicitudes, roles, detalle, proveedor, evento) son **pestañas por ruta** de su entrada, no entradas.

## 2. Módulos nuevos
5. Un módulo **no suma una fila suelta** ni un grupo: su configuración vive en `/configuracion/modulo/<id>` como pestañas registradas en `secciones-modulos.ts`; o, si es un ajuste transversal del núcleo, entra como entrada de un grupo existente.
6. Lo que solo usa OPAI (operación interna, ajustes de plataforma de todos los tenants) va a `/platform` y **nunca** aparece en `/configuracion` del cliente.

## 3. Permisos
7. Cada entrada declara `permiso` (nunca `null`). Sin permiso, la entrada no aparece (sin deshabilitados, ADR-041.5). Una tarjeta aparece si el rol puede leer al menos una entrada.
8. Supervisor y Visualizador ven solo lo que su rol puede leer y nunca ven Agentes, Integraciones ni Consumos; el Visualizador no ve botones de escritura.

## 4. Diseño
9. Toda pantalla nueva o cambio visible de Configuración pasa antes por Claude Design con el DS 2.0 (DS V2 `44e4d7b9`), con diseño aprobado por Carlos citado en el PR. Nada de estilo 1.0.
10. Escritorio 1280, iPad 1024 y teléfono 375, claro y oscuro, con estados vacío, carga, error y sin permiso.

## 5. Lo que el Revisor exige en cada PR que toque `configuracion/` o `secciones*.ts`
- [ ] **Test automático** (en `pnpm test`) que falle si un grupo tiene > 7 entradas, si un `grupo` no está en la lista cerrada, o si una entrada no declara `permiso`, si hay una entrada personal (Preferencias) en Configuración, o si los roles Supervisor/Visualizador por defecto ven Agentes, Integraciones o Consumos. El límite de 7 no aplica a la lista de Módulos.
- [ ] El PR no agrega entradas para un módulo fuera de `secciones-modulos.ts`/`/configuracion/modulo/<id>`.
- [ ] Ninguna ruta de `/configuracion` usa permisos `platform:*` ni muestra datos de otros tenants.
- [ ] Toda entrada nueva es encontrable en `core.config.buscar` (test que la busque por su título).
- [ ] Capturas QA a 375/1024/1280 en `docs/2.0/qa/<rama>/` y e2e de Configuración en verde.
- [ ] Enlace al diseño aprobado en Claude Design (o «sin cambio visible»).
- [ ] La agrupación de `NAVEGACION.md`/este documento queda actualizada si cambia un grupo.
