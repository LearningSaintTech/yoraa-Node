const ItemDetails = require("../../models/ItemDetails");
const Item = require("../../models/Item");
const { uploadMultipart, deleteFileFromS3 } = require("../../utils/S3");
const SubCategory = require("../../models/SubCategory");

// ✅ CREATE ItemDetails
exports.createItemDetails = async (req, res) => {
  try {
    console.log("[REQUEST] Incoming data:", JSON.stringify(req.body, null, 2));
    console.log("[FILES] Incoming files:", req.files);

    const { itemId } = req.params;
    console.log("[STEP 1] Received itemId:", itemId);

    const itemExists = await Item.findById(itemId);
    console.log("[STEP 2] Item exists?", !!itemExists);
    if (!itemExists) {
      return res.status(404).json({ error: "Item not found" });
    }

    let itemDetailsData = {};
    if (req.body.data) {
      try {
        itemDetailsData = JSON.parse(req.body.data);
        console.log("[STEP 3] Parsed itemDetailsData:", itemDetailsData);
      } catch (error) {
        console.error("[ERROR] Invalid JSON in 'data' field:", error.message);
        return res.status(400).json({ error: "Invalid JSON format in 'data' field" });
      }
    }

    console.log("[STEP 4] Processing media uploads...");
    const media = await processMediaUploads(req.files, itemExists.subCategoryId, itemId);
    console.log("[STEP 5] Media processed:", JSON.stringify(media, null, 2));

    const newItemDetails = new ItemDetails({
      ...itemDetailsData,
      items: itemId,
      media,
    });
    console.log("[STEP 6] New ItemDetails object:", JSON.stringify(newItemDetails, null, 2));

    itemExists.isItemDetail = true;
    await itemExists.save();
    console.log("[STEP 7] Updated Item with isItemDetail flag:", itemExists);

    const savedDetails = await newItemDetails.save();
    console.log("[RESPONSE] Saved ItemDetails:", JSON.stringify(savedDetails, null, 2));

    res.status(201).json(savedDetails);
  } catch (error) {
    console.error("[ERROR] in createItemDetails:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateItemDetails = async (req, res) => {
  try {
    console.log("Received request to update item details", req.params, req.body);

    const { itemId } = req.params;
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      console.log("Item not found", itemId);
      return res.status(404).json({ error: "Item not found" });
    }

    console.log("Item found", itemExists);
    const existingDetails = await ItemDetails.findOne({ items: itemId });
    if (!existingDetails) {
      console.log("Item Details not found for item", itemId);
      return res.status(404).json({ error: "Item Details not found" });
    }

    console.log("Existing item details found", existingDetails);

    // Parse request data
    let itemDetailsData = {};
    let colors = [];
    let priorityArray = [];
    let deletedMedia = [];

    try {
      if (req.body.data) itemDetailsData = JSON.parse(req.body.data);
      if (req.body.colors) colors = JSON.parse(req.body.colors);
      if (req.body.priority) priorityArray = JSON.parse(req.body.priority);
      if (req.body.deletedMedia) deletedMedia = JSON.parse(req.body.deletedMedia);
    } catch (error) {
      console.error("Failed to parse JSON data", error);
      return res.status(400).json({ error: "Invalid JSON format in request body" });
    }

    console.log("Parsed item details data", itemDetailsData);
    console.log("Parsed colors", colors);
    console.log("Parsed priorities", priorityArray);
    console.log("Parsed deleted media", deletedMedia);

    // Ensure fitDetails and sizes are arrays
    if (!Array.isArray(itemDetailsData.fitDetails)) {
      itemDetailsData.fitDetails = itemDetailsData.fitDetails ? [itemDetailsData.fitDetails] : existingDetails.fitDetails || [];
    }
    if (itemDetailsData.sizes && !Array.isArray(itemDetailsData.sizes)) {
      itemDetailsData.sizes = [itemDetailsData.sizes];
    }

    const existingSubCategory = await SubCategory.findOne({ _id: itemExists.subCategoryId });
    const categoryId = existingSubCategory.categoryId;
    console.log("Found category and subcategory", categoryId, existingSubCategory);

    let media = [...(existingDetails.media || [])];

    // Handle deleted media
    if (deletedMedia.length > 0) {
      console.log("Processing deleted media", deletedMedia);
      const mediaToDelete = [];
      media = media.map((colorGroup) => {
        const updatedMediaItems = colorGroup.mediaItems.filter((item) => {
          const shouldDelete = deletedMedia.some((d) => d.url === item.url && d.color === colorGroup.color);
          if (shouldDelete) mediaToDelete.push(item.url);
          return !shouldDelete;
        });
        return { ...colorGroup, mediaItems: updatedMediaItems };
      }).filter((group) => group.mediaItems.length > 0);

      if (mediaToDelete.length > 0) {
        await deleteFileFromS3(mediaToDelete);
        console.log("Deleted media from S3", mediaToDelete);
      }
    }

    const totalMediaPerColor = 5;
    const newImageFiles = req.files?.images || [];
    const newVideoFiles = req.files?.videos || [];
    const newMediaFiles = [...newImageFiles, ...newVideoFiles];

    // Validate and process new media
    if (newMediaFiles.length > 0 || colors.length > 0) {
      if (newMediaFiles.length > colors.length * totalMediaPerColor) {
        console.log("Too many media items for colors", colors);
        return res.status(400).json({ error: `Cannot upload more than ${totalMediaPerColor} media items per color.` });
      }

      console.log("Uploading new media files", newMediaFiles);
      let fileIndex = 0;
      for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        const mediaForColor = newMediaFiles.slice(fileIndex, fileIndex + totalMediaPerColor).filter(Boolean); // Filter out undefined

        if (mediaForColor.length > 0) {
          const uploadPromises = mediaForColor.map((file, index) => {
            if (!file) return Promise.resolve(null); // Skip if no file
            const mediaType = file.fieldname === "images" ? "image" : "video";
            const priority = priorityArray[fileIndex + index] != null ? priorityArray[fileIndex + index] : fileIndex + index; // Default to sequential if no priority
            return uploadMultipart(file, `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/media/${color}_${mediaType}_${index}`)
              .then((url) => url ? { url, type: mediaType, priority } : null)
              .catch((error) => {
                console.error("Error uploading media", error);
                return null;
              });
          });

          const mediaItems = (await Promise.all(uploadPromises)).filter(Boolean); // Filter out nulls
          console.log("Uploaded media items for color", color, mediaItems);

          const existingColorGroup = media.find((group) => group.color === color);
          if (existingColorGroup) {
            existingColorGroup.mediaItems = [...existingColorGroup.mediaItems, ...mediaItems];
          } else {
            media.push({ color, mediaItems: mediaItems });
          }

          fileIndex += mediaForColor.length;
        }
      }
    }

    // Apply priorities from frontend if provided, otherwise sort by existing priority
    const allMediaItems = media.flatMap((group) => group.mediaItems);
    if (priorityArray.length === allMediaItems.length) {
      allMediaItems.forEach((item, index) => {
        item.priority = priorityArray[index];
      });
    } else {
      // Sort by existing or default priority
      allMediaItems.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      allMediaItems.forEach((item, index) => {
        item.priority = index;
      });
    }

    // Reorganize media by color
    media = colors.map(color => ({
      color,
      mediaItems: allMediaItems.filter(item => 
        media.find(group => group.color === color)?.mediaItems.some(m => m.url === item.url)
      )
    })).filter(group => group.mediaItems.length > 0);

    console.log("Sorted and prioritized media", media);

    // Handle size charts and measurements
    let sizeChartInch = existingDetails.sizeChartInch;
    if (req.files?.sizeChartInch?.[0]) {
      console.log("Uploading new size chart (inch)");
      if (sizeChartInch) await deleteFileFromS3([sizeChartInch]);
      sizeChartInch = await uploadMultipart(req.files.sizeChartInch[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartInch`);
    }

    let sizeChartCm = existingDetails.sizeChartCm;
    if (req.files?.sizeChartCm?.[0]) {
      console.log("Uploading new size chart (cm)");
      if (sizeChartCm) await deleteFileFromS3([sizeChartCm]);
      sizeChartCm = await uploadMultipart(req.files.sizeChartCm[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartCm`);
    }

    let sizeMeasurement = existingDetails.sizeMeasurement;
    if (req.files?.sizeMeasurement?.[0]) {
      console.log("Uploading new size measurement file");
      if (sizeMeasurement) await deleteFileFromS3([sizeMeasurement]);
      sizeMeasurement = await uploadMultipart(req.files.sizeMeasurement[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeMeasurement`);
    }

    console.log("Saving updated item details...");
    const updatedDetails = await ItemDetails.findOneAndUpdate(
      { items: itemId },
      {
        ...itemDetailsData,
        items: itemId,
        media,
        sizeChartInch,
        sizeChartCm,
        sizeMeasurement,
        __v: existingDetails.__v + 1, // Increment version
      },
      { new: true, runValidators: true }
    ).populate("items");

    console.log("Item details updated successfully", updatedDetails);
    res.status(200).json(updatedDetails);

  } catch (error) {
    console.error("Error updating item details", error);
    res.status(500).json({ error: error.message || "Internal server error" });
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
    console.log("details",details)
    res.status(200).json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ UPDATE ItemDetails


// ✅ DELETE ItemDetails with S3 Media Cleanup
exports.deleteItemDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const itemDetails = await ItemDetails.findById(id);
    if (!itemDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    const allMedia = [
      ...itemDetails.media.flatMap((group) => group.mediaItems.map((item) => item.url)),
      itemDetails.sizeChartInch,
      itemDetails.sizeChartCm,
      itemDetails.sizeMeasurement,
    ].filter(Boolean);
    if (allMedia.length > 0) {
      await deleteFileFromS3(allMedia);
    }

    await ItemDetails.findByIdAndDelete(id);
    await Item.findByIdAndUpdate(itemDetails.items, { isItemDetail: false });

    res.status(200).json({ message: "Item Details deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ DELETE Specific Media from ItemDetails
exports.deleteMediaFromItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { mediaUrl, color } = req.body;
    if (!mediaUrl || !color) {
      return res.status(400).json({ error: "Media URL and color are required" });
    }

    const itemDetails = await ItemDetails.findOne({ items: itemId });
    if (!itemDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    const colorGroup = itemDetails.media.find((group) => group.color === color);
    if (!colorGroup) {
      return res.status(404).json({ error: "Color group not found" });
    }

    const mediaIndex = colorGroup.mediaItems.findIndex((item) => item.url === mediaUrl);
    if (mediaIndex !== -1) {
      await deleteFileFromS3([mediaUrl]);
      colorGroup.mediaItems.splice(mediaIndex, 1);
      if (colorGroup.mediaItems.length === 0) {
        itemDetails.media = itemDetails.media.filter((group) => group.color !== color);
      }
      await itemDetails.save();
      res.status(200).json({ message: "Media deleted successfully", updatedDetails: itemDetails });
    } else {
      return res.status(404).json({ error: "Media not found in Item Details" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};