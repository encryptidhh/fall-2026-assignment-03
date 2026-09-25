import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('Part 1: API Integration Tests', () => {
  
  let userId: number;

  // Test user creation (POST /users)
  it('should create a user and return 201', async () => {
    const res = await request(app).post('/users').send({
      name: 'Integration Tester',
      email: 'tester@example.com',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Integration Tester');

    userId = res.body.id;
  });

  // Test ticket creation (POST /tickets)
  it('should create a ticket and return 201 with creator_id from header', async () => {
    const res = await request(app)
      .post('/tickets')
      .set('X-User-Id', String(userId))
      .send({
        title: 'Write integration tests',
        description: 'Cover the key API behaviors',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Write integration tests');
    expect(res.body.creator_id).toBe(userId);
  });

  // Test auth middleware rejection (401 when X-User-Id is missing or invalid)
  it('should return 401 when X-User-Id is missing on POST /tickets', async () => {
    const res = await request(app)
      .post('/tickets')
      .send({ title: 'No auth header' });

    expect(res.status).toBe(401);
  });

  it('should return 401 when X-User-Id is not a valid number', async () => {
    const res = await request(app)
      .post('/tickets')
      .set('X-User-Id', 'not-a-number')
      .send({ title: 'Bad auth header' });

    expect(res.status).toBe(401);
  });

  // Test 404 responses for non-existent users and tickets
  it('should return 404 when fetching a non-existent ticket', async () => {
    const res = await request(app).get('/tickets/999999');
    expect(res.status).toBe(404);
  });

  it('should return 404 when fetching a non-existent user', async () => {
    const res = await request(app).get('/users/999999');
    expect(res.status).toBe(404);
  });

  // Test pagination and filtering on GET /tickets
  it('should respect limit and offset on GET /tickets', async () => {
    // Seed a few tickets to make pagination observable
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/tickets')
        .set('X-User-Id', String(userId))
        .send({ title: `Paginated ticket ${i}` });
    }

    const page1 = await request(app).get('/tickets?limit=2&offset=0');
    const page2 = await request(app).get('/tickets?limit=2&offset=2');

    expect(page1.status).toBe(200);
    expect(page1.body).toHaveLength(2);
    expect(page2.status).toBe(200);
    expect(page2.body).toHaveLength(2);
    // Pages should not overlap
    expect(page1.body[0].id).not.toBe(page2.body[0].id);
  });

  it('should filter tickets by status on GET /tickets', async () => {
    const res = await request(app).get('/tickets?status=TODO');

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((t: { status: string }) => t.status === 'TODO')).toBe(true);
  });

  it('should return 400 for a malformed limit parameter', async () => {
    const res = await request(app).get('/tickets?limit=abc');
    expect(res.status).toBe(400);
  });
});