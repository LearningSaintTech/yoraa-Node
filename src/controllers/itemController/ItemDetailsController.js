const ItemDetails = require("../../models/ItemDetails");
const Item = require("../../models/Item");
const { uploadMultipart } = require("../../utils/S3");
const SubCategory = require("../../models/SubCategory");
const { deleteFileFromS3 } = require("../../utils/S3");

// ✅ CREATE ItemDetails
exports.createItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log("item", itemId);

    // Check if the Item exists
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Parse JSON data from "data" field
    let itemDetailsData = {};
    if (req.body.data) {
      try {
        console.log("req.body.data");
        itemDetailsData = JSON.parse(req.body.data);
        console.log("itemDetailsData", itemDetailsData);
      } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format in 'data' field" });
      }
    }

    // Ensure fitDetails is always an array
    if (!Array.isArray(itemDetailsData.fitDetails)) {
      itemDetailsData.fitDetails = itemDetailsData.fitDetails ? [itemDetailsData.fitDetails] : [];
    }

    const existingSubCategory = await SubCategory.findOne({ _id: itemExists.subCategoryId });
    const categoryId = existingSubCategory.categoryId;
    const existingItems = await Item.findOne({ name: req.body.name });
    if (existingItems) {
      return res.status(400).json({ error: "Items name already exists" });
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
      ...itemDetailsData,
      items: itemId,
      images: imageUrls,
    });

    // Save to DB
    itemExists.isItemDetail = true;
    await itemExists.save();
    console.log("newItemDetails", newItemDetails);
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
    const { itemId } = req.params;
    const details = await ItemDetails.findOne({ items: itemId }).populate("items");
    if (!details) {
      return res.status(404).json({ error: "Item Details not found for the given Item ID" });
    }
    res.status(200).json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.updateItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log("Item ID:", itemId);

    // Check if the Item exists
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Find existing ItemDetails by itemId
    const existingDetails = await ItemDetails.findOne({ items: itemId });
    if (!existingDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    // Parse JSON data from "data" field
    let itemDetailsData = {};
    if (req.body.data) {
      try {
        console.log("Parsing req.body.data...");
        itemDetailsData = JSON.parse(req.body.data);
        console.log("Parsed itemDetailsData:", itemDetailsData);
      } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format in 'data' field" });
      }
    }

    // Ensure fitDetails is always an array
    if (!Array.isArray(itemDetailsData.fitDetails)) {
      itemDetailsData.fitDetails = itemDetailsData.fitDetails ? [itemDetailsData.fitDetails] : [];
    }

    const existingSubCategory = await SubCategory.findOne({ _id: itemExists.subCategoryId });
    const categoryId = existingSubCategory.categoryId;

    // Image handling: Replace existing images if new ones are uploaded
    let imageUrls = existingDetails.images || [];

    if (req.files && req.files.length > 0) {
      console.log("New images uploaded, deleting old images...");

      // Delete existing images from S3 before uploading new ones
      if (imageUrls.length > 0) {
        await deleteFileFromS3(imageUrls);
      }

      // Upload new images
      const uploadPromises = req.files.map((file) =>
        uploadMultipart(file, `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/details`)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    // Update ItemDetails with parsed JSON + new images
    const updatedDetails = await ItemDetails.findOneAndUpdate(
      { items: itemId },
      {
        ...itemDetailsData,
        items: itemId,
        images: imageUrls, // Store new image URLs after replacement
      },
      { new: true }
    ).populate("items");

    console.log("Updated ItemDetails:", updatedDetails);
    res.status(200).json(updatedDetails);
  } catch (error) {
    console.log("Error:", error);
    res.status(400).json({ error: error.message });
  }
};


// ✅ DELETE ItemDetails with S3 Image Cleanup
exports.deleteItemDetails = async (req, res) => {
  console.log("deleteItemDetails")
  try {
    const { id } = req.params;
console.log("id",id)
    // Find the item details
    const itemDetails = await ItemDetails.findById(id);
    if (!itemDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    // Delete images from S3 (assuming deleteS3Objects exists)
    if (itemDetails.images && itemDetails.images.length > 0) {
      await deleteFileFromS3(itemDetails.images);
    }

    // Remove ItemDetails from DB
    await ItemDetails.findByIdAndDelete(id);

    // Update related Item to reflect deletion
    await Item.findByIdAndUpdate(itemDetails.items, { isItemDetail: false });

    res.status(200).json({ message: "Item Details deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteImageFromItemDetails = async (req, res) => {
  console.log("qqqqqqqqqqqqqqq")
  try {
    const { itemId } = req.params;
    const { imageUrl } = req.body;
console.log("itemId",itemId)
console.log("imageUrl",imageUrl)

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Find the item details
    const itemDetails = await ItemDetails.findOne({ items: itemId });
    if (!itemDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    // Check if the image exists in the current images list
    if (!itemDetails.images.includes(imageUrl)) {
      return res.status(404).json({ error: "Image not found in Item Details" });
    }

    // Delete the image from S3
    await deleteFileFromS3(imageUrl);

    // Remove the image from the database
    const updatedImages = itemDetails.images.filter((img) => img !== imageUrl);
    itemDetails.images = updatedImages;
    await itemDetails.save();
    
    console.log("Updated ItemDetails Images:", itemDetails.images);
    
    res.status(200).json({ message: "Image deleted successfully", updatedImages });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
