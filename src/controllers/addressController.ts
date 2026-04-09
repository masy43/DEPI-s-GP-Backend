import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const getAddresses = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const addresses = await prisma.address.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: "desc" },
    });

    res.json({ data: addresses });
  } catch (err) {
    console.log("[address] getAddresses error:", err);
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
};

export const addAddress = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const { street_address, city, state, zip_code, country, phone, is_default } = req.body;

    if (!street_address || !city || !state || !zip_code || !country) {
      return res.status(400).json({ error: "Street, city, state, zip code, and country are required." });
    }

    const currentAddressesCount = await prisma.address.count({
      where: { customer_id: customerId },
    });

    if (currentAddressesCount >= 5) {
      return res.status(400).json({ error: "Maximum of 5 addresses allowed." });
    }

    const setAsDefault = is_default === true || currentAddressesCount === 0;

    const result = await prisma.$transaction(async (tx) => {
      if (setAsDefault) {
        await tx.address.updateMany({
          where: { customer_id: customerId, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.address.create({
        data: {
          customer_id: customerId,
          street_address,
          city,
          state,
          zip_code,
          country,
          phone: phone || null,
          is_default: setAsDefault,
        },
      });
    });

    res.status(201).json({ message: "Address added successfully", data: result });
  } catch (err) {
    console.log("[address] addAddress error:", err);
    res.status(500).json({ error: "Failed to add address" });
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const addressId = parseInt(req.params.id as string);
    if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

    const { street_address, city, state, zip_code, country, phone, is_default } = req.body;

    const existingAddress = await prisma.address.findUnique({
      where: { address_id: addressId },
    });

    if (!existingAddress || existingAddress.customer_id !== customerId) {
      return res.status(404).json({ error: "Address not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (is_default === true) {
        await tx.address.updateMany({
          where: { customer_id: customerId, is_default: true },
          data: { is_default: false },
        });
      }

      return tx.address.update({
        where: { address_id: addressId },
        data: {
          ...(street_address && { street_address }),
          ...(city && { city }),
          ...(state && { state }),
          ...(zip_code && { zip_code }),
          ...(country && { country }),
          ...(phone !== undefined && { phone }),
          ...(is_default !== undefined && { is_default }),
        },
      });
    });

    res.json({ message: "Address updated successfully", data: result });
  } catch (err) {
    console.log("[address] updateAddress error:", err);
    res.status(500).json({ error: "Failed to update address" });
  }
};

export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const addressId = parseInt(req.params.id as string);
    if (isNaN(addressId)) return res.status(400).json({ error: "Invalid address ID" });

    const existingAddress = await prisma.address.findUnique({
      where: { address_id: addressId },
    });

    if (!existingAddress || existingAddress.customer_id !== customerId) {
      return res.status(404).json({ error: "Address not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({
        where: { address_id: addressId },
      });

      if (existingAddress.is_default) {
        const nextAddress = await tx.address.findFirst({
          where: { customer_id: customerId },
          orderBy: { created_at: "desc" },
        });

        if (nextAddress) {
          await tx.address.update({
            where: { address_id: nextAddress.address_id },
            data: { is_default: true },
          });
        }
      }
    });

    res.json({ message: "Address deleted successfully" });
  } catch (err) {
    console.log("[address] deleteAddress error:", err);
    res.status(500).json({ error: "Failed to delete address" });
  }
};
