import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
} from '../dal/users.js';

const router = Router();

// --- Validation helpers ---

function parseUserId(params: unknown): number | undefined {
  const id = Number((params as { id?: string }).id);
  return Number.isInteger(id) ? id : undefined;
}

// TODO: Student implementation - Part 1: User Routes

// GET /users
router.get('/', async (_req, res) => {
  const users = await getAllUsers();
  return res.status(200).json(users);
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  const id = parseUserId(req.params);
  if (id === undefined) {
    return res.status(400).json({ error: 'id must be a valid number' });
  }

  const user = await getUserById(id);
  if (user === undefined) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.status(200).json(user);
});

// POST /users
router.post('/', async (req, res) => {
  const { name, email } = req.body ?? {};

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'name is required and must be a non-empty string' });
  }
  if (typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({ error: 'email is required and must be a non-empty string' });
  }

  const user = await createUser({ name, email });
  return res.status(201).json(user);
});

export default router;