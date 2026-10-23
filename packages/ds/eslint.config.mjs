import { baseConfig } from "../../eslint.base.mjs";

export default [...baseConfig, { languageOptions: { globals: { window: "readonly", document: "readonly" } } }];
