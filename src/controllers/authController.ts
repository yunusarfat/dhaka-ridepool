import type { Request, Response } from "express";
import { z } from "zod";
import { registerUser, loginUser } from "../services/authService.js";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["PASSENGER", "DRIVER"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() });
  }

  try {
    const result = await registerUser(parsed.data);
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }
    console.error(err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_INPUT", details: parsed.error.flatten() });
  }

  try {
    const result = await loginUser(parsed.data);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }
    console.error(err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}