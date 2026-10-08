# Captures d'écran — TP 2

Le sujet exige des **captures d'écran** (un copier-coller de terminal ne compte pas).
N'ayant pas d'accès à l'écran, ce dossier contient la liste exacte des commandes à lancer
et des écrans à capturer, dans l'ordre. Chaque capture doit montrer **la commande et sa
sortie**.

## A. Exercice 1 — avant / après

1. **Avant** — dans une session OpenCode neuve, lancer la tâche :
   « Ajoute un endpoint GET /rooms/:id/availability?date=YYYY-MM-DD … ».
   Capturer l'échec de la chaîne : `Model not found: opencode/deepseek-v4-pro`
   (ou `-flash` selon le subagent).
2. **Après** — relancer la même tâche depuis une session neuve.
   Capturer la réponse (l'endpoint et ses tests sont produits).
3. Capturer les appels réels :

   ```
   curl -s localhost:3000/health
   curl -s "localhost:3000/rooms/salle-a/availability?date=2026-10-05"
   curl -s "localhost:3000/rooms/cave/availability?date=2026-10-05"     # 404
   curl -s "localhost:3000/rooms/salle-a/availability"                  # 400
   curl -s "localhost:3000/rooms/salle-a/availability?date=2026-02-31"  # 400
   ```

## B. Preuves par brique (avant / après)

| Brique | Commande | Ce que la capture doit montrer |
|--------|----------|-------------------------------|
| Modèles | `opencode models` | ni `deepseek-v4-pro` ni `deepseek-v4-flash` |
| Subagents | `opencode agent list` | `planner (primary)` avant → `planner (subagent)` après |
| Droits finder | `opencode agent list` | finder : `*: deny` en dernier (avant) → en premier (après) |
| Tests | `npm run test:unit` | avant `2 passed (2)` → après `5 passed (5)`, `25 passed` |
| Lint | `npm run lint` | avant exit 0 sur un fichier fautif → après `1 error` |
| Types | `npm run typecheck` | avant faible → après `strict` |
| Bugs | `git stash` + `npm run test:unit` | `'5020' ≠ 70` et `409 ≠ 201` |
| Hook | `sh .husky/pre-commit` | exit 1 sur un check rouge |
| Plugin | write d'un `.ts` | avant `Failed with exit code 1` → après OK |
| Rules | `npm test` / `npm run build` | avant `Missing script` → après OK |
| MCP | `Resolve-DnsName mcp.internal.salles.lan` | résolution échouée |
| CI | affichage de `.github/workflows/ci.yml` | étape tests commentée → active |

## C. Fichiers

Déposer les images dans ce dossier (`captures/01-….png`, etc.).
