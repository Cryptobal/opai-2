// Roles que se suman al principal (CAR-359): el cálculo y la forma del `include` viven en
// @opai/domain, para que la sesión y todo «quién puede X» lean lo mismo.
export {
  INCLUIR_ROLES_QUE_SUMAN as INCLUIR_ROLES_ADICIONALES,
  permisosAdicionalesDe,
} from "@opai/domain";
