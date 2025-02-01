const express = require("express");
const cartController = require("../controllers/cartController/CartController");
const cartRoutes = express.Router();
const { verifyToken } = require("../middleware/VerifyToken");

// Cart API Endpoints
cartRoutes
	.post("/", verifyToken, cartController.create) // Add item to cart
	.get("/user", verifyToken, cartController.getByUserId) // Get cart by user
	.patch("/:id", verifyToken, cartController.updateById) // Update cart item
	.delete("/:id", verifyToken, cartController.deleteById) // Delete cart item
	.delete("/user/delete", verifyToken, cartController.deleteByUserId); // Clear entire cart

module.exports = cartRoutes;
