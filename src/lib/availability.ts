/**
 * Disponibilites d'une salle : creneaux libres d'une journee.
 */
import type { Booking } from "../store.js";
import { ok, err, type Result } from "./result.js";

export interface Slot {
  startsAt: string;
  endsAt: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Valide une date `YYYY-MM-DD` et renvoie la journee UTC [00:00, 24:00[.
 */
export function parseDay(date: string): Result<Slot> {
  if (!DATE_RE.test(date)) {
    return err("date invalide : format attendu YYYY-MM-DD");
  }
  const start = Date.parse(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start) || new Date(start).toISOString().slice(0, 10) !== date) {
    return err(`date invalide : ${date}`);
  }
  return ok({
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + DAY_MS).toISOString()
  });
}

/**
 * Calcule les creneaux libres d'une journee en retirant les reservations,
 * bornes [debut, fin[ : deux creneaux bout a bout ne se chevauchent pas.
 */
export function freeSlots(day: Slot, bookings: Booking[]): Slot[] {
  const dayStart = Date.parse(day.startsAt);
  const dayEnd = Date.parse(day.endsAt);
  const busy = bookings
    .map((b) => ({ start: Date.parse(b.startsAt), end: Date.parse(b.endsAt) }))
    .filter((b) => b.start < dayEnd && b.end > dayStart)
    .sort((a, b) => a.start - b.start);

  const slots: Slot[] = [];
  let cursor = dayStart;
  for (const b of busy) {
    const start = Math.max(b.start, dayStart);
    const end = Math.min(b.end, dayEnd);
    if (start > cursor) {
      slots.push({
        startsAt: new Date(cursor).toISOString(),
        endsAt: new Date(start).toISOString()
      });
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < dayEnd) {
    slots.push({
      startsAt: new Date(cursor).toISOString(),
      endsAt: new Date(dayEnd).toISOString()
    });
  }
  return slots;
}
