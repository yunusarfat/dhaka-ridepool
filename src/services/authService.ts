import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db/prismaclient.js";

const JWT_SECRET = process.env.JWT_SECRET as string;
const SALT_ROUNDS = 10;

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: "PASSENGER" | "DRIVER";
}

interface LoginInput {
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password_hash,
      role: input.role,
    },
  });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isValid = await bcrypt.compare(input.password, user.password_hash);

  if (!isValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
