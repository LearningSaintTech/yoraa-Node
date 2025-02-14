const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController/paymentController");
const { verifyToken } = require("../middleware/VerifyToken");

router.post("/create-order",verifyToken, paymentController.createOrder);
router.post("/verify-payment", paymentController.verifyPayment);

module.exports = router;
