const express = require("express");
const wishlistController = require("../controllers/wishlistController/WishlistController");
const { verifyToken } = require("../middleware/VerifyToken");

const wishlistRouter = express.Router();

wishlistRouter.post("/add", verifyToken, wishlistController.addToWishlist);

wishlistRouter.get("/", verifyToken, wishlistController.getWishlist);

wishlistRouter.delete("/remove/:itemId", verifyToken, wishlistController.removeFromWishlist);

wishlistRouter.delete("/clear", verifyToken, wishlistController.clearWishlist);

module.exports = wishlistRouter;
