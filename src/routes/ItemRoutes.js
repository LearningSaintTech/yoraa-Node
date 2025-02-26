const express = require("express");
const multer = require("multer");
const itemController = require("../controllers/itemController/ItemController");
const { uploadMultipart,deleteFileFromS3 } = require("../utils/S3");
const mongoose = require("mongoose");
const { ApiResponse } = require("../utils/ApiResponse");
const { verifyToken } = require("../middleware/VerifyToken");
const Item = require("../models/Item");
const SubCategory = require("../models/SubCategory");
const checkAdminRole = require("../middleware/checkAdminRole");

const itemRouter = express.Router();

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new item with image upload
itemRouter.post("/",verifyToken,checkAdminRole, upload.single("image"), async (req, res) => {
  console.log("qqqqqqqqqqqqqq")
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse(null, "No file uploaded", false, 400));
    }

    console.log("qqqqqqqqqqqqqq11111111111",req.body)

    const existingSubCategory = await SubCategory.findOne({_id:req.body.subCategoryId});
    const categoryId = existingSubCategory.categoryId;
    console.log("qqq2222",categoryId)

      const existingItems = await Item.findOne({ name: req.body.name });
      if (existingItems) {
        // Return early if the category name is already taken
        return res.status(400).json(ApiResponse(null, "Items name already exists", false, 400));
      }
    // Upload file to S3
        const newItemId = new mongoose.Types.ObjectId();
    
    const fileUrl = await uploadMultipart(req.file, `categories/${categoryId}/${existingSubCategory._id}`, newItemId || "default");
    console.log("File uploaded to:", fileUrl);

    req.body.imageUrl = fileUrl; // Attach image URL to request body

    const item = await itemController.createItem(req, res,newItemId);
    if (!item) {
      return; // Early return if category creation fails (if needed)
    }
    res.status(201).json(ApiResponse(item, "item created successfully", true, 201));
  } catch (error) {
    res.status(500).json(ApiResponse(null, "Item creation failed", false, 500, error.message));
  }
});

// Get all items
itemRouter.get("/", itemController.getAllItems);
itemRouter.post("/filter", itemController.getItemsByFilter);

// Get a single item by ID
itemRouter.get("/:id", itemController.getItemById);
itemRouter.get("/latest-items/:subCategoryId", itemController.getLatestItemsBySubCategory);


itemRouter.get("/subcategory/:subCategoryId", itemController.getItemsBySubCategory);

// Update an item with new image upload
itemRouter.put("/:id",verifyToken,checkAdminRole, upload.single("image"), async (req, res) => {
  try {


    const existingItems = await Item.findById(req.params.id);
    console.log("existingItems", existingItems);
    if (!existingItems) {
      return res.status(404).json(ApiResponse(null, "itmes not found", false, 404));
    }
    const existingSubCategory = await SubCategory.findOne({_id:existingItems.subCategoryId});
    const categoryId = existingSubCategory.categoryId;




    if (req.file) {
      // Delete previous image from S3
      if (existingItems.imageUrl) {
        await deleteFileFromS3(existingItems.imageUrl);
      }
    }


    if (req.file) {
      const fileUrl = await uploadMultipart(req.file, `categories/${categoryId}/${existingSubCategory._id}`, req.params.id || "default");
      req.body.imageUrl = fileUrl; // Attach new image URL to request body
    }

    const updatedItem = await itemController.updateItem(req, res);
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json(ApiResponse(null, "Item update failed", false, 500, error.message));
  }
});

// Delete an item
itemRouter.delete("/:id",verifyToken,checkAdminRole, itemController.deleteItem);

module.exports = itemRouter;
