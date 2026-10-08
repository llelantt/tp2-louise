#!/usr/bin/env bash
# Wrapper Unix des checks post-ecriture. L'implementation vit dans checks.mjs
# (multiplateforme, appelee par le plugin .opencode/plugin/checks.js).
exec node "$(dirname -- "$0")/checks.mjs"
