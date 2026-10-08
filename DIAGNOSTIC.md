# DIAGNOSTIC — `salles-api`, le repo malade

TP 2 — Outils d'IA pour développeurs, 2026 / 2027.

Ce document liste, pour chaque brique du harness, **le symptôme**, **la cause (fichier)**,
**la preuve** (la commande lancée et ce qu'elle a répondu) et **le correctif appliqué**.
Il se termine par ce qui a été volontairement **non corrigé**, et par les choix qui
ressemblent à des erreurs mais sont délibérés (et n'ont donc pas été signalés).

---

## 1. Synthèse

| # | Brique | Symptôme | Cause | Preuve |
|---|--------|----------|-------|--------|
| 1 | Subagents | Aucun subagent ne démarre | Modèles inexistants (`deepseek-v4-pro`, `deepseek-v4-flash`) | `task dev`/`task explorer` → `Model not found` |
| 2 | Subagents | `planner` injoignable | `mode: primary` | `opencode agent list` → `planner (primary)` |
| 3 | Droits | `finder` ne peut rien lire | `"*": deny` placé **en dernier** | config résolue de finder, dernière règle = deny |
| 4 | Subagents | `tester` jamais appelé | Absent du tableau d'équipe de l'architecte | `architect.md:40-46` |
| 5 | Droits | `dev` peut `git commit` | Permission contredit son prompt | `dev.md:18-25` vs `dev.md:76` |
| 6 | Droits | `explorer` peut écrire du code | `edit: allow` global | `explorer.md:15` |
| 7 | Tests | 2 fichiers de tests sur 4 jamais exécutés | `include` trop strict | `npm run test:unit` → `2 passed (2)` |
| 8 | Lint | Ne vérifie rien | `rules: {}` | `npm run lint` → exit 0 malgré un fichier fautif |
| 9 | Types | Quasi aucun contrôle | `strict:false` + `@ts-nocheck` | `tsconfig.json:8-10`, `price.ts:1` |
| 10 | Code | 2 bugs cachés | `overlap.ts:11`, `price.ts:5/19` | tests rebranchés → `'5020' ≠ 70`, `409 ≠ 201` |
| 11 | Hooks | Husky jamais installé, ne bloque pas | Pas de dépendance/`prepare`, pas de `set -e` | `npm ls husky` vide, `.husky/_/husky.sh` absent |
| 12 | Hooks | Écrire un `.ts` échoue | Plugin appelle `bash` | write `.ts` → exit 1, write `.txt` → OK |
| 13 | Rules | `AGENTS.md` documente des commandes absentes | `npm test`, `npm run build` | `Missing script: "test"` / `"build"` |
| 14 | Commands | `ship` pousse sans vérifier | `git add -A` + push, « ne relance pas les checks » | `ship.md` |
| 15 | MCP | 5 serveurs sur 6 morts | URL/ jetons absents | DNS échoue, `${SALLES_MCP_TOKEN}` absent |
| 16 | CI | Ne teste rien | Étape tests commentée, pas de typecheck | `ci.yml:19` |
| 17 | Git | Observation : `.env` versionné (probable fixture pédagogique) | Pas dans `.gitignore` | `git ls-files .env` — voir §3, non corrigé |

---

## 2. Détail par brique

### 2.1 Subagents — les modèles n'existent pas (cause n°1 de la maladie)

`opencode.json` et chaque `.opencode/agent/*.md` référencent
`opencode/deepseek-v4-pro` (architect, dev, planner, reviewer) et
`opencode/deepseek-v4-flash` (explorer, finder, tester).

Or la liste réelle des modèles ne contient ni l'un ni l'autre :

```
$ opencode models
opencode/claude-haiku-5-5
opencode/deepseek-v4-flash-vision-exp
opencode/deepseek-v4.1-flash
opencode/exo-free
opencode/muse-spark-1.3-contributor-free
```

Conséquence : **toute la chaîne spécialisée est morte**. Preuves :

```
$ task explorer   → Model not found: opencode/deepseek-v4-flash
$ task dev        → Model not found: opencode/deepseek-v4-pro
```

Seule la session `architect` tourne, par repli sur un modèle valide. C'est pour ça que
« la chaîne travaille mal » : en réalité elle ne travaille pas du tout.

**Correctif** : tous les agents pointent sur `opencode/deepseek-v4.1-flash`
(`opencode.json:4-5` et le champ `model:` des 7 agents).

### 2.2 Subagents — `planner` n'est pas joignable

`.opencode/agent/planner.md:3` déclare `mode: primary`. Un agent primaire se sélectionne
avec `Tab` ; il n'est **pas** invocable par le Task tool. L'architecte décrit pourtant
`planner` comme un membre de son équipe et compte sur lui pour écrire les plans.

```
$ opencode agent list
planner (primary)      ← avant
planner (subagent)     ← après
```

**Correctif** : `mode: subagent`.

### 2.3 Droits — les permissions de `finder` sont inversées

La doc OpenCode est explicite : *« the last matching rule takes precedence »*, et il faut
placer `"*"` **en premier**. `finder.md` avait :

```yaml
permission:
  read: allow
  glob: allow
  grep: allow
  list: allow
  edit: deny
  task: deny
  webfetch: deny
  "*": deny        # ← en dernier : annule tout ce qui précède
```

Config résolue (avant) — la dernière règle est un `deny` global :

```json
{ "permission": "*", "action": "deny", "pattern": "*" }
```

Résultat : `finder` ne pouvait ouvrir **aucun** outil et répondait sans rien lire. C'est
exactement l'avertissement du sujet (« certains agents répondent sans avoir rien lu »).

**Correctif** : `"*": deny` déplacé en tête. Config résolue (après) : `*: deny` puis
`read/glob/grep/list: allow`.

### 2.4 Subagents — `tester` est invisible pour l'architecte

Le tableau « Your team » de `architect.md:40-46` liste `finder`, `explorer`, `planner`,
`dev`, `reviewer` — mais pas `tester`. Le subagent existe, il est configuré, mais
l'architecte ne sait pas qu'il existe et ne le délègue donc jamais.

**Correctif** : ligne `tester` ajoutée au tableau et à l'étape « Verify » de la boucle.

### 2.5 Droits — incohérences rôle / permission

- `dev.md:76` dit *« Do not commit, do not push, do not merge »*, mais ses permissions
  (`dev.md:18-25`) ne bloquaient que `git push`. `dev` pouvait donc committer.
  **Correctif** : `"git commit*": deny`.
- `explorer.md` dit n'écrire que ses notes dans `.opencode/plans/`, mais avait
  `edit: allow` global. **Correctif** (durcissement) : `edit` limité à
  `.opencode/plans/*.md`.

### 2.6 Tests — deux fichiers ne s'exécutent jamais

`vitest.config.ts:7` n'inclut que `test/**/*.spec.ts` (le commentaire dit que la
convention du dépôt est `*.spec.ts`). Or `price.test.ts` et `bookings.test.ts` existent :

```
$ npm run test:unit        # avant
 Test Files  2 passed (2)
      Tests  5 passed | 4 skipped (9)
```

Sur 4 fichiers de tests, 2 sont silencieusement ignorés. Ce sont précisément ceux qui
auraient attrapé les deux bugs applicatifs (§2.10).

**Correctif** : renommage en `*.spec.ts` (git mv, l'historique est conservé). Après :
`5 passed (5)`, `25 passed | 1 skipped`.

### 2.7 Lint — un parser sans aucune règle

`eslint.config.js:12` : `rules: {}`. Le parser TypeScript est branché, mais aucune règle
n'est active : le lint ne peut rien détecter.

```
$ npm run lint        # avant : exit 0, même avec // @ts-nocheck et un bug string+number
```

**Correctif** : `tseslint.configs.recommended` + règle `no-unused-vars`. Preuve qu'il
mord désormais :

```
$ npm run lint        # après, avec un fichier fautif volontaire
test/_lintprobe.ts
  1:7  error  'unusedVariable' is assigned a value but never used  @typescript-eslint/no-unused-vars
✖ 1 problem (1 error, 0 warnings)
```

### 2.8 Types — `strict` désactivé et `@ts-nocheck`

`tsconfig.json:8-10` : `strict:false`, `noImplicitAny:false`, `strictNullChecks:false`.
En plus, `src/lib/price.ts:1` portait `// @ts-nocheck`, désactivant tout contrôle sur ce
fichier — ce qui a laissé passer le bug de concaténation.

**Correctif** : `strict: true`, suppression des trois flags et du `@ts-nocheck`. Le
typecheck strict a d'ailleurs immédiatement attrapé un `unknown` dans le nouveau test
d'`availability` (`res.json()` renvoie `unknown`) — corrigé.

### 2.9 Bug applicatif n°1 — `overlaps` et les bornes

`src/lib/overlap.ts:11` :

```ts
return a1 <= b2 && b1 <= a2;
```

Le commentaire (`overlap.ts:4`) définit un créneau comme `[début, fin[`. Avec `<=`, deux
créneaux **bout à bout** (10h–11h puis 11h–12h) sont considérés en conflit. Le test qui le
prouve était désactivé (`it.skip`, `overlap.spec.ts:27`) et un test équivalent ne
s'exécutait pas (`bookings.test.ts`).

Preuve, en remettant l'ancien code et la suite rebranchée :

```
× POST /bookings > accepte une reservation qui commence quand la precedente finit
  → expected 409 to be 201
```

**Correctif** : `a1 < b2 && b1 < a2` (bornes semi-ouvertes). Test réactivé.

### 2.10 Bug applicatif n°2 — majoration week-end en chaîne de caractères

`src/lib/price.ts:5` : `const WEEKEND_SURCHARGE = "20";` (chaîne). Ligne 19,
`base + WEEKEND_SURCHARGE` concatène donc au lieu d'additionner.

Preuve :

```
× priceFor > ajoute la majoration de week-end
  → expected '5020' to be 70
```

**Correctif** : `const WEEKEND_SURCHARGE = 20;` (nombre).

### 2.11 Tests — un test qui ne testait rien

`test/store.spec.ts` importait `rooms` mais testait un **double littéral** défini dans le
fichier (`storeDouble`), pas les vraies fonctions `findRoom` / `bookingsForRoom` de
`src/store.ts`. Il prouvait donc le comportement d'un objet qu'il venait de créer.

**Correctif** : le test importe et exerce les vraies fonctions du store (`findRoom`,
`bookingsForRoom`), y compris le cas « salle inconnue ».

### 2.12 Hooks — Husky jamais installé, et un hook qui ne bloque pas

`.husky/pre-commit` existait, mais :

- aucune dépendance `husky` (`npm ls husky` → vide) et aucun script `prepare` :
  le hook n'était **jamais installé** (`core.hooksPath` non défini) ;
- `.husky/_/husky.sh` était absent, donc même exécuté, le `source` échouait ;
- pas de `set -e` : le code de sortie du script était celui de la **dernière** commande
  (`test:unit`), donc un lint rouge n'aurait pas bloqué le commit.

**Correctif** :
- `.husky/pre-commit` nettoyé (plus de `source`), `set -e` ajouté, bit exécutable posé ;
- branchement sans dépendance via `scripts/install-hooks.mjs`
  (`git config core.hooksPath .husky`), appelé par le script `prepare` de `package.json`.

Preuve que le hook bloque :

```
$ sh .husky/pre-commit        # avec un fichier volontairement fautif
✖ 1 problem (1 error, 0 warnings)
HOOK EXIT=1
```

### 2.13 Hooks — le plugin post-écriture cassait chaque écriture `.ts`

`.opencode/plugin/checks.js` était bien chargé (auto-chargé depuis `.opencode/plugin/`),
mais il lançait `bash scripts/checks.sh`. `bash` est absent de cet environnement Windows.

Test contrôlé :

```
write .opencode/scratch/probe.ts  → Failed with exit code 1
write .opencode/scratch/probe.txt → Wrote file successfully
```

Le fichier `.ts` était bien écrit, mais le résultat de l'outil renvoyait un échec : de quoi
faire boucler un agent sur une édition pourtant réussie.

**Correctif** : `scripts/checks.mjs` (Node, multiplateforme) + le plugin appelle
`node scripts/checks.mjs` dans un `try/catch` (un check rouge s'affiche, il ne casse plus
l'outil). `scripts/checks.sh` n'est plus qu'un wrapper.

> Remarque : les plugins sont chargés au démarrage d'OpenCode. Le correctif prend effet
> dans une **nouvelle session**.

### 2.14 Rules — `AGENTS.md` documentait des commandes inexistantes

```
$ npm test          → npm error Missing script: "test"
$ npm run build     → npm error Missing script: "build"
```

`AGENTS.md` promettait `npm test` et `npm run build`, qui n'existaient pas.

**Correctif** :
- script `"test": "vitest run"` ajouté à `package.json` (donc `npm test` marche) ;
- ligne `npm run build` remplacée par `npm run typecheck` (il n'y a pas d'étape de build :
  le service tourne via `tsx`).

### 2.15 Commands — `ship` livrait sans filet

`.opencode/command/ship.md` faisait `git add -A`, commit, push, en affirmant
« ne relance pas les checks : le hook post-ecriture s'en est déjà occupé » et
« si la chaîne est allée jusqu'au bout, c'est que le diff est bon ». C'est faux (le hook
n'échoue pas, il affiche) et ça contredit `AGENTS.md` (« ne pas commiter dans `main` »).

**Correctif** : `ship` relance typecheck + lint + tests, crée une branche si on est sur
`main`, puis commit et push.

### 2.16 MCP — cinq serveurs sur six ne répondent pas

`opencode.json:6-55` déclarait six serveurs :

| MCP | État observé |
|-----|--------------|
| `salles-db` | Hôte `mcp.internal.salles.lan` : résolution DNS **échouée** ; `${SALLES_MCP_TOKEN}` **absent** de l'environnement |
| `github` | Paquet déprécié, aucun `GITHUB_PERSONAL_ACCESS_TOKEN` |
| `notion` | Aucun jeton |
| `slack` | Aucun jeton |
| `sentry` | Remote sans authentification |
| `playwright` | Local, démarre sans credentials (mais inutilisé par une API) |

```
$ Resolve-DnsName mcp.internal.salles.lan  → échec
$ $env:SALLES_MCP_TOKEN                    → absent
```

**Correctif** : les cinq serveurs inutilisables/ inutilisés sont retirés ; seul
`playwright` est conservé. Pour les réintroduire, il faut fournir les jetons
(`SALLES_MCP_TOKEN`, `GITHUB_PERSONAL_ACCESS_TOKEN`, etc.).

### 2.17 CI — la CI ne testait rien

`.github/workflows/ci.yml:19` : l'étape de tests était commentée
(`# TODO remettre, ca bloquait les merges`), et il n'y avait **pas** de typecheck. La CI
ne lançait donc que le lint… qui ne vérifiait rien (cf. §2.7). Une CI verte ne prouvait
rien.

**Correctif** : `ci.yml` lance `typecheck`, `lint` et `test:unit`.

### 2.18 Git — `.env` suivi par git

`git ls-files .env` renvoie `.env` : le fichier est versionné, et l'application ne le
charge même pas (aucun `dotenv`, seul `process.env.PORT` est lu). Voir §3.

---

## 3. Ce qui a été volontairement **non corrigé**

- **La règle 2 de `AGENTS.md` (« Result, jamais `throw` ») est violée par le code.**
  `src/routes/bookings.ts` (try/catch, lignes 19-64) et `src/lib/validate.ts`
  (`throw new ValidationError`) ne suivent pas la convention. Refactorer ces routes
  dépasse le périmètre du TP, touche du code en production et le gain est faible : je le
  signale sans le corriger. **Le nouvel endpoint, lui, suit la convention** (`Result`
  dans `src/lib/result.ts`), pour ne pas ajouter de dette.
- **`src/lib/AGENTS.md` exige un `export default` par module**, or aucun module de
  `src/lib/` n'en a. La règle invoque des « scripts de facturation » qui n'existent pas
  dans le dépôt. J'ai suivi le code existant plutôt que d'ajouter des `export default`
  factices. Contradiction signalée, non « corrigée ».
- **`.env` versionné.** À première vue c'est une fuite de secrets, mais le commentaire
  du fichier indique un **jeu de données pédagogique** (« aucune valeur réelle ») et le
  fichier n'est pas chargé par l'application. Je le traite comme un choix délibéré :
  signalé, non corrigé.
- **`scripts/checks.mjs` renvoie toujours 0** (`INFRA-231`) : c'est voulu et commenté —
  un check rouge informe l'agent, il ne l'interrompt pas.
- **Le test skippé de `overlap.spec.ts`** (fixture `legacy-bookings.json`, `INFRA-198`)
  est légitime : le commentaire explique que la fixture n'a jamais été versée. Laissé
  skippé.
- **`src/store.ts`** n'a pas été touché (interdit par `AGENTS.md`, il disparaît avec
  `INFRA-140`).
- **`architect` a `edit: allow` alors que sa description dit « Never writes code »** :
  ce n'est **pas** un défaut, son prompt précise « you also have full access to the
  repository ». Choix délibéré.

---

## 4. Exercice 1 — la tâche relancée

**Avant** (session d'origine) : la chaîne ne pouvait pas produire l'endpoint, parce
qu'aucun subagent ne démarre (`Model not found`), que `planner` est injoignable, que
`finder` ne peut pas lire et que `tester` n'est jamais appelé.

**Après** : configuration corrigée, vérifiée par une invocation neuve
(`opencode agent list` → `planner (subagent)`, `finder` avec `*: deny` en tête). La
tâche « ajoute `GET /rooms/:id/availability?date=YYYY-MM-DD` » a été réalisée avec ses
tests, en respectant les conventions (dates ISO 8601 UTC en `string`, `Result`, modules
dans `src/lib/`).

```
$ curl -s "localhost:3000/rooms/salle-a/availability?date=2026-10-05"
200 {"roomId":"salle-a","date":"2026-10-05","freeSlots":[
  {"startsAt":"2026-10-05T00:00:00.000Z","endsAt":"2026-10-05T09:00:00.000Z"},
  {"startsAt":"2026-10-05T11:00:00.000Z","endsAt":"2026-10-06T00:00:00.000Z"}]}

$ curl -s "localhost:3000/rooms/cave/availability?date=2026-10-05"   → 404 salle inconnue
$ curl -s "localhost:3000/rooms/salle-a/availability"                → 400 date invalide
$ curl -s "localhost:3000/rooms/salle-a/availability?date=2026-02-31"→ 400 date invalide
```

Hypothèse assumée : la « journée » est la plage UTC `[00:00, 24:00[`, les créneaux sont
des bornes semi-ouvertes `[début, fin[`, et les créneaux libres sont le complément des
réservations de la journée (fusionnées). Le sujet ne précisait pas d'heures d'ouverture,
je n'en ai donc inventé aucune.

---

## 5. Vérification finale

```
$ npm run typecheck   → exit 0
$ npm run lint        → exit 0
$ npm run test:unit   → 5 fichiers, 25 passed | 1 skipped
$ npm test            → OK (script ajouté)
$ sh .husky/pre-commit→ bloque sur un check rouge (exit 1)
```

Voir `captures/README.md` pour la liste des captures d'écran à joindre.
