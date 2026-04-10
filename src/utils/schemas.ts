import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

export const AdminRegisterSchema = z.object({
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const AddToCartSchema = z.object({
  variant_id: z.number().int().positive("variant_id must be a positive integer"),
  quantity: z.number().int().min(1, "quantity must be at least 1"),
});

export const CreateOrderSchema = z.object({}).optional();

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5, "rating must be between 1 and 5"),
  comment: z.string().max(2000).optional(),
});

export const AddressSchema = z.object({
  street_address: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "Zip code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().optional(),
  is_default: z.boolean().optional(),
});

export const ShipOrderSchema = z.object({
  partner_id: z.number().int().positive("partner_id must be a positive integer"),
  tracking_number: z.string().min(1, "tracking_number is required"),
});

export const DeliveryUpdateSchema = z.object({
  status: z.enum(["out_for_delivery", "delivered"]),
  notes: z.string().max(1000).optional(),
});

export const AdminProductSchema = z.object({
  product_name: z.string().min(1, "product_name is required"),
  category_id: z.number().int().positive(),
  description: z.string().optional(),
  variants: z.array(z.object({
    size: z.string(),
    price: z.number().positive(),
    stock: z.number().int().min(0).optional(),
  })).optional(),
  images: z.array(z.object({
    image_url: z.string().url(),
    is_primary: z.boolean().optional(),
  })).optional(),
});
