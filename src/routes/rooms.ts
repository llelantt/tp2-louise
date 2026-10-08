import { Router } from "express";
import { rooms, findRoom, bookingsForRoom } from "../store.js";
import { parseDay, freeSlots } from "../lib/availability.js";

export const roomsRouter = Router();

roomsRouter.get("/", (_req, res) => {
  res.json({ rooms });
});

roomsRouter.get("/:id/availability", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  const date = typeof req.query.date === "string" ? req.query.date : "";
  const day = parseDay(date);
  if (!day.ok) {
    res.status(400).json({ error: day.error });
    return;
  }
  res.json({
    roomId: room.id,
    date,
    freeSlots: freeSlots(day.value, bookingsForRoom(room.id))
  });
});

roomsRouter.get("/:id", (req, res) => {
  const room = findRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: "salle inconnue" });
    return;
  }
  res.json({ room, bookings: bookingsForRoom(room.id) });
});
