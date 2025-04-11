const express = require("express");
const router = express.Router();
const filterController = require("../controllers/filter/FilterController");

router.post("/", filterController.createFilter);
router.get("/", filterController.getAllFilters);
router.get("/:id", filterController.getFilterById);
router.put("/:id", filterController.updateFilter);
router.delete("/:id", filterController.deleteFilter);

module.exports = router;
