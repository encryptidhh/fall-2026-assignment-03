import { Request, Response, NextFunction } from 'express';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const rawUserId = req.header('X-User-Id');

  if (rawUserId === undefined) {
    res.status(401).json({ error: 'X-User-Id header is required' });
    return;
  }

  const userId = Number(rawUserId);

  if (Number.isNaN(userId)) {
    res.status(401).json({ error: 'X-User-Id header must be a valid number' });
    return;
  }

  // Store the authenticated userId on res.locals.userId
  res.locals.userId = userId;

  next();
}

export default authMiddleware;  