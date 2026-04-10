import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { RegisterSchema, LoginSchema } from "../utils/schemas";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("[authController] JWT_SECRET environment variable is not set.");
const SALT_ROUNDS = 12;

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { email, password, first_name, last_name, phone } = parsed.data;

    const existingCustomer = await prisma.customer.findUnique({ where: { email } });
    if (existingCustomer) {
      return res.status(409).json({ error: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const customer = await prisma.customer.create({
      data: {
        email,
        password_hash: hashedPassword,
        first_name,
        last_name,
        phone: phone || null,
      },
    });

    console.log(`[auth] registered: ${customer.email}`);

    res.status(201).json({
      message: "Account created successfully.",
      customer: {
        customer_id: customer.customer_id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
    });
  } catch (err) {
    console.log("[auth] register error:", err);
    res.status(500).json({ error: "Something went wrong during registration." });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { email, password } = parsed.data;

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const passwordMatch = await bcrypt.compare(password, customer.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign(
      {
        customerId: customer.customer_id,
        email: customer.email,
        role: "customer" as const,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[auth] login: ${customer.email}`);

    res.json({
      message: "Login successful.",
      token,
      customer: {
        customer_id: customer.customer_id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
    });
  } catch (err) {
    console.log("[auth] login error:", err);
    res.status(500).json({ error: "Something went wrong during login." });
  }
};
