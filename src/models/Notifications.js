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
    sentAt: {
        type: Date,
        default: Date.now, // Auto-set timestamp
    }
}, { timestamps: true });

const Notifications = mongoose.model("Notification", notificationSchema);
module.exports = Notifications;
