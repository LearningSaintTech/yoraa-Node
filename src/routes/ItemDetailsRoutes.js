const express = require("express");
const router = express.Router();
const itemDetailsController = require("../controllers/itemController/ItemDetailsController");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
}).fields([
  { name: "images", maxCount: 25 },
  { name: "videos", maxCount: 25 },
  { name: "sizeChartInch", maxCount: 1 },
  { name: "sizeChartCm", maxCount: 1 },
  { name: "sizeMeasurement", maxCount: 1 },
]);

router.get("/zero-stock", itemDetailsController.getZeroStockItemDetails);
router.get("/out-of-stock/count", itemDetailsController.getOutOfStockCount);
router.post("/:itemId", upload, itemDetailsController.createItemDetails);
router.get("/", itemDetailsController.getAllItemDetails);
router.get("/:itemId", itemDetailsController.getItemDetailsByItemId);
router.put("/update/:itemId", upload, itemDetailsController.updateItemDetails);
router.delete("/:id", itemDetailsController.deleteItemDetails);
router.post("/delete-media/:itemId", itemDetailsController.deleteMediaFromItemDetails);

module.exports = router;