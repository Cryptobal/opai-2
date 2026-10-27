# CI · evidencias, shards y acceso MFA

El encargo solicita seis shards independientes, evidencias ante cancelación, informe combinado y corrección de accesos e2e tras MFA. Sin cambios de producto ni migraciones; no modifica el plan.

## Criterios y estado

- Shards con PostgreSQL y servidor propios, sin cambiar proyectos ni paralelismo interno: implementado; duración y equilibrio reales pendientes de CI.
- Test-results, blob y log con `always()`, trazas de fallos y margen de timeout: implementado; cancelación real y subida deben probarse en GitHub.
- Informe HTML y anotaciones combinadas; check agregador falla si falta éxito: implementado; informe y agregador en rojo comprobados en el run 40520862621; falta verificar seis shards y cancelación.
- Logins afectados usan el helper MFA, conservando selección de empresa: implementado, validación integral local y CI pendiente: corrida local 32 aprobados, 14 fallidos y 8 omitidos preexistentes; hubo una corrida concurrente interrumpida y build durante el servidor dev, por lo que se requiere repetición aislada.
- Acceso selecciona el enlace de la empresa y espera la ficha; pasó en escritorio. Caché: el caso de navegación queda pendiente con test.fixme; la misma aserción falló en main 165236d al no aparecer la región de Personas tras cambiar la URL.
- Gate, informe de los seis tiempos y prueba temporal de timeout de tres minutos: pendientes hasta ejecución verificable del PR. El encargo prohíbe abrirlo en esta sesión.

Adaptación técnica de OpenCode: job de 35 minutos y paso de 25 para dejar margen de preparación y subida, sin garantía de subida ante cancelación forzosa o agotamiento del job completo. Informe combinado exige blobs disponibles. No se atribuyen decisiones nuevas a Carlos.

## Continuación PR #77

- Caché de Chromium por sistema y versión de Playwright; instalación de dependencias de sistema en cada ejecución. Se implementan seis shards sin cambiar proyectos, cobertura ni timeouts. Equilibrio y duración quedan pendientes de medir en CI; la primera ejecución puede tener caché fría.
- `maestros-lista-fija`: el trace desktop con CPU ×4 muestra que el primer enlace apunta a `?nueva=1`, por lo que se esperaba una ficha durante cuatro minutos. El test selecciona enlaces de ficha, sin cambiar sus aserciones.
- ADR-015 exige MFA para plataforma, owner y admin, y opcionalmente para otros roles. Los fixtures selector (admin) y multiempresa (owner) se enrolan con el secreto fijo de prueba y usan el helper existente; no se cambió la política. Los demás fallos y su validación completa quedan sujetos a los resultados e2e.
- Adaptaciones técnicas de OpenCode según el encargo; no son decisiones de negocio. Sin migraciones ni cambios de producto.

- Validación parcial de continuación: actionlint, typecheck, lint, test, test:db, build y presupuesto pasaron antes del último ajuste del test de portales; typecheck y lint también pasaron después. En la repetición e2e, el caso ERP sin acceso agotó el tiempo esperando el menú; se ajustó la espera y queda pendiente verificarlo y completar la repetición. La nueva corrida de test se interrumpió tras una incidencia en un test de base.

- Continuación de validación: actionlint, typecheck, lint, test (193 archivos), test:db, build y presupuesto pasaron. Una primera corrida de test tuvo un timeout de preparación de base y la repetición pasó. Playwright se ejecutó una vez; los fixtures MFA del selector y multiempresa se sembraron durante la corrida y el build coincidió con el servidor dev. Por ello sus fallos requieren confirmación en CI, incluidos activación MFA antes de sembrar, datos locales y esperas de navegación o menú. No se considera validación integral verde. La decisión t500u del encargo deja el equilibrio y la validación real para GitHub y sustituye la repetición e2e local.

## Continuación del encargo t618u

Se incorpora main mediante merge normal, se precisa la navegación de acceso y se limita el job agregador a cinco minutos. En escritorio acceso pasó; caché falló en tres casos, incluido el de la región añadida: la URL cambió, pero se mantuvo la pantalla de Inicio. Next registró errores de navegación con datos no cacheados fuera de Suspense; no se ha demostrado la causa. Los seis shards, sus tiempos y la conservación de evidencias ante cancelación quedan pendientes de validación. Las trazas de Playwright pueden contener cookies y datos de prueba; los artefactos se conservan siete días. No se introduce una decisión de negocio ni una migración.

## Comparación con main

En escritorio, la misma prueba copiada a un worktree de main `165236d` falló en la aserción de la región «Lista de personas» tras navegar a `/personas`. El caso queda marcado con `test.fixme` por comportamiento previo; corregir la navegación queda pendiente. No se verificó el overlay.

Validación local posterior: typecheck, lint (con advertencias), test (934), test:db (308), build y presupuesto pasaron. En escritorio acceso falló al esperar el mensaje de credenciales y se interrumpió durante el caso con sesión. Caché terminó con tres fallos, un caso omitido y uno sin completar por el límite global; la cobertura de invalidación queda parcial. La ejecución de los seis shards y la conservación ante cancelación siguen pendientes de CI.
