// Reusable Prisma select objects to avoid over-fetching

export const productVariantSelect = {
  variant_id: true,
  size: true,
  price: true,
  stock: true,
};

export const cartItemSelect = {
  cart_item_id: true,
  quantity: true,
  added_at: true,
  variant: {
    select: {
      variant_id: true,
      size: true,
      price: true,
      stock: true,
      product: {
        select: {
          product_id: true,
          product_name: true,
          images: {
            where: { is_primary: true },
            select: { image_url: true },
            take: 1,
          },
        },
      },
    },
  },
};

export const orderSummarySelect = {
  order_id: true,
  order_ref: true,
  status: true,
  subtotal: true,
  tax: true,
  shipping: true,
  total: true,
  created_at: true,
};

export const customerPublicSelect = {
  customer_id: true,
  email: true,
  first_name: true,
  last_name: true,
};

export const reviewWithCustomerSelect = {
  review_id: true,
  rating: true,
  comment: true,
  created_at: true,
  customer: {
    select: { first_name: true, last_name: true },
  },
};
