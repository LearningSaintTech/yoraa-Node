const mongoose = require("mongoose");
const { deleteFileFromS3 } = require("../utils/S3");

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }, // Each SubCategory belongs to 1 Category
    imageUrl: { type: String }, // S3 Image URL for subcategory
  },
  { timestamps: true }
);

// Delete all items, item details, and S3 image when a subcategory is deleted
subCategorySchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  const subCategoryId = this._id;
  
  const items = await mongoose.model("Item").find({ subCategoryId });

  for (const item of items) {
    await mongoose.model("ItemDetails").deleteOne({ items: item._id });
    if (item.imageUrl) await deleteFileFromS3(item.imageUrl); // Delete Item image from S3
  }

  await mongoose.model("Item").deleteMany({ subCategoryId });

  // Delete subcategory image from S3
  if (this.imageUrl) await deleteFileFromS3(this.imageUrl);

  next();
});

module.exports = mongoose.model("SubCategory", subCategorySchema);
