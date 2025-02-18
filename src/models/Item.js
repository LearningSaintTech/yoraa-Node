const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 }, // Ensure price is non-negative
    stock: { type: Number, required: true, default: 0, min: 0 }, // Ensure stock is non-negative
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true }, // ✅ Each Item belongs to 1 SubCategory
    imageUrl: { type: String }, // ✅ Image URL for item

    // ✅ Additional Filtering Fields
    brand: { type: String, index: true }, // Brand name for filtering
    style: [{ type: String, index: true }], // Array of styles (e.g., Casual, Formal, Streetwear)
    occasion: [{ type: String, index: true }], // Array of occasions (e.g., Party, Office, Sports)
    fit: [{ type: String }], // Array of fits (e.g., Slim, Regular, Oversized)
    material: [{ type: String }], // Array of materials (e.g., Cotton, Polyester, Leather)
    discountPrice: { type: Number, min: 0 }, // Ensure discount price is non-negative

    // ✅ Ratings & Reviews
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },

    // ✅ Auto-calculated field
    discountPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Pre-save hook to calculate discount percentage
itemSchema.pre("save", function (next) {
  if (this.discountPrice && this.price) {
    this.discountPercentage = ((this.price - this.discountPrice) / this.price) * 100;
  }
  next();
});

module.exports = mongoose.model("Item", itemSchema);
