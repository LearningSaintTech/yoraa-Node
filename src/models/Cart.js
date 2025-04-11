const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    itemDetails: { type: Schema.Types.ObjectId, ref: "ItemDetails", required: true },
    sku: { type: String, required: true }, // Reference to the unique SKU from ItemDetails.colors.sizes
    quantity: { type: Number, default: 1, min: 1 }, // Ensure quantity is positive
  },
  { timestamps: true, versionKey: false }
);

// Ensure SKU exists and is valid before saving
cartSchema.pre("save", async function (next) {
  const itemDetails = await mongoose.model("ItemDetails").findById(this.itemDetails);
  if (!itemDetails) {
    return next(new Error("Invalid ItemDetails reference"));
  }

  // Check if the SKU exists in the ItemDetails colors.sizes array
  const skuExists = itemDetails.colors.some((color) =>
    color.sizes.some((size) => size.sku === this.sku)
  );
  if (!skuExists) {
    return next(new Error("Invalid SKU provided"));
  }

  next();
});

module.exports = mongoose.model("Cart", cartSchema);