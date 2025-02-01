const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true }, // ✅ Each Item belongs to 1 SubCategory
    imageUrl: { type: String }, // ✅ Image URL for item
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
