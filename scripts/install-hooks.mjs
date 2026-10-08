// Branche les hooks git du depot (`.husky/`) sur `core.hooksPath`.
//
// Appele par le script `prepare` de package.json, donc a chaque `npm install`.
// Volontairement sans dependance (pas de husky) : c'est un simple reglage git.
import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .husky", { stdio: "ignore" });
  console.log("hooks git actives (core.hooksPath -> .husky)");
} catch {
  console.log("pas de depot git ici, hooks non actives");
}
