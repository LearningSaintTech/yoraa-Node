const Item = require("../../models/Item");
const SubCategory = require("../../models/SubCategory");
const { ApiResponse } = require("../../utils/ApiResponse");
const { deleteFileFromS3 } = require("../../utils/S3");

/**
 * Create a new item
 */
exports.createItem = async (req, res,newItemId) => {
  try {

     if (!req.body.imageUrl) {
          return res.status(400).json(ApiResponse(null, "Image is required", false, 400));
        }

    const { name, description, price, stock, subCategoryId } = req.body;

    // Validate subcategory existence
    const subCategory = await SubCategory.findById(subCategoryId);
    if (!subCategory) {
    return  res.status(500).json(ApiResponse(null,"SubCategory not found", false, 500));

    }

    const newItem = new Item({
      _id:newItemId,
      name,
      description,
      price,
      stock,
      subCategoryId,
      imageUrl: req.body.imageUrl ? req.body.imageUrl : null, // Store image URL if present
    });

    await newItem.save();
    res.status(201).json(ApiResponse(newItem, "Item created successfully", true, 201));
  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, err.message, false, 500));
  }
};


/**
 * Get items by subCategoryId
 */
/**
 * Get items by subCategoryId
 */
exports.getItemsBySubCategory = async (req, res) => {
  try {
    const { subCategoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const items = await Item.find({ subCategoryId })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))

    const totalItems = await Item.countDocuments({ subCategoryId });

    res.status(200).json(ApiResponse(items, "Items fetched successfully", true, 200, {
      totalPages: Math.ceil(totalItems / limit),
      currentPage: Number(page)
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, "Error fetching items", false, 500, err.message));
  }
};


/**
 * Get all items (with pagination)
 */
exports.getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const items = await Item.find()
      .skip((page - 1) * Number(limit))
      .limit(Number(limit))

    const totalItems = await Item.countDocuments();

    res.status(200).json({
      items,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: Number(page),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json(ApiResponse(null, "Error fetching items", false, 500, err.message));
  }
};

/**
 * Get a single item by ID
 */
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate("subCategoryId");
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching item", error: err.message });
  }
};

/**
 * Update an item
 */
exports.updateItem = async (req, res) => {
  try {
    const { name, description, price, stock, subCategoryId } = req.body;

    if (subCategoryId) {
      const subCategory = await SubCategory.findById(subCategoryId);
      if (!subCategory) {
        return res.status(400).json({ message: "SubCategory not found" });
      }
    }

    const updateData = {
      name,
      description,
      price,
      stock,
      subCategoryId,
      imageUrl: req.body.imageUrl ? req.body.imageUrl : undefined,
    };

    const item = await Item.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating item", error: err.message });
  }
};

/**
 * Delete an item
 */
exports.deleteItem = async (req, res) => {
  try {
    console.log("params",req.params.id)
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    if (item.imageUrl) {
      await deleteFileFromS3(item.imageUrl);
    }

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting item", error: err.message });
  }
};