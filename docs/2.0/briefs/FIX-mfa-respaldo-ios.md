# Corrección de ingreso MFA en iOS

Encargo del 27-oct-2026: facilitar el ingreso de códigos de respaldo y revisar el reingreso tras activar MFA. Sin ID de Linear proporcionado.

## Criterios y límites

- El campo de verificación TOTP y respaldo, y el de confirmación TOTP, desactivan capitalización automática, corrección y revisión ortográfica; conservan autocompletado y teclado adecuados.
- Better Auth genera diez caracteres alfanuméricos de ambos casos, con guion después del quinto; los compara literalmente. La acción quita espacios e inserta el guion solo cuando faltaba en diez caracteres válidos. Conserva el caso y no corrige guiones mal ubicados.
- La normalización tiene pruebas unitarias; los tests de identidad cubren código ajeno, usado y límite de intentos. No se cambia el bloqueo ni el mensaje genérico.
- La hipótesis de autocapitalización en Safari no está verificada en un iPhone. La validación real queda para QA.
- Cobertura de pantalla parcial: Playwright comprueba los atributos de ambos métodos y el ingreso TOTP, pero no realiza un ingreso completo con respaldo normalizado. La normalización y el consumo de respaldo se prueban por separado.
- Al confirmar la activación Better Auth crea una sesión nueva y elimina la anterior; `nextCookies()` debe fijar la cookie nueva. No hay evidencia suficiente para atribuir a esa rotación la solicitud de contraseña observada ocho segundos después. Queda pendiente reproducirla y revisar el flujo real en iOS.
- Sin migraciones ni cambios de políticas de negocio. Adaptación técnica de OpenCode según el encargo; no se introducen decisiones de Carlos.
