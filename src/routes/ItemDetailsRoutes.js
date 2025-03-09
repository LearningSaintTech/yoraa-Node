const express = require("express");
const router = express.Router();
const itemDetailsController = require("../controllers/itemController/ItemDetailsController");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).fields([
  { name: "images", maxCount: 5 }, // General images (up to 5)
  { name: "sizeChartInch", maxCount: 1 }, // Size chart in inches
  { name: "sizeChartCm", maxCount: 1 }, // Size chart in centimeters
  { name: "sizeMeasurement", maxCount: 1 }, // Size measurement image
]);

// Route to create item details (with multiple file uploads)
router.post(
  "/:itemId",
  upload,
  itemDetailsController.createItemDetails
);

// Route to get all item details
router.get("/", itemDetailsController.getAllItemDetails);

// Route to get item details by itemId
router.get("/:itemId", itemDetailsController.getItemDetailsByItemId);

// Route to update item details (with multiple file uploads)
router.put(
  "/:itemId",
  upload,
  itemDetailsController.updateItemDetails
);

// Route to delete item details
router.delete("/:id", itemDetailsController.deleteItemDetails);

// Route to delete a specific image from item details
router.post("/item-details/:itemId/delete-image", itemDetailsController.deleteImageFromItemDetails);

module.exports = router;