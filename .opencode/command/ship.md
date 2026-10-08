---
description: Livre le travail en cours, apres verification
agent: architect
---

Le travail est termine. Avant de livrer, verifie-le : le hook post-ecriture n'est
pas une revue, il ne fait qu'afficher les checks.

1. `npm run typecheck && npm run lint && npm run test:unit` — tout doit etre vert.
   Si un check est rouge, on ne livre pas.
2. La convention du depot interdit de commiter directement dans `main` : si on est
   sur `main`, creer une branche (`git switch -c <type>/<sujet>`).
3. `git add -A`
4. `git commit -m "feat: <resume en une ligne de ce qui a change>"`
5. `git push -u origin HEAD`
