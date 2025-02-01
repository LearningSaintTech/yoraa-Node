const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    imageUrl: { type: String }, // ✅ Image URL for category
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
