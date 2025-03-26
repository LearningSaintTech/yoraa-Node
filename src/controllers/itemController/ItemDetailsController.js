const ItemDetails = require("../../models/ItemDetails");
const Item = require("../../models/Item");
const { uploadMultipart, deleteFileFromS3 } = require("../../utils/S3");
const SubCategory = require("../../models/SubCategory");

// ✅ CREATE ItemDetails
exports.createItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;
    console.log("item", itemId);

    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json({ error: "Item not found" });
    }

    let itemDetailsData = {};
    if (req.body.data) {
      try {
        itemDetailsData = JSON.parse(req.body.data);
        console.log("itemDetailsData:", itemDetailsData);
      } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format in 'data' field" });
      }
    }

    if (!Array.isArray(itemDetailsData.fitDetails)) {
      itemDetailsData.fitDetails = itemDetailsData.fitDetails ? [itemDetailsData.fitDetails] : [];
    }
    if (itemDetailsData.sizes && !Array.isArray(itemDetailsData.sizes)) {
      itemDetailsData.sizes = [itemDetailsData.sizes];
    }

    const existingSubCategory = await SubCategory.findOne({ _id: itemExists.subCategoryId });
    const categoryId = existingSubCategory.categoryId;

    let media = [];
    const totalMediaPerColor = 5;
    const colors = req.body.colors ? JSON.parse(req.body.colors) : [];
    const priorityArray = req.body.priority ? JSON.parse(req.body.priority) : [];

    const newMediaFiles = [
      ...(req.files.images || []),
      ...(req.files.videos || []),
    ];
    if (newMediaFiles.length > 0) {
      let fileIndex = 0;
      for (const color of colors) {
        const mediaForColor = newMediaFiles.slice(fileIndex, fileIndex + totalMediaPerColor);
        if (mediaForColor.length > totalMediaPerColor) {
          return res.status(400).json({ error: `Cannot upload more than ${totalMediaPerColor} media items per color.` });
        }
        const uploadPromises = mediaForColor.map((file, index) => {
          const mediaType = file.fieldname === "images" ? "image" : "video";
          const priority = priorityArray[fileIndex + index] || index;
          return uploadMultipart(file, `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/media/${color}_${mediaType}_${index}`)
            .then((url) => ({ url, type: mediaType, priority }));
        });
        const mediaItems = await Promise.all(uploadPromises);
        media.push({ color, mediaItems });
        fileIndex += totalMediaPerColor;
      }
    }

    const sizeChartInch = req.files && req.files.sizeChartInch
      ? await uploadMultipart(req.files.sizeChartInch[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartInch`)
      : null;
    const sizeChartCm = req.files && req.files.sizeChartCm
      ? await uploadMultipart(req.files.sizeChartCm[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeChartCm`)
      : null;
    const sizeMeasurement = req.files && req.files.sizeMeasurement
      ? await uploadMultipart(req.files.sizeMeasurement[0], `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/sizeMeasurement`)
      : null;

    const newItemDetails = new ItemDetails({
      ...itemDetailsData,
      items: itemId,
      media,
      sizeChartInch,
      sizeChartCm,
      sizeMeasurement,
    });

    itemExists.isItemDetail = true;
    await itemExists.save();
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
    console.log("details",details)
    res.status(200).json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ UPDATE ItemDetails
exports.updateItemDetails = async (req, res) => {
  try {
    const { itemId } = req.params;
    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json({ error: "Item not found" });
    }

    const existingDetails = await ItemDetails.findOne({ items: itemId });
    if (!existingDetails) {
      return res.status(404).json({ error: "Item Details not found" });
    }

    let itemDetailsData = {};
    if (req.body.data) {
      try {
        itemDetailsData = JSON.parse(req.body.data);
      } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format in 'data' field" });
      }
    }

    if (!Array.isArray(itemDetailsData.fitDetails)) {
      itemDetailsData.fitDetails = itemDetailsData.fitDetails ? [itemDetailsData.fitDetails] : existingDetails.fitDetails;
    }
    if (itemDetailsData.sizes && !Array.isArray(itemDetailsData.sizes)) {
      itemDetailsData.sizes = [itemDetailsData.sizes];
    }

    const existingSubCategory = await SubCategory.findOne({ _id: itemExists.subCategoryId });
    const categoryId = existingSubCategory.categoryId;

    let media = [...existingDetails.media] || [];
    const deletedMedia = req.body.deletedMedia ? JSON.parse(req.body.deletedMedia) : [];
    if (deletedMedia.length > 0) {
      const mediaToDelete = [];
      media = media.map((colorGroup) => {
        const updatedMediaItems = colorGroup.mediaItems.filter((item) => {
          const shouldDelete = deletedMedia.some((d) => d.url === item.url && d.color === colorGroup.color);
          if (shouldDelete) mediaToDelete.push(item.url);
          return !shouldDelete;
        });
        return { ...colorGroup, mediaItems: updatedMediaItems };
      }).filter((group) => group.mediaItems.length > 0);
      await deleteFileFromS3(mediaToDelete);
    }

    const totalMediaPerColor = 5;
    const newImageFiles = req.files.images || [];
    const newVideoFiles = req.files.videos || [];
    const newMediaFiles = [...newImageFiles, ...newVideoFiles];
    const colors = req.body.colors ? JSON.parse(req.body.colors) : [];
    const priorityArray = req.body.priority ? JSON.parse(req.body.priority) : [];

    if (newMediaFiles.length > 0) {
      let fileIndex = 0;
      for (const color of colors) {
        const mediaForColor = newMediaFiles.slice(fileIndex, fileIndex + totalMediaPerColor);
        if (mediaForColor.length > totalMediaPerColor) {
          return res.status(400).json({ error: `Cannot upload more than ${totalMediaPerColor} media items per color.` });
        }
        const uploadPromises = mediaForColor.map((file, index) => {
          const mediaType = file.fieldname === "images" ? "image" : "video";
          const priority = priorityArray[fileIndex + index] || index;
          return uploadMultipart(file, `categories/${categoryId}/${existingSubCategory._id}`, `${itemId}/media/${color}_${mediaType}_${index}`)
            .then((url) => ({ url, type: mediaType, priority }));
        });
        const mediaItems = await Promise.all(uploadPromises);
        const existingColorGroup = media.find((group) => group.color === color);
        if (existingColorGroup) {
          existingColorGroup.mediaItems = mediaItems;
        } else {
          media.push({ color, mediaItems });
        }
        fileIndex += totalMediaPerColor;
      }
    }

    media.forEach((group) => group.mediaItems.sort((a, b) => a.priority - b.priority));

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

    const updatedDetails = await ItemDetails.findOneAndUpdate(
      { items: itemId },
      {
        ...itemDetailsData,
        items: itemId,
        media,
        sizeChartInch,
        sizeChartCm,
        sizeMeasurement,
      },
      { new: true }
    ).populate("items");

    res.status(200).json(updatedDetails);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

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