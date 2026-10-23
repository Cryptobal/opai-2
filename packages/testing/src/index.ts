// Utilidades de prueba compartidas. Las de capacidades viven en `@opai/capabilities/testing`
// (allí las usan los tests del propio paquete) y se re-exportan aquí para módulos y apps.
export {
  contextoDePrueba,
  dbEnMemoria,
  type OpcionesPrueba,
  TENANT_DE_PRUEBA,
  USUARIO_DE_PRUEBA,
} from "@opai/capabilities/testing";
