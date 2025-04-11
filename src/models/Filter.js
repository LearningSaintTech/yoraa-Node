const mongoose = require("mongoose");

const filterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      trim: true,
      lowercase: true,
    },
    values: [
      {
        name: { type: String, required: true },
        code: { type: String }, // only needed for colors
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Filter", filterSchema);
