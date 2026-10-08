import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import type { Slot } from "../src/lib/availability.js";

async function call(path: string) {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address() as { port: number };
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    const body = (await res.json()) as { freeSlots: Slot[] };
    return { status: res.status, body };
  } finally {
    server.close();
  }
}

describe("GET /rooms/:id/availability", () => {
  it("renvoie 404 pour une salle inconnue", async () => {
    const res = await call("/rooms/cave/availability?date=2026-10-05");
    expect(res.status).toBe(404);
  });

  it("renvoie 400 si la date est absente", async () => {
    const res = await call("/rooms/salle-a/availability");
    expect(res.status).toBe(400);
  });

  it("renvoie 400 si la date est mal formee", async () => {
    const res = await call("/rooms/salle-a/availability?date=05-10-2026");
    expect(res.status).toBe(400);
  });

  it("renvoie 400 si la date n'existe pas", async () => {
    const res = await call("/rooms/salle-a/availability?date=2026-02-31");
    expect(res.status).toBe(400);
  });

  it("renvoie la journee entiere quand la salle est libre", async () => {
    const res = await call("/rooms/labo/availability?date=2026-10-05");
    expect(res.status).toBe(200);
    expect(res.body.freeSlots).toEqual([
      { startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-06T00:00:00.000Z" }
    ]);
  });

  it("retire les creneaux reserves de la journee", async () => {
    const res = await call("/rooms/salle-a/availability?date=2026-10-05");
    expect(res.status).toBe(200);
    expect(res.body.freeSlots).toEqual([
      { startsAt: "2026-10-05T00:00:00.000Z", endsAt: "2026-10-05T09:00:00.000Z" },
      { startsAt: "2026-10-05T11:00:00.000Z", endsAt: "2026-10-06T00:00:00.000Z" }
    ]);
  });

  it("ignore les reservations des autres journees", async () => {
    const res = await call("/rooms/salle-a/availability?date=2026-10-06");
    expect(res.status).toBe(200);
    expect(res.body.freeSlots).toEqual([
      { startsAt: "2026-10-06T00:00:00.000Z", endsAt: "2026-10-07T00:00:00.000Z" }
    ]);
  });
});
