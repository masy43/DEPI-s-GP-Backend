import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-fallback-secret";
const SALT_ROUNDS = 12;

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    if (!email || !password || !first_name || !last_name) {
      res
        .status(400)
        .json({ error: "email, password, first_name, and last_name are required." });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Invalid email format." });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });
    if (existingCustomer) {
      res.status(409).json({ error: "Email already exists." });
      return;
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
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, customer.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid credentials." });
      return;
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
