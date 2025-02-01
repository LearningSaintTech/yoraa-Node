const express = require("express");
const multer = require("multer");
const categoryController = require("../controllers/categoryController/CategoryController");
const { uploadMultipart, deleteFileFromS3 } = require("../utils/S3");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const { ApiResponse } = require("../utils/ApiResponse");
const { verifyToken } = require("../middleware/VerifyToken");

const CategoryRouter = express.Router();

// Configure multer for in-memory storage (No local storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new category with image upload
CategoryRouter.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      // Return early if no file is uploaded
      return res.status(400).json(ApiResponse(null, "No file uploaded", false, 400));
    }
    const existingCategory = await Category.findOne({ name: req.body.name });
    if (existingCategory) {
      // Return early if the category name is already taken
      return res.status(400).json(ApiResponse(null, "Category name already exists", false, 400));
    }
    const newCategoryId = new mongoose.Types.ObjectId();
    const fileUrl = await uploadMultipart(req.file, "categories", newCategoryId || "default");
    console.log("File uploaded to:", fileUrl);

    req.body.imageUrl = fileUrl; // Attach image URL to request body
    const category = await categoryController.createCategory(req, res, newCategoryId);

    // Ensure no further response is sent after this point
    if (!category) {
      return; // Early return if category creation fails (if needed)
    }

    res.status(201).json(ApiResponse(category, "Category created successfully", true, 201));
  } catch (error) {
    console.error(error);
    // Check if response was already sent
    if (!res.headersSent) {
      res.status(500).json(ApiResponse(null, "Category creation failed", false, 500, error.message));
    }
  }
});

// Get all categories
CategoryRouter.get("/", verifyToken, categoryController.getAllCategories);

// Get a single category by ID
CategoryRouter.get("/:id", categoryController.getCategoryById);

// Update a category with new image upload
CategoryRouter.put("/:id", upload.single("image"), async (req, res) => {
  try {

    console.log("req.params.id", req.params.id)
    const existingCategory = await Category.findById(req.params.id);
    console.log("existingCategory", existingCategory)
    if (!existingCategory) {
      return res.status(404).json(ApiResponse(null, "Category not found", false, 404));
    }

    if (req.file) {
      // Delete previous image from S3
      if (existingCategory.imageUrl) {
        await deleteFileFromS3(existingCategory.imageUrl);
      }
    }
    if (req.file) {
      const fileUrl = await uploadMultipart(req.file, "categories", req.params.id);
      req.body.imageUrl = fileUrl; // Attach new image URL to request body
    }

    const updatedCategory = await categoryController.updateCategory(req, res);
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(500).json(ApiResponse(null, "Category update failed", false, 500, error.message));
  }
});

// Delete a category
CategoryRouter.delete("/:id", categoryController.deleteCategory);

module.exports = CategoryRouter;
