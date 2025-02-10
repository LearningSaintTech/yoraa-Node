const ItemDetails = require("../../models/ItemDetails");
const Item = require("../../models/Item"); // Import Item model
const { uploadMultipart } = require("../../utils/S3"); // Ensure correct import case
const SubCategory = require("../../models/SubCategory");

// ✅ CREATE ItemDetails
exports.createItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;

    // Check if the Item exists
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Parse JSON data from "data" field
    let itemDetailsData = {};
    if (req.body.data) {
      try {
        itemDetailsData = JSON.parse(req.body.data);
      } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format in 'data' field" });
      }
    }

    // Ensure fitDetails is always an array
    if (!Array.isArray(itemDetailsData.fitDetails)) {
      itemDetailsData.fitDetails = itemDetailsData.fitDetails
        ? [itemDetailsData.fitDetails]
        : [];
    }

     const existingSubCategory = await SubCategory.findOne({_id:itemExists.subCategoryId});
        const categoryId = existingSubCategory.categoryId;
          const existingItems = await Item.findOne({ name: req.body.name });
          if (existingItems) {
            // Return early if the category name is already taken
            return res.status(400).json(ApiResponse(null, "Items name already exists", false, 400));
          }

    // Upload images to S3 if provided
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        uploadMultipart(file, `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/details`)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    // Create new ItemDetails with parsed JSON + images
    const newItemDetails = new ItemDetails({
      ...itemDetailsData, // Merged parsed data
      items: itemId,
      images: imageUrls, // Store uploaded image URLs
    });

    // Save to DB
    const savedDetails = await newItemDetails.save();
    res.status(201).json(savedDetails);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ✅ READ ALL ItemDetails
exports.getAllItemDetails = async (req, res) => {
  try {
    const details = await ItemDetails.find().populate("items");
    res.status(200).json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ READ SINGLE ItemDetails BY ID
exports.getItemDetailsByItemId = async (req, res) => {
  try {
    const { itemId } = req.params; // Get the itemId from the request params

    // Find item details by the referenced 'items' field
    const details = await ItemDetails.findOne({ items: itemId }).populate("items");

    if (!details) {
      return res.status(404).json({ error: "Item Details not found for the given Item ID" });
    }

    res.status(200).json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ UPDATE ItemDetails
exports.updateItemDetails = async (req, res) => {
  try {
    const updatedDetails = await ItemDetails.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("items");

    if (!updatedDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }
    res.status(200).json(updatedDetails);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ✅ DELETE ItemDetails
exports.deleteItemDetails = async (req, res) => {
  try {
    const deletedDetails = await ItemDetails.findByIdAndDelete(req.params.id);
    if (!deletedDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }
    res.status(200).json({ message: "Item Details deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
