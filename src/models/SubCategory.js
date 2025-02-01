const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }, // ✅ Each SubCategory belongs to 1 Category
    imageUrl: { type: String }, // ✅ Image URL for subcategory
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubCategory", subCategorySchema);
