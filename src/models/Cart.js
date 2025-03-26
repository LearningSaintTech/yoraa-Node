const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    quantity: { type: Number, default: 1 },
    desiredSize: { type: String, required: true }, 
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Cart", cartSchema);
