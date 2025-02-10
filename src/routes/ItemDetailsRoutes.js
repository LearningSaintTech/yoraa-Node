const express = require("express");
const router = express.Router();
const itemDetailsController = require("../controllers/itemController/ItemDetailsController");
// Define CRUD routes
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to create item details (with image upload)
router.post(
  "/:itemId",
  upload.array("images", 5), // Accept up to 5 images
  itemDetailsController.createItemDetails
);
router.get("/", itemDetailsController.getAllItemDetails);
router.get("/:itemId", itemDetailsController.getItemDetailsByItemId);
router.put("/:id", itemDetailsController.updateItemDetails);
router.delete("/:id", itemDetailsController.deleteItemDetails);

module.exports = router;
