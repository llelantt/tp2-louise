// Checks post-ecriture, multiplateforme.
//
// Lance typecheck + lint + tests et imprime le detail de ce qui est rouge.
// Ne s'interrompt jamais en erreur : un check rouge doit etre *vu* par l'agent
// (sortie collee dans le resultat de l'outil), pas interrompre son travail.
// (ticket INFRA-231, conserve.)
import { spawnSync } from "node:child_process";

const steps = [
  ["typecheck", ["run", "--silent", "typecheck"]],
  ["lint", ["run", "--silent", "lint"]],
  ["tests", ["run", "--silent", "test:unit"]]
];

let failed = false;

for (const [name, args] of steps) {
  const res = spawnSync("npm", args, { encoding: "utf8", shell: true });
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
  if (res.status === 0) {
    console.log(`--- ${name}: vert`);
    continue;
  }
  failed = true;
  console.log(`--- ${name}: ROUGE`);
  if (output) console.log(output);
}

if (failed) console.log("--- au moins un check est rouge (voir plus haut)");

// Toujours 0 : on informe l'agent, on ne l'interrompt pas.
process.exit(0);
