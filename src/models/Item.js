const mongoose = require("mongoose");
const { deleteFileFromS3 } = require("../utils/S3");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    imageUrl: { type: String },

    // Updated Filters
    filters: [
      {
        key: { type: String, required: true, index: true },
        value: { type: String, required: true, index: true },
        code: { type: String },
      },
    ],

    brand: { type: String, index: true },
    style: [{ type: String, index: true }],
    occasion: [{ type: String, index: true }],
    fit: [{ type: String }],
    material: [{ type: String }],
    discountPrice: { type: Number, min: 0 },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    discountPercentage: { type: Number, default: 0 },
    isItemDetail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

itemSchema.pre("save", function (next) {
  if (this.discountPrice && this.price) {
    this.discountPercentage = ((this.price - this.discountPrice) / this.price) * 100;
  }
  next();
});

itemSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  const itemId = this._id;
  await mongoose.model("ItemDetails").deleteOne({ items: itemId });

  if (this.imageUrl) {
    await deleteFileFromS3(this.imageUrl);
  }

  next();
});

module.exports = mongoose.model("Item", itemSchema);
