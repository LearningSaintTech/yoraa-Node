const mongoose = require("mongoose");
const { deleteFileFromS3 } = require("../utils/S3");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 }, // Ensure price is non-negative
    stock: { type: Number, required: true, default: 0, min: 0 }, // Ensure stock is non-negative
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true }, // Each Item belongs to 1 SubCategory
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }, // Each Item belongs to 1 Category
    imageUrl: { type: String }, // S3 Image URL for item

    // Additional Filtering Fields
    brand: { type: String, index: true }, // Brand name for filtering
    style: [{ type: String, index: true }], // Array of styles (e.g., Casual, Formal, Streetwear)
    occasion: [{ type: String, index: true }], // Array of occasions (e.g., Party, Office, Sports)
    fit: [{ type: String }], // Array of fits (e.g., Slim, Regular, Oversized)
    material: [{ type: String }], // Array of materials (e.g., Cotton, Polyester, Leather)
    discountPrice: { type: Number, min: 0 }, // Ensure discount price is non-negative

    // Ratings & Reviews
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },

    // Auto-calculated field
    discountPercentage: { type: Number, default: 0 },
    isItemDetail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Calculate discount percentage before saving
itemSchema.pre("save", function (next) {
  if (this.discountPrice && this.price) {
    this.discountPercentage = ((this.price - this.discountPrice) / this.price) * 100;
  }
  next();
});

// Delete item details and S3 image when an item is deleted
itemSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  const itemId = this._id;

  // Delete associated item details
  await mongoose.model("ItemDetails").deleteOne({ items: itemId });

  // Delete item image from S3
  if (this.imageUrl) {
    await deleteFileFromS3(this.imageUrl);
  }

  next();
});

module.exports = mongoose.model("Item", itemSchema);
