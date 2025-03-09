const ItemDetails = require("../../models/ItemDetails");
const Item = require("../../models/Item");
const { uploadMultipart, deleteFileFromS3 } = require("../../utils/S3");
const SubCategory = require("../../models/SubCategory");

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

    // Ensure sizes is an array if provided
    if (itemDetailsData.sizes && !Array.isArray(itemDetailsData.sizes)) {
      itemDetailsData.sizes = [itemDetailsData.sizes];
    }

    const existingSubCategory = await SubCategory.findOne({ _id: itemExists.subCategoryId });
    const categoryId = existingSubCategory.categoryId;

    // Upload general images to S3 if provided
    let imageUrls = [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      const uploadPromises = req.files.images.map((file) =>
        uploadMultipart(file, `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/details`)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    // Upload specific size chart images to S3
    const sizeChartInch = req.files && req.files.sizeChartInch
      ? await uploadMultipart(req.files.sizeChartInch[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartInch`)
      : null;
    const sizeChartCm = req.files && req.files.sizeChartCm
      ? await uploadMultipart(req.files.sizeChartCm[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartCm`)
      : null;
    const sizeMeasurement = req.files && req.files.sizeMeasurement
      ? await uploadMultipart(req.files.sizeMeasurement[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeMeasurement`)
      : null;

    // Create new ItemDetails with parsed JSON + images
    const newItemDetails = new ItemDetails({
      ...itemDetailsData,
      items: itemId,
      images: imageUrls,
      sizeChartInch,
      sizeChartCm,
      sizeMeasurement,
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

// ✅ READ SINGLE ItemDetails BY ITEM ID
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

// ✅ UPDATE ItemDetails
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

    // Ensure fitDetails and sizes are arrays
    if (!Array.isArray(itemDetailsData.fitDetails)) {
      itemDetailsData.fitDetails = itemDetailsData.fitDetails ? [itemDetailsData.fitDetails] : existingDetails.fitDetails;
    }
    if (itemDetailsData.sizes && !Array.isArray(itemDetailsData.sizes)) {
      itemDetailsData.sizes = [itemDetailsData.sizes];
    }

    const existingSubCategory = await SubCategory.findOne({ _id: itemExists.subCategoryId });
    const categoryId = existingSubCategory.categoryId;

    // Handle general images
    let imageUrls = existingDetails.images || [];
    if (req.files && req.files.images && req.files.images.length > 0) {
      console.log("New images uploaded, deleting old images...");
      if (imageUrls.length > 0) {
        await deleteFileFromS3(imageUrls);
      }
      const uploadPromises = req.files.images.map((file) =>
        uploadMultipart(file, `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/details`)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    // Handle specific size chart images
    let sizeChartInch = existingDetails.sizeChartInch;
    if (req.files && req.files.sizeChartInch) {
      if (sizeChartInch) await deleteFileFromS3([sizeChartInch]);
      sizeChartInch = await uploadMultipart(req.files.sizeChartInch[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartInch`);
    }

    let sizeChartCm = existingDetails.sizeChartCm;
    if (req.files && req.files.sizeChartCm) {
      if (sizeChartCm) await deleteFileFromS3([sizeChartCm]);
      sizeChartCm = await uploadMultipart(req.files.sizeChartCm[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartCm`);
    }

    let sizeMeasurement = existingDetails.sizeMeasurement;
    if (req.files && req.files.sizeMeasurement) {
      if (sizeMeasurement) await deleteFileFromS3([sizeMeasurement]);
      sizeMeasurement = await uploadMultipart(req.files.sizeMeasurement[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeMeasurement`);
    }

    // Update ItemDetails
    const updatedDetails = await ItemDetails.findOneAndUpdate(
      { items: itemId },
      {
        ...itemDetailsData,
        items: itemId,
        images: imageUrls,
        sizeChartInch,
        sizeChartCm,
        sizeMeasurement,
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
  console.log("deleteItemDetails");
  try {
    const { id } = req.params;
    console.log("id", id);

    // Find the item details
    const itemDetails = await ItemDetails.findById(id);
    if (!itemDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    // Delete all images from S3
    const allImages = [
      ...itemDetails.images,
      itemDetails.sizeChartInch,
      itemDetails.sizeChartCm,
      itemDetails.sizeMeasurement,
    ].filter(Boolean); // Filter out null/undefined values
    if (allImages.length > 0) {
      await deleteFileFromS3(allImages);
    }

    // Remove ItemDetails from DB
    await ItemDetails.findByIdAndDelete(id);

    // Update related Item
    await Item.findByIdAndUpdate(itemDetails.items, { isItemDetail: false });

    res.status(200).json({ message: "Item Details deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ DELETE Specific Image from ItemDetails
exports.deleteImageFromItemDetails = async (req, res) => {
  console.log("deleteImageFromItemDetails");
  try {
    const { itemId } = req.params;
    const { imageUrl } = req.body;
    console.log("itemId", itemId);
    console.log("imageUrl", imageUrl);

    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Find the item details
    const itemDetails = await ItemDetails.findOne({ items: itemId });
    if (!itemDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    // Handle deletion from general images array
    if (itemDetails.images.includes(imageUrl)) {
      await deleteFileFromS3([imageUrl]);
      itemDetails.images = itemDetails.images.filter((img) => img !== imageUrl);
    }
    // Handle deletion of specific size chart images
    else if (itemDetails.sizeChartInch === imageUrl) {
      await deleteFileFromS3([imageUrl]);
      itemDetails.sizeChartInch = null;
    }
    else if (itemDetails.sizeChartCm === imageUrl) {
      await deleteFileFromS3([imageUrl]);
      itemDetails.sizeChartCm = null;
    }
    else if (itemDetails.sizeMeasurement === imageUrl) {
      await deleteFileFromS3([imageUrl]);
      itemDetails.sizeMeasurement = null;
    }
    else {
      return res.status(404).json({ error: "Image not found in Item Details" });
    }

    await itemDetails.save();
    console.log("Updated ItemDetails Images:", itemDetails);
    res.status(200).json({ message: "Image deleted successfully", updatedDetails: itemDetails });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};