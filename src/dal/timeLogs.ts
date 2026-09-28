// TODO: Student implementation - Part 2: DAL for time logs

import { db, TimeLog, NewTimeLog } from "../db/database.js";

export async function insertTimeLog(
  ticketId: number,
  userId: number,
  hours: number,
): Promise<TimeLog> {
  // TODO: Student implementation
  const newLog: NewTimeLog = {
    ticket_id: ticketId,
    user_id: userId,
    hours,
  };

  return await db
  .insertInto('time_logs')
  .values(newLog)
  .returningAll()
  .executeTakeFirstOrThrow();
}

export async function getTotalHoursForTicket(
  ticketId: number,
): Promise<number> {
  // TODO: Student implementation
  const row = await db
  .selectFrom('time_logs')
  .where('ticket_id', '=', ticketId)
  .select((eb) => eb.fn.sum('hours').as('total'))
  .executeTakeFirstOrThrow();

  return Number(row.total ?? 0);
}
