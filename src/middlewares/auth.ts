import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export interface AuthPayload {
  userId: number;
  role: "PASSENGER" | "DRIVER";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "MISSING_TOKEN" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

export function requireRole(role: "PASSENGER" | "DRIVER") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    next();
  };
}