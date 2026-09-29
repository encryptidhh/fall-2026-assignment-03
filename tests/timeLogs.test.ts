import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('Part 2: Time Logs Tests', () => {
  let userId: number;
  let ticketId: number;

  // Fresh user and ticket before each test to satisfy database truncation in setup.ts
  beforeEach(async () => {
    const userRes = await request(app)
      .post('/users')
      .send({
        name: 'Time Logging Tester',
        email: `tester-${Date.now()}-${Math.random()}@example.com`,
      });
    userId = userRes.body.id;

    const ticketRes = await request(app)
      .post('/tickets')
      .set('X-User-Id', String(userId))
      .send({
        title: 'Time Logging Feature',
        description: 'Track developer hours per ticket',
      });
    ticketId = ticketRes.body.id;
  });

  // 1. Success case: POST /tickets/:id/time
  it('should log hours for a ticket and return 201 with time log data', async () => {
    const res = await request(app)
      .post(`/tickets/${ticketId}/time`)
      .set('X-User-Id', String(userId))
      .send({ hours: 4 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.ticket_id).toBe(ticketId);
    expect(res.body.user_id).toBe(userId);
    expect(res.body.hours).toBe(4);
    expect(res.body).toHaveProperty('logged_at');
  });

  // 2. Auth middleware rejection
  it('should return 401 when X-User-Id is missing on POST /tickets/:id/time', async () => {
    const res = await request(app)
      .post(`/tickets/${ticketId}/time`)
      .send({ hours: 2 });

    expect(res.status).toBe(401);
  });

  it('should return 401 when X-User-Id is not a number on POST /tickets/:id/time', async () => {
    const res = await request(app)
      .post(`/tickets/${ticketId}/time`)
      .set('X-User-Id', 'not-a-number')
      .send({ hours: 2 });

    expect(res.status).toBe(401);
  });

  // 3. Payload validation
  it('should return 400 when hours is non-positive or malformed', async () => {
    const resNegative = await request(app)
      .post(`/tickets/${ticketId}/time`)
      .set('X-User-Id', String(userId))
      .send({ hours: -1 });

    expect(resNegative.status).toBe(400);

    const resString = await request(app)
      .post(`/tickets/${ticketId}/time`)
      .set('X-User-Id', String(userId))
      .send({ hours: 'three' });

    expect(resString.status).toBe(400);
  });

  // 4. Default 0 hours when no logs exist
  it('should return 0 total_hours when no time has been logged yet', async () => {
    const res = await request(app).get(`/tickets/${ticketId}/time`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ticket_id: ticketId,
      total_hours: 0,
    });
  });

  // 5. Verification of aggregation math across multiple logs
  it('should accurately aggregate the sum of multiple time logs for a ticket', async () => {
    const hoursToLog = [3, 5, 2];

    for (const hours of hoursToLog) {
      const logRes = await request(app)
        .post(`/tickets/${ticketId}/time`)
        .set('X-User-Id', String(userId))
        .send({ hours });

      expect(logRes.status).toBe(201);
    }

    const res = await request(app).get(`/tickets/${ticketId}/time`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ticket_id: ticketId,
      total_hours: 10, // 3 + 5 + 2
    });
  });

  // 6. Cross-ticket isolation
  it('should isolate total hours between different tickets', async () => {
    const secondTicketRes = await request(app)
      .post('/tickets')
      .set('X-User-Id', String(userId))
      .send({ title: 'Second Ticket' });
    const secondTicketId = secondTicketRes.body.id;

    await request(app)
      .post(`/tickets/${ticketId}/time`)
      .set('X-User-Id', String(userId))
      .send({ hours: 6 });

    await request(app)
      .post(`/tickets/${secondTicketId}/time`)
      .set('X-User-Id', String(userId))
      .send({ hours: 4 });

    const res1 = await request(app).get(`/tickets/${ticketId}/time`);
    const res2 = await request(app).get(`/tickets/${secondTicketId}/time`);

    expect(res1.body.total_hours).toBe(6);
    expect(res2.body.total_hours).toBe(4);
  });
});
