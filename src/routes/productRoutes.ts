import { Router } from "express";
import { getProducts, getProductById, getCategories } from "../controllers/productController";

const router = Router();

router.get("/categories", getCategories);
router.get("/products", getProducts);
router.get("/products/:id", getProductById);


export default router;
