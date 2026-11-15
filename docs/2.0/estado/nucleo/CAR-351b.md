# CAR-351 · Parte 2: la lista de API keys marca las que heredan todo o no vencen

- **Sesión:** Sesión Núcleo
- **PR:** rama `fix/car-351-marcas-llaves` (parte 2 de 2; la parte 1 es la rama `fix/car-351-llaves-minimas`)
- **Estado:** En PR
- **Migración:** No

## Qué entra

- En Configuración › Agentes, cada key vigente de tipo usuario que hereda todos los permisos muestra «Hereda todos los permisos», y toda key vigente sin vencimiento muestra «No vence».
- Prueba `@preview` `agentes-marcas-preview.spec.ts` (corre a pedido con la etiqueta `e2e`).

## Qué queda pendiente

- Nada de CAR-351 después de integrar las dos partes. Revocar la key `*` de Gard sigue fuera (decisión de Carlos, ADR-051).
