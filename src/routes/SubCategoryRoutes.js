const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const subCategoryController = require("../controllers/subCategoryController/SubCategoryController");
const { uploadMultipart, deleteFileFromS3 } = require("../utils/S3");
const SubCategory = require("../models/SubCategory");
const { ApiResponse } = require("../utils/ApiResponse");
const Category = require("../models/Category");
const { verifyToken } = require("../middleware/VerifyToken");
const checkAdminRole = require("../middleware/checkAdminRole");

const SubCategoryRouter = express.Router();

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new subcategory with image upload
SubCategoryRouter.post("/",verifyToken,checkAdminRole, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse(null, "No file uploaded", false, 400));
    }

    const existingSubCategory = await SubCategory.findOne({ name: req.body.name });
    if (existingSubCategory) {
      return res.status(400).json(ApiResponse(null, "Subcategory with this name already exists", false, 400));
    }

    const category = await Category.findById(req.body.categoryId);
    if (!category) {
      return res.status(400).json(ApiResponse(null, "Category not found", false, 400));
    }

    const newSubCategoryId = new mongoose.Types.ObjectId();
    const fileUrl = await uploadMultipart(req.file, `categories/${req.body.categoryId}`, newSubCategoryId || "default");
    console.log("File uploaded to:", fileUrl);

    req.body.imageUrl = fileUrl; // Attach image URL to request body

    const subCategory = await subCategoryController.createSubCategory(req, res, newSubCategoryId);

    // Check if there was an error during subcategory creation
    if (subCategory.error) {
      return res.status(400).json(ApiResponse(null, subCategory.error, false, 400));
    }

    res.status(201).json(ApiResponse(subCategory, "Subcategory created successfully", true, 201));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse(null, "Subcategory creation failed", false, 500, error.message));
  }
});

SubCategoryRouter.get("/totalSubcategories",verifyToken, subCategoryController.getTotalSubCategories);

// Get all subcategories
SubCategoryRouter.get("/", subCategoryController.getAllSubCategories);

// Get subcategories by category ID
SubCategoryRouter.get("/category/:categoryId", subCategoryController.getSubCategoriesByCategory);

// Get a single subcategory by ID
SubCategoryRouter.get("/:id", subCategoryController.getSubCategoryById);

// Update a subcategory with new image upload
SubCategoryRouter.put("/:id",verifyToken,checkAdminRole, upload.single("image"), async (req, res) => {
  try {
    console.log("req.params.id", req.params.id);
    const existingSubCategory = await SubCategory.findById(req.params.id);
    console.log("existingSubCategory", existingSubCategory);
    if (!existingSubCategory) {
      return res.status(404).json(ApiResponse(null, "Subcategory not found", false, 404));
    }

    const category = await Category.findById(req.body.categoryId);
    if (!category) {
      return res.status(400).json(ApiResponse(null, "Category not found", false, 400));
    }


    if (req.file) {
      // Delete previous image from S3
      if (existingSubCategory.imageUrl) {
        await deleteFileFromS3(existingSubCategory.imageUrl);
      }
    }
    if (req.file) {
      const fileUrl = await uploadMultipart(req.file, `categories/${req.body.categoryId}`, req.params.id || "default");
      req.body.imageUrl = fileUrl; // Attach new image URL to request body
    }

    const updatedSubCategory = await subCategoryController.updateSubCategory(req, res);
    res.status(200).json(updatedSubCategory);
  } catch (error) {
    res.status(500).json(ApiResponse(null, "Subcategory update failed", false, 500, error.message));
  }
});

// Delete a subcategory
SubCategoryRouter.delete("/:id",verifyToken,checkAdminRole, subCategoryController.deleteSubCategory);

module.exports = SubCategoryRouter;
