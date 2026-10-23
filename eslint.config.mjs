// ESLint de la raíz: solo scripts y archivos de configuración. Cada workspace tiene el suyo.
import { baseConfig } from "./eslint.base.mjs";

export default [...baseConfig, { ignores: ["apps/**", "packages/**", "modules/**"] }];
