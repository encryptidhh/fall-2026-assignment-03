import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  type GetAllTicketsOptions,
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicketStatus,
} from '../dal/tickets.js';

const router = Router();

// --- Validation helpers ---

function parseLimit(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function parseOffset(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

const VALID_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'DONE']);

// --- Part 1: Ticket Routes ---

// GET /tickets?limit=10&offset=0&status=TODO
router.get('/', async (req, res) => {
  const limit = parseLimit(req.query.limit);
  const offset = parseOffset(req.query.offset);

  if (req.query.limit !== undefined && limit === undefined) {
    return res.status(400).json({ error: 'limit must be a positive integer' });
  }
  if (req.query.offset !== undefined && offset === undefined) {
    return res.status(400).json({ error: 'offset must be a non-negative integer' });
  }

  const options: GetAllTicketsOptions = {};
  if (limit !== undefined) options.limit = limit;
  if (offset !== undefined) options.offset = offset;
  if (typeof req.query.status === 'string' && req.query.status !== '') {
    options.status = req.query.status;
  }

  const tickets = await getAllTickets(options);
  return res.status(200).json(tickets);
});

// GET /tickets/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }

  const ticket = await getTicketById(id);
  if (ticket === undefined) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  return res.status(200).json(ticket);
});

// POST /tickets (auth required)
router.post('/', authMiddleware, async (req, res) => {
  const { title, description } = req.body ?? {};

  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'title is required and must be a non-empty string' });
  }
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string' });
  }

  const ticket = await createTicket({
    title,
    description,
    creator_id: res.locals.userId as number,
  });
  return res.status(201).json(ticket);
});

// PATCH /tickets/:id/status (auth required)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'id must be a number' });
  }

  const { status } = req.body ?? {};
  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    return res.status(400).json({
      error: `status must be one of: ${[...VALID_STATUSES].join(', ')}`,
    });
  }

  const ticket = await updateTicketStatus(id, status);
  if (ticket === undefined) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  return res.status(200).json(ticket);
});

export default router;