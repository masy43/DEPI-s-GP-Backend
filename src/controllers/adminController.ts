import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  AdminProductSchema,
  UpdateProductSchema,
  CategorySchema,
  AddImagesSchema,
  AddVariantsSchema,
  UpdateVariantSchema,
  UpdateOrderStatusSchema,
  LoginSchema,
} from "../utils/schemas";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("[adminController] JWT_SECRET environment variable is not set.");

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export const createProduct: RequestHandler = async (req, res) => {
  try {
    const parsed = AdminProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { product_name, description, category_id, variants, images } = parsed.data;

    const product = await prisma.product.create({
      data: {
        product_name,
        description: description || null,
        category_id,
        variants: variants?.length ? {
          create: variants.map((v) => ({
            size: v.size,
            price: v.price,
            stock: v.stock ?? 0
          }))
        } : undefined,
        images: images?.length ? {
          create: images.map((img) => ({
            image_url: img.image_url,
            is_primary: img.is_primary ?? false
          }))
        } : undefined,
      },
      include: { variants: true, images: true, category: true }
    });

    res.status(201).json({ message: "Product created", data: product });
  } catch (err: any) {
    if (err.code === "P2002") return res.status(409).json({ error: "Duplicate entry" });
    console.error("[admin] createProduct error:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
};

export const updateProduct: RequestHandler = async (req, res) => {
  try {
    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const parsed = UpdateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { product_name, description, category_id } = parsed.data;

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
    console.error("[admin] updateProduct error:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
};

export const deleteProduct: RequestHandler = async (req, res) => {
  try {
    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    await prisma.product.delete({ where: { product_id: productId } });

    res.json({ message: "Product deleted" });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Product not found" });
    console.error("[admin] deleteProduct error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

// ─── PRODUCT IMAGES ──────────────────────────────────────────────────────────

export const addProductImages: RequestHandler = async (req, res) => {
  try {
    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const parsed = AddImagesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { product_id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const created = await prisma.product_Images.createMany({
      data: parsed.data.images.map((img) => ({
        product_id: productId,
        image_url: img.image_url,
        is_primary: img.is_primary ?? false,
      })),
    });

    res.status(201).json({ message: `${created.count} image(s) added`, count: created.count });
  } catch (err) {
    console.error("[admin] addProductImages error:", err);
    res.status(500).json({ error: "Failed to add images" });
  }
};

export const deleteProductImage: RequestHandler = async (req, res) => {
  try {
    const imageId = parseInt(req.params.imageId as string);
    if (isNaN(imageId)) return res.status(400).json({ error: "Invalid image ID" });

    await prisma.product_Images.delete({ where: { image_id: imageId } });

    res.json({ message: "Image deleted" });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Image not found" });
    console.error("[admin] deleteProductImage error:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
};

// ─── PRODUCT VARIANTS ────────────────────────────────────────────────────────

export const addProductVariants: RequestHandler = async (req, res) => {
  try {
    const productId = parseInt(req.params.id as string);
    if (isNaN(productId)) return res.status(400).json({ error: "Invalid product ID" });

    const parsed = AddVariantsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const product = await prisma.product.findUnique({ where: { product_id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });

    const created = await prisma.product_Variant.createMany({
      data: parsed.data.variants.map((v) => ({
        product_id: productId,
        size: v.size ?? null,
        price: v.price,
        stock: v.stock ?? 0,
      })),
    });

    res.status(201).json({ message: `${created.count} variant(s) added`, count: created.count });
  } catch (err) {
    console.error("[admin] addProductVariants error:", err);
    res.status(500).json({ error: "Failed to add variants" });
  }
};

export const updateVariant: RequestHandler = async (req, res) => {
  try {
    const variantId = parseInt(req.params.variantId as string);
    if (isNaN(variantId)) return res.status(400).json({ error: "Invalid variant ID" });

    const parsed = UpdateVariantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const variant = await prisma.product_Variant.update({
      where: { variant_id: variantId },
      data: {
        ...(parsed.data.size !== undefined && { size: parsed.data.size }),
        ...(parsed.data.price !== undefined && { price: parsed.data.price }),
      },
    });

    res.json({ message: "Variant updated", data: variant });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Variant not found" });
    console.error("[admin] updateVariant error:", err);
    res.status(500).json({ error: "Failed to update variant" });
  }
};

export const updateVariantStock: RequestHandler = async (req, res) => {
  try {
    const variantId = parseInt(req.params.id as string);
    if (isNaN(variantId)) return res.status(400).json({ error: "Invalid variant ID" });

    const { stock } = req.body;
    if (stock === undefined || typeof stock !== "number" || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "stock must be a non-negative integer" });
    }

    const variant = await prisma.product_Variant.update({
      where: { variant_id: variantId },
      data: { stock }
    });

    res.json({ message: "Stock updated", data: variant });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Variant not found" });
    console.error("[admin] updateVariantStock error:", err);
    res.status(500).json({ error: "Failed to update stock" });
  }
};

export const deleteVariant: RequestHandler = async (req, res) => {
  try {
    const variantId = parseInt(req.params.variantId as string);
    if (isNaN(variantId)) return res.status(400).json({ error: "Invalid variant ID" });

    await prisma.product_Variant.delete({ where: { variant_id: variantId } });

    res.json({ message: "Variant deleted" });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Variant not found" });
    console.error("[admin] deleteVariant error:", err);
    res.status(500).json({ error: "Failed to delete variant" });
  }
};

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const createCategory: RequestHandler = async (req, res) => {
  try {
    const parsed = CategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const category = await prisma.category.create({
      data: {
        category_name: parsed.data.category_name,
        description: parsed.data.description ?? null,
      },
    });

    res.status(201).json({ message: "Category created", data: category });
  } catch (err: any) {
    if (err.code === "P2002") return res.status(409).json({ error: "Category name already exists" });
    console.error("[admin] createCategory error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
};

export const updateCategory: RequestHandler = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id as string);
    if (isNaN(categoryId)) return res.status(400).json({ error: "Invalid category ID" });

    const parsed = CategorySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const category = await prisma.category.update({
      where: { category_id: categoryId },
      data: {
        ...(parsed.data.category_name && { category_name: parsed.data.category_name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      },
    });

    res.json({ message: "Category updated", data: category });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Category not found" });
    console.error("[admin] updateCategory error:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
};

export const deleteCategory: RequestHandler = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id as string);
    if (isNaN(categoryId)) return res.status(400).json({ error: "Invalid category ID" });

    await prisma.category.delete({ where: { category_id: categoryId } });

    res.json({ message: "Category deleted" });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Category not found" });
    if (err.code === "P2003") return res.status(409).json({ error: "Cannot delete category: products still reference it" });
    console.error("[admin] deleteCategory error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export const getAdminOrders: RequestHandler = async (req, res) => {
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
    console.error("[admin] getAdminOrders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

export const updateOrderStatus: RequestHandler = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id as string);
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

    const parsed = UpdateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const order = await prisma.order.update({
      where: { order_id: orderId },
      data: { status: parsed.data.status },
    });

    res.json({ message: "Order status updated", data: order });
  } catch (err: any) {
    if (err.code === "P2025") return res.status(404).json({ error: "Order not found" });
    console.error("[admin] updateOrderStatus error:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
};

export const cancelOrder: RequestHandler = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id as string);
    if (isNaN(orderId)) return res.status(400).json({ error: "Invalid order ID" });

    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status === "cancelled") {
      return res.status(400).json({ error: "Order is already cancelled" });
    }
    if (order.status === "delivered") {
      return res.status(400).json({ error: "Cannot cancel a delivered order" });
    }

    await prisma.$transaction(async (tx) => {
      // Restore stock for all ordered items
      for (const item of order.items) {
        await tx.product_Variant.update({
          where: { variant_id: item.variant_id },
          data: { stock: { increment: item.quantity ?? 0 } },
        });
      }

      await tx.order.update({
        where: { order_id: orderId },
        data: { status: "cancelled" },
      });
    });

    res.json({ message: "Order cancelled and stock restored" });
  } catch (err) {
    console.error("[admin] cancelOrder error:", err);
    res.status(500).json({ error: "Failed to cancel order" });
  }
};

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────

export const getCustomers: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { first_name: { contains: search, mode: "insensitive" as const } },
            { last_name: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const total = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        customer_id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        loyalty_points: true,
        created_at: true,
        _count: { select: { orders: true } },
      },
    });

    res.json({
      meta: { total, page, pages: Math.ceil(total / limit), limit },
      data: customers,
    });
  } catch (err) {
    console.error("[admin] getCustomers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

export const getCustomerById: RequestHandler = async (req, res) => {
  try {
    const customerId = parseInt(req.params.id as string);
    if (isNaN(customerId)) return res.status(400).json({ error: "Invalid customer ID" });

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
        orders: {
          orderBy: { created_at: "desc" },
          take: 10,
          select: {
            order_id: true,
            order_ref: true,
            status: true,
            total: true,
            created_at: true,
          },
        },
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!customer) return res.status(404).json({ error: "Customer not found" });

    res.json({ data: customer });
  } catch (err) {
    console.error("[admin] getCustomerById error:", err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const adminLogin: RequestHandler = async (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const { email, password } = parsed.data;

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
    console.error("[admin] login error:", err);
    res.status(500).json({ error: "Something went wrong during login" });
  }
};
