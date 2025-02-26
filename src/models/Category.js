const mongoose = require("mongoose");
const { deleteFileFromS3 } = require("../utils/S3");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    imageUrl: { type: String }, // S3 Image URL for category
  },
  { timestamps: true }
);

// Delete all subcategories, items, item details, and S3 image when a category is deleted
categorySchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  const categoryId = this._id;
  
  const subCategories = await mongoose.model("SubCategory").find({ categoryId });

  for (const subCategory of subCategories) {
    const items = await mongoose.model("Item").find({ subCategoryId: subCategory._id });

    for (const item of items) {
      await mongoose.model("ItemDetails").deleteOne({ items: item._id });
      if (item.imageUrl) await deleteFileFromS3(item.imageUrl); // Delete Item image from S3
    }

    await mongoose.model("Item").deleteMany({ subCategoryId: subCategory._id });
    if (subCategory.imageUrl) await deleteFileFromS3(subCategory.imageUrl); // Delete SubCategory image from S3
  }

  await mongoose.model("SubCategory").deleteMany({ categoryId });

  // Delete category image from S3
  if (this.imageUrl) await deleteFileFromS3(this.imageUrl);

  next();
});

module.exports = mongoose.model("Category", categorySchema);
