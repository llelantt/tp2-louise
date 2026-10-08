/**
 * Result : une fonction qui peut echouer renvoie une valeur, jamais une exception.
 * Convention du depot (AGENTS.md, regle 2).
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Construit un Result en succes. */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

/** Construit un Result en echec. */
export function err<T>(error: string): Result<T> {
  return { ok: false, error };
}
