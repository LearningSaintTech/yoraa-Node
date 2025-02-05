const express = require("express");
const addressController = require("../controllers/addressController/AddressController");
const { verifyToken } = require("../middleware/VerifyToken");

const router = express.Router();

router
  .post("/createAddress", verifyToken, addressController.create)
  .get("/user", verifyToken, addressController.getByUserId)
  .patch("/updateById/:id", verifyToken, addressController.updateById)
  .delete("/deleteById/:id", verifyToken, addressController.deleteById);

module.exports = router;
