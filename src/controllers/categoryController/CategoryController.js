const Category = require("../../models/Category");
const {ApiResponse} = require("../../utils/ApiResponse");
const { deleteFileFromS3 } = require("../../utils/S3");

exports.createCategory = async (req, res,newCategoryId) => {
  try {
    if (!req.body.imageUrl) {
      return res.status(400).json(ApiResponse(null, "Image is required", false, 400));
    }

    const newCategory = new Category({
      _id: newCategoryId, // Assign the generated ID
      name: req.body.name,
      description: req.body.description,
      imageUrl: req.body.imageUrl, // Image URL from S3
    });

    await newCategory.save();
    res.status(201).json(ApiResponse(newCategory, "Category created successfully", true, 201));
  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, err.message, false, 500));
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(ApiResponse(categories, "Categories fetched successfully", true, 200));
  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, err.message, false, 500));
  }
};

// Get a single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json(ApiResponse(null, "Category not found", false, 404));
    }
    res.status(200).json(ApiResponse(category, "Category fetched successfully", true, 200));
  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, err.message, false, 500));
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json(ApiResponse(null, "Category not found", false, 404));
    }

    category.name = req.body.name || category.name;
    category.description = req.body.description || category.description;
    category.imageUrl = req.body.imageUrl || category.imageUrl; // Use imageUrl from request body

    await category.save();
    res.status(200).json(ApiResponse(category, "Category updated successfully", true, 200));
  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, err.message, false, 500));
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json(ApiResponse(null, "Category not found", false, 404));
    }

    // Delete category image from S3 if it exists
    if (category.imageUrl) {
      await deleteFileFromS3(category.imageUrl);
    }

    await category.deleteOne(); // Using deleteOne instead of remove (remove is deprecated)
    res.status(200).json(ApiResponse(null, "Category deleted successfully", true, 200));

  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, err.message, false, 500));
  }
};