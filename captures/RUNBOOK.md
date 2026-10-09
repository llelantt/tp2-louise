# Runbook des captures — TP 2

> Le sujet exige de **vraies captures d'écran** (copie d'écran d'un terminal, pas un
> copier-coller de texte). Ce fichier te donne, pour chaque preuve attendue :
> **l'état** (avant / après), **la commande exacte** et **la sortie réelle** que j'ai
> obtenue en la rejouant. Tu n'as plus qu'à relancer et capturer.
>
> Enregistre tes images ici : `captures/01-….png`, `captures/02-….png`, etc.
> Pour capturer : **Win + Shift + S**, ou la touche Impr. écran de ton clavier.

---

## 0. Préparer le terminal (important sous Windows)

Deux pièges de cet environnement :

- **`npm` est bloqué en PowerShell** (stratégie d'exécution sur `npm.ps1`).
  Utilise **`npm.cmd`** partout (ou lance les commandes depuis `cmd.exe`, où `npm` marche).
- **`sh` n'est pas dans le `PATH`.** La bonne version est celle livrée avec Git :
  `"C:\Program Files\Git\bin\sh.exe"` (ou ouvre **Git Bash** et tape `sh`).

Le CLI OpenCode s'appelle `opencode.cmd` (le `opencode` tout court est bloqué par la même
stratégie).

### Basculer entre « avant » et « après »

Tout le « avant » est le **parent du commit correctif** : `ab57521`.
`node_modules/` et `.env` ne sont pas suivis par Git, donc ils survivent au changement :
**aucun `npm install` à refaire.**

```powershell
# ÉTAT « APRÈS » = corrigé (branche courante)
git checkout tp2/repo-malade

# ÉTAT « AVANT » = malade (HEAD détaché sur le parent)
git checkout ab57521

# revenir à tout moment
git checkout tp2/repo-malade
```

> Vérifie avant de commencer que `git status` est propre
> (il ne doit rester que `?? sujet-tp2.pdf`).

---

## A. Exercice 1 — la tâche relancée

### A1 — Avant : la chaîne est morte  _(manuel, session OpenCode)_

**Non reproductible en ligne de commande** : il faut une session OpenCode interactive.
Dans une fenêtre OpenCode ouverte **sur l'état `ab57521`**, lance la tâche :

> « Ajoute un endpoint `GET /rooms/:id/availability?date=YYYY-MM-DD` … »

Capture l'échec d'un subagent : `Model not found: opencode/deepseek-v4-pro`
(ou `-flash` selon le subagent).

### A2 — Après : la tâche aboutit  _(manuel, session OpenCode)_

Même session neuve, **sur l'état `tp2/repo-malade`** : relance la tâche, capture la
réponse (l'endpoint + ses tests sont produits).

### A3 — Les appels HTTP réels  _(reproductible)_

Terminal 1 :

```powershell
npm.cmd start      # laisse tourner : http://localhost:3000
```

Terminal 2 :

```powershell
curl.exe -s -w "`nHTTP %{http_code}`n" "http://localhost:3000/health"
curl.exe -s -w "`nHTTP %{http_code}`n" "http://localhost:3000/rooms/salle-a/availability?date=2026-10-05"
curl.exe -s -w "`nHTTP %{http_code}`n" "http://localhost:3000/rooms/cave/availability?date=2026-10-05"
curl.exe -s -w "`nHTTP %{http_code}`n" "http://localhost:3000/rooms/salle-a/availability"
curl.exe -s -w "`nHTTP %{http_code}`n" "http://localhost:3000/rooms/salle-a/availability?date=2026-02-31"
```

Sortie réelle attendue (vérifiée) :

```
{"ok":true}
HTTP 200
{"roomId":"salle-a","date":"2026-10-05","freeSlots":[{"startsAt":"2026-10-05T00:00:00.000Z","endsAt":"2026-10-05T09:00:00.000Z"},{"startsAt":"2026-10-05T11:00:00.000Z","endsAt":"2026-10-06T00:00:00.000Z"}]}
HTTP 200
{"error":"salle inconnue"}
HTTP 404
{"error":"date invalide : format attendu YYYY-MM-DD"}
HTTP 400
{"error":"date invalide : 2026-02-31"}
HTTP 400
```

---

## B. Preuves par brique

Les commandes sont identiques en « avant » et en « après » : c'est la **sortie** qui change.
Rappel de bascule : `git checkout ab57521` (avant) / `git checkout tp2/repo-malade` (après).

### B1 — Modèles  _(avant = après)_

```powershell
opencode.cmd models
```

Sortie réelle : la liste **ne contient ni** `deepseek-v4-pro` **ni** `deepseek-v4-flash`.

```
opencode/claude-haiku-5-5
opencode/deepseek-v4-flash-vision-exp
opencode/deepseek-v4.1-flash
opencode/exo-free
opencode/muse-spark-1.3-contributor-free
opencode/step-5-preview-free
```

### B2 — Subagents : `planner` joignable  _(avant → après)_

```powershell
opencode.cmd agent list | Select-String "\(primary\)|\(subagent\)"
```

- **Avant** : `planner (primary)`  ← non invocable par le Task tool
- **Après** : `planner (subagent)`

Sortie réelle après (extrait) :

```
architect (primary)
dev (subagent)
explorer (subagent)
finder (subagent)
planner (subagent)
reviewer (subagent)
tester (subagent)
```

### B3 — Droits de `finder`  _(avant → après)_

```powershell
Get-Content .opencode\agent\finder.md
```

- **Avant** : la dernière ligne de `permission:` est `"*": deny` → il annule tout ce qui
  précède, `finder` ne peut rien lire.
- **Après** : `"*": deny` est **en première** ligne, suivi des `allow`.

Capture le bloc `permission:` de chaque état.

### B4 — Tests : 2 fichiers ignorés  _(avant → après)_

```powershell
npm.cmd run test:unit
```

- **Avant** (sortie réelle) :

```
 Test Files  2 passed (2)
      Tests  5 passed | 4 skipped (9)
```

- **Après** (sortie réelle) :

```
 Test Files  5 passed (5)
      Tests  25 passed | 1 skipped (26)
```

### B5 — Lint : ne vérifiait rien  _(avant → après)_

Crée un fichier volontairement fautif, lance le lint, puis supprime-le :

```powershell
Set-Content -LiteralPath "test\_lintprobe.ts" -Value "const unusedVariable = 42;"
npm.cmd run lint
Remove-Item -LiteralPath "test\_lintprobe.ts" -Force
```

- **Avant** : `LINT_EXIT=0`, aucune erreur (le parser est branché mais `rules: {}`).
- **Après** (sortie réelle) :

```
test\_lintprobe.ts
  1:7  error  'unusedVariable' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

### B6 — Types : contrôle désactivé  _(avant → après)_

```powershell
npm.cmd run typecheck
Get-Content tsconfig.json
```

- **Avant** : `tsconfig.json` contient `"strict": false`, `"noImplicitAny": false`,
  `"strictNullChecks": false`.
- **Après** : `"strict": true` (les trois flags ont disparu).

Les deux états sortent en `exit 0` : c'est le **contenu de `tsconfig.json`** qu'il faut
capturer (et éventuellement `src/lib/price.ts:1`, qui portait `// @ts-nocheck`).

### B7 — Les deux bugs applicatifs  _(rejouer les sources buggées)_

Depuis la branche corrigée, on remet **uniquement** les deux sources fautives, on lance
les tests, puis on restaure :

```powershell
git checkout ab57521 -- src/lib/price.ts src/lib/overlap.ts
npm.cmd run test:unit
git checkout HEAD -- src/lib/price.ts src/lib/overlap.ts
```

Sortie réelle attendue (3 échecs) :

```
 × overlaps > accepte deux creneaux bout a bout
   → expected true to be false
 × priceFor > ajoute la majoration de week-end
   → expected '5020' to be 70
 × POST /bookings > accepte une reservation qui commence quand la precedente finit
   → expected 409 to be 201

 Test Files  3 failed | 2 passed (5)
      Tests  3 failed | 22 passed | 1 skipped (26)
```

### B8 — Le hook pre-commit  _(avant → après)_

```powershell
Set-Content -LiteralPath "test\_lintprobe.ts" -Value "const unusedVariable = 42;"
& "C:\Program Files\Git\bin\sh.exe" ".husky/pre-commit"
Remove-Item -LiteralPath "test\_lintprobe.ts" -Force
```

- **Avant** : `.husky/_/husky.sh: No such file or directory`, puis le script continue et
  sort en **`HOOK_EXIT=0`** → un lint rouge ne bloquait **pas** le commit.
- **Après** : le lint affiche `✖ 1 problem (1 error, 0 warnings)` et le script s'arrête en
  **`HOOK_EXIT=1`**.

### B9 — Le plugin post-écriture  _(manuel, session OpenCode)_

**Non reproductible en CLI.** Dans une session OpenCode :

- **Avant** : demander à un agent d'écrire un `.ts` → le résultat de l'outil affiche
  `Failed with exit code 1` (le fichier est pourtant écrit).
  Écrire un `.txt` → `Wrote file successfully`.
- **Après** : l'écriture d'un `.ts` ne renvoie plus d'échec.

### B10 — Commandes fantômes de `AGENTS.md`  _(avant → après)_

```powershell
npm.cmd test
```

- **Avant** (sortie réelle) :

```
npm error Missing script: "test"
```

- **Après** : `npm test` lance la suite (`Test Files 5 passed (5)`).

`npm run build` n'existe dans **aucun** des deux états : en « après » l'`AGENTS.md` ne le
promet plus et renvoie vers `npm run typecheck` (pas d'étape de build, le service tourne
via `tsx`).

### B11 — MCP injoignables  _(avant = après)_

```powershell
Resolve-DnsName mcp.internal.salles.lan
if ($env:SALLES_MCP_TOKEN) { "present" } else { "absent" }
```

Sortie réelle :

```
Resolve-DnsName : mcp.internal.salles.lan : Le nom DNS n'existe pas
absent
```

### B12 — CI qui ne testait rien  _(avant → après)_

```powershell
Get-Content .github\workflows\ci.yml
```

- **Avant** : la ligne de tests est commentée
  (`# - run: npm run test:unit   # TODO remettre, ca bloquait les merges`), pas de typecheck.
- **Après** : trois étapes actives `typecheck`, `lint`, `test:unit`.

---

## C. Récapitulatif à cocher

| # | Capture | État(s) | Mode |
|---|---------|---------|------|
| A1 | Échec de la chaîne (`Model not found`) | avant | OpenCode (manuel) |
| A2 | Tâche aboutie (endpoint produit) | après | OpenCode (manuel) |
| A3 | 5 appels `curl` (200/404/400) | après | CLI |
| B1 | `opencode models` | avant=après | CLI |
| B2 | `opencode agent list` → `planner` | avant/après | CLI |
| B3 | `finder.md` bloc `permission:` | avant/après | CLI |
| B4 | `npm run test:unit` (2 vs 5 fichiers) | avant/après | CLI |
| B5 | `npm run lint` sur fichier fautif | avant/après | CLI |
| B6 | `tsconfig.json` (`strict`) | avant/après | CLI |
| B7 | Bugs `'5020'≠70` et `409≠201` | sources buggées | CLI |
| B8 | `sh .husky/pre-commit` (exit 0 vs 1) | avant/après | CLI |
| B9 | plugin : write d'un `.ts` | avant/après | OpenCode (manuel) |
| B10 | `npm test` (Missing script vs OK) | avant/après | CLI |
| B11 | `Resolve-DnsName` (échec) | avant=après | CLI |
| B12 | `.github/workflows/ci.yml` | avant/après | CLI |

---

## D. Remarques honnêtes

- **A1, A2 et B9 ne sont pas reproductibles hors session OpenCode** : ils exigent l'interface
  interactive (TUI) et l'invocation d'agents. Je ne peux pas les produire à ta place.
- Les autres sorties de ce document ont **réellement été exécutées** dans cet environnement
  le 2026-10-09 ; elles sont recopiées sans retouche (seuls les codes couleur ANSI sont
  invisibles ici, mais ils apparaîtront en couleur dans ton terminal).
- Le dépôt a été laissé propre sur `tp2/repo-malade` (commit `e31c4d7`), serveur arrêté.
