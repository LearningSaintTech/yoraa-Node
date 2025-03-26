const express = require("express");
const router = express.Router();
const itemDetailsController = require("../controllers/itemController/ItemDetailsController");
const multer = require("multer");

const storage = multer.memoryStorage();
// Configure multer to handle both images and videos (up to 5 media items per color, total 25)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
}).fields([
  { name: "images", maxCount: 25 }, // Up to 5 colors * 5 images
  { name: "videos", maxCount: 25 }, // Up to 5 colors * 5 videos
  { name: "sizeChartInch", maxCount: 1 },
  { name: "sizeChartCm", maxCount: 1 },
  { name: "sizeMeasurement", maxCount: 1 },
]);

// Route to create item details (with multiple file uploads)
router.post("/:itemId", upload, itemDetailsController.createItemDetails);

// Route to get all item details
router.get("/", itemDetailsController.getAllItemDetails);

// Route to get item details by itemId
router.get("/:itemId", itemDetailsController.getItemDetailsByItemId);

// Route to update item details (with multiple file uploads)
router.put("/:itemId", upload, itemDetailsController.updateItemDetails);

// Route to delete item details
router.delete("/:id", itemDetailsController.deleteItemDetails);

// Route to delete a specific media from item details
router.post("/item-details/:itemId/delete-media", itemDetailsController.deleteMediaFromItemDetails);

module.exports = router;