const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: null, // Optional image URL
  },
  deepLink: {
    type: String,
    default: null, // Optional deep link
  },
  platform: {
    type: String,
    enum: ["both", "android", "ios"],
    default: "both",
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Notifications = mongoose.model("Notification", notificationSchema);
module.exports = Notifications;