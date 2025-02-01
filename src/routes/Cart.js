const express = require("express");
const cartController = require("../controllers/Cart");
const router = express.Router();
const { verifyToken } = require("../middleware/VerifyToken");
router
	.post("/", verifyToken, cartController.create)
	.get("/user/:id", verifyToken, cartController.getByUserId)
	.patch("/:id", verifyToken, cartController.updateById)
	.delete("/:id", verifyToken, cartController.deleteById)
	.delete("/user/:id", verifyToken, cartController.deleteByUserId);

module.exports = router;
