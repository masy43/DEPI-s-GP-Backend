import { Request, Response } from "express";
import prisma from "../config/prisma";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    const category = req.query.category as string;
    const search = req.query.search as string;
    const min_price = req.query.min_price ? parseFloat(req.query.min_price as string) : undefined;
    const max_price = req.query.max_price ? parseFloat(req.query.max_price as string) : undefined;

    let variantFilter: any = undefined;
    if (min_price !== undefined || max_price !== undefined) {
      variantFilter = { some: { price: {} } };
      if (min_price !== undefined) variantFilter.some.price.gte = min_price;
      if (max_price !== undefined) variantFilter.some.price.lte = max_price;
    }

    const where = {
      product_name: search ? { contains: search, mode: "insensitive" as any } : undefined,
      category: category ? { category_name: { equals: category, mode: "insensitive" as any } } : undefined,
      variants: variantFilter,
    };

    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: {
        category: true,
        variants: true,
        images: {
          where: { is_primary: true },
        },
      },
      orderBy: { product_id: "desc" },
    });

    res.json({
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: products,
    });
  } catch (err) {
    console.log("[products] getProducts error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { product_id: id },
      include: {
        category: true,
        variants: true,
        images: true,
      },
    });

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ data: product });
  } catch (err) {
    console.log("[products] getProductById error:", err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany();
    res.json({ data: categories });
  } catch (err) {
    console.log("[categories] getCategories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};
