import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { UpdateProfileSchema, ChangePasswordSchema } from "../utils/schemas";

const VALID_SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal"];
const SALT_ROUNDS = 12;

// ─── GENERAL PROFILE ─────────────────────────────────────────────────────────

export const getMyProfile: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const customer = await prisma.customer.findUnique({
      where: { customer_id: customerId },
      select: {
        customer_id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        loyalty_points: true,
        created_at: true,
      },
    });

    if (!customer) return res.status(404).json({ error: "Customer not found" });

    res.json({ data: customer });
  } catch (err) {
    console.error("[profile] getMyProfile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const updateMyProfile: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = UpdateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const customer = await prisma.customer.update({
      where: { customer_id: customerId },
      data: {
        ...(parsed.data.first_name && { first_name: parsed.data.first_name }),
        ...(parsed.data.last_name && { last_name: parsed.data.last_name }),
        ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
      },
      select: {
        customer_id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        loyalty_points: true,
      },
    });

    res.json({ message: "Profile updated", data: customer });
  } catch (err) {
    console.error("[profile] updateMyProfile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const changePassword: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const { current_password, new_password } = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { customer_id: customerId },
      select: { password_hash: true },
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const passwordMatch = await bcrypt.compare(current_password, customer.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, SALT_ROUNDS);

    await prisma.customer.update({
      where: { customer_id: customerId },
      data: { password_hash: hashedNewPassword },
    });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("[profile] changePassword error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
};

// ─── SKIN PROFILE ─────────────────────────────────────────────────────────────

export const updateSkinProfile: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const { skin_type, concerns, sensitivity_level, climate } = req.body;

    if (!skin_type || !VALID_SKIN_TYPES.includes(skin_type.toLowerCase())) {
      return res.status(400).json({ error: `Invalid skin_type. Options: ${VALID_SKIN_TYPES.join(", ")}` });
    }

    const concernsArray = Array.isArray(concerns) ? concerns : [];

    const profile = await prisma.skin_Profile.upsert({
      where: { customer_id: customerId },
      update: {
        skin_type: skin_type.toLowerCase(),
        concerns: concernsArray,
        sensitivity_level: sensitivity_level || "Not specified",
        climate: climate || "Not specified"
      },
      create: {
        customer_id: customerId,
        skin_type: skin_type.toLowerCase(),
        concerns: concernsArray,
        sensitivity_level: sensitivity_level || "Not specified",
        climate: climate || "Not specified"
      }
    });

    res.json({ message: "Skin profile saved successfully", data: profile });
  } catch (err) {
    console.error("[profile] updateSkinProfile error:", err);
    res.status(500).json({ error: "Failed to save skin profile" });
  }
};

export const getSkinProfile: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await prisma.skin_Profile.findUnique({
      where: { customer_id: customerId }
    });

    if (!profile) {
      return res.status(404).json({ error: "Skin profile not found" });
    }

    res.json({ data: profile });
  } catch (err) {
    console.error("[profile] getSkinProfile error:", err);
    res.status(500).json({ error: "Failed to fetch skin profile" });
  }
};
