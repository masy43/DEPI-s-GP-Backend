import { RequestHandler } from "express";
import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

const getOrCreateCart = async (customerId: number) => {
  let cart = await prisma.cart.findUnique({ where: { customer_id: customerId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { customer_id: customerId } });
  }
  return cart;
};

export const getCart: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const cart = await getOrCreateCart(customerId);

    const cartItems = await prisma.cart_Item.findMany({
      where: { cart_id: cart.cart_id },
      include: {
        variant: {
          include: {
            product: {
              include: { images: { where: { is_primary: true } } }
            }
          }
        }
      },
      orderBy: { added_at: "asc" }
    });

    let subtotal = 0;
    const formattedItems = cartItems.map((item) => {
      const itemTotal = Number(item.variant.price) * item.quantity;
      subtotal += itemTotal;
      return {
        cart_item_id: item.cart_item_id,
        quantity: item.quantity,
        variant_id: item.variant_id,
        price: item.variant.price,
        item_total: itemTotal,
        variant_size: item.variant.size,
        product_name: item.variant.product.product_name,
        primary_image: item.variant.product.images[0]?.image_url || null
      };
    });

    res.json({
      cart_id: cart.cart_id,
      subtotal,
      items: formattedItems
    });
  } catch (err) {
    console.log("[cart] getCart error:", err);
    res.status(500).json({ error: "Failed to fetch cart" });
  }
};

export const addItemToCart: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const { variant_id, quantity } = req.body;
    const parsedQuantity = parseInt(quantity);

    if (!variant_id || isNaN(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({ error: "Valid variant_id and quantity >= 1 are required" });
    }

    const variant = await prisma.product_Variant.findUnique({ where: { variant_id } });
    if (!variant) return res.status(404).json({ error: "Variant not found" });

    if (variant.stock < parsedQuantity) {
      return res.status(400).json({ error: `Not enough stock. Available: ${variant.stock}` });
    }

    const cart = await getOrCreateCart(customerId);

    const existingItem = await prisma.cart_Item.findUnique({
      where: {
        cart_id_variant_id: { cart_id: cart.cart_id, variant_id }
      }
    });

    let newQuantity = parsedQuantity;
    if (existingItem) {
      newQuantity += existingItem.quantity;
      if (variant.stock < newQuantity) {
        return res.status(400).json({ error: `Cannot add more. Not enough stock. Available: ${variant.stock}` });
      }

      const updatedItem = await prisma.cart_Item.update({
        where: { cart_item_id: existingItem.cart_item_id },
        data: { quantity: newQuantity }
      });
      return res.json({ message: "Cart item updated", data: updatedItem });
    } else {
      const newItem = await prisma.cart_Item.create({
        data: { cart_id: cart.cart_id, variant_id, quantity: newQuantity }
      });
      return res.status(200).json({ message: "Item added to cart", data: newItem });
    }
  } catch (err) {
    console.log("[cart] addItemToCart error:", err);
    res.status(500).json({ error: "Failed to add item to cart" });
  }
};

export const updateCartItem: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    const cartItemId = parseInt(req.params.cartItemId as string);
    const { quantity } = req.body;

    if (!customerId) return res.status(401).json({ error: "Unauthorized" });
    if (isNaN(cartItemId)) return res.status(400).json({ error: "Invalid cart item ID" });

    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }

    const cartItem = await prisma.cart_Item.findUnique({
      where: { cart_item_id: cartItemId },
      include: { cart: true, variant: true }
    });

    if (!cartItem || cartItem.cart.customer_id !== customerId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    if (cartItem.variant.stock < parsedQuantity) {
      return res.status(400).json({ error: `Not enough stock. Available: ${cartItem.variant.stock}` });
    }

    const updatedItem = await prisma.cart_Item.update({
      where: { cart_item_id: cartItemId },
      data: { quantity: parsedQuantity }
    });

    res.json({ message: "Cart item updated", data: updatedItem });
  } catch (err) {
    console.log("[cart] updateCartItem error:", err);
    res.status(500).json({ error: "Failed to update cart item" });
  }
};

export const removeCartItem: RequestHandler = async (req, res) => {
  try {
    const customerId = (req as AuthRequest).user?.customerId;
    const cartItemId = parseInt(req.params.cartItemId as string);

    if (!customerId) return res.status(401).json({ error: "Unauthorized" });
    if (isNaN(cartItemId)) return res.status(400).json({ error: "Invalid cart item ID" });

    const cartItem = await prisma.cart_Item.findUnique({
      where: { cart_item_id: cartItemId },
      include: { cart: true }
    });

    if (!cartItem || cartItem.cart.customer_id !== customerId) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    await prisma.cart_Item.delete({ where: { cart_item_id: cartItemId } });

    res.json({ message: "Cart item removed" });
  } catch (err) {
    console.log("[cart] removeCartItem error:", err);
    res.status(500).json({ error: "Failed to remove cart item" });
  }
};
