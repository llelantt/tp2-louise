// Checks post-ecriture : des qu'un agent ecrit un fichier .ts, on relance
// typecheck + lint + tests et on colle la sortie dans le resultat de l'outil,
// pour que l'agent voie le rouge sans qu'on ait a le lui demander.
//
// (INFRA-231 : le script ne doit pas interrompre l'agent, il l'avertit,
// c'est a lui de corriger.)
//
// On passe par `node scripts/checks.mjs` et non par `bash` : `bash` n'existe
// pas sur toutes les machines (Windows), et l'ancien appel cassait chaque
// ecriture de fichier .ts.
export const ChecksPlugin = async ({ $, directory }) => {
  return {
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "edit" && input.tool !== "write" && input.tool !== "apply_patch") return
      const file = input.args?.filePath ?? input.args?.path ?? ""
      if (!file.endsWith(".ts")) return

      try {
        const res = await $`node scripts/checks.mjs`.cwd(directory).quiet()
        output.output += "\n\n--- checks post-ecriture ---\n" + res.stdout.toString()
      } catch (err) {
        output.output += "\n\n--- checks post-ecriture : echec d'execution ---\n" + String(err)
      }
    },
  }
}
