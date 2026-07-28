import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("../load-env.cjs");
