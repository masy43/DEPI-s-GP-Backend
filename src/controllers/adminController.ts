import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

const JWT_SECRET = process.env.JWT_SECRET || "dev-fallback-secret";
const SALT_ROUNDS = 12;

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { product_name, description, category_id, variants, images } = req.body;

    if (!product_name || !category_id) {
      return res.status(400).json({ error: "product_name and category_id are required" });
    }

    const managerId = (req as AuthRequest).user?.adminId || null;

    const product = await prisma.product.create({
      data: {
        product_name,
        description: description || null,
        category_id,
        manager_id: managerId,
        variants: variants?.length ? {
          create: variants.map((v: any) => ({
            size: v.size,
            price: v.price,
            stock: v.stock || 0
          }))
        } : undefined,
        images: images?.length ? {
          create: images.map((img: any) => ({
            image_url: img.image_url,
            is_primary: img.is_primary || false
          }))
        } : undefined,
      },
      include: { variants: true, images: true, category: true }
    });

    res.status(201).json({ message: "Product created", data: product });
  } catch (err: any) {
    if (err.code === "P2002") return res.status(409).json({ error: "Duplicate entry" });
    console.log("[admin] createProduct error:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const { product_name, description, category_id } = req.body;

    const product = await prisma.product.update({
      where: { product_id: productId },
      data: {
        ...(product_name && { product_name }),
        ...(description !== undefined && { description }),
        ...(category_id && { category_id })
      },
      include: { variants: true, images: true, category: true }
    });

    res.json({ message: "Product updated", data: product });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Product not found" });
    console.log("[admin] updateProduct error:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    await prisma.product.delete({ where: { product_id: productId } });

    res.json({ message: "Product deleted" });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Product not found" });
    console.log("[admin] deleteProduct error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

export const updateVariantStock = async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(req.params.id as string);
    if (isNaN(variantId)) return res.status(400).json({ error: "Invalid variant ID" });

    const { stock } = req.body;
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ error: "Valid stock value (>= 0) is required" });
    }

    const variant = await prisma.product_Variant.update({
      where: { variant_id: variantId },
      data: { stock }
    });

    res.json({ message: "Stock updated", data: variant });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Variant not found" });
    console.log("[admin] updateVariantStock error:", err);
    res.status(500).json({ error: "Failed to update stock" });
  }
};

export const getAdminOrders = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const total = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        customer: {
          select: { customer_id: true, email: true, first_name: true, last_name: true }
        },
        items: { include: { variant: { include: { product: true } } } },
        payment: true
      }
    });

    res.json({
      meta: { total, page, pages: Math.ceil(total / limit), limit },
      data: orders
    });
  } catch (err) {
    console.log("[admin] getAdminOrders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin.admin_id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`[admin] login: ${admin.email}`);

    res.json({
      message: "Admin login successful",
      token,
      admin: {
        admin_id: admin.admin_id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role
      }
    });
  } catch (err) {
    console.log("[admin] login error:", err);
    res.status(500).json({ error: "Something went wrong during login" });
  }
};
