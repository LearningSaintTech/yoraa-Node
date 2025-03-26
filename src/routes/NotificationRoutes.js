const express = require("express");
const admin = require("firebase-admin");
const User = require("../models/User");
const { verifyToken } = require("../middleware/VerifyToken");
const Notifications = require("../models/Notifications");
const { uploadMultipart } = require("../utils/S3");
const mongoose = require("mongoose");
const multer = require("multer");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload-notification-image", verifyToken, upload.single("image"), async (req, res) => {
  console.log("\n[upload-notification-image] Request received.");
  try {
    if (!req.file) {
      console.log("❌ No file uploaded.");
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const notificationId = new mongoose.Types.ObjectId().toString();
    console.log("🔍 Uploading file to S3 with ID:", notificationId);
    const fileUrl = await uploadMultipart(req.file, "notifications", notificationId);
    console.log("✅ File uploaded successfully:", fileUrl);
    res.status(200).json({ success: true, imageUrl: fileUrl });
  } catch (error) {
    console.error("❌ Error uploading notification image:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/send-notification", verifyToken, async (req, res) => {
  console.log("\n[send-notification] Request received.");
  const { title, body, imageUrl, deepLink, targetPlatform = "both" } = req.body;
  console.log("Title:", title, "Body:", body, "Image URL:", imageUrl, "Deep Link:", deepLink, "Target Platform:", targetPlatform);

  // Validate required fields
  if (!title || !body) {
    console.log("❌ Missing title or body.");
    return res.status(400).json({ message: "Title and body are required" });
  }

  // Validate imageUrl if provided
  if (imageUrl && !imageUrl.startsWith("http")) {
    console.log("❌ Invalid imageUrl format. Must start with http:// or https://");
    return res.status(400).json({ message: "Invalid imageUrl format" });
  }

  try {
    // Fetch users based on platform
    console.log("🔍 Fetching users for platform:", targetPlatform);
    let users = targetPlatform === "both"
      ? await User.find({}, "fcmToken platform")
      : await User.find({ platform: targetPlatform }, "fcmToken platform");

    const tokens = users.map((user) => user.fcmToken).filter(Boolean);
    console.log("📲 Found", tokens.length, "valid FCM tokens.");

    if (tokens.length === 0) {
      console.log("❌ No FCM tokens found.");
      return res.status(400).json({ message: "No FCM tokens found for the specified platform" });
    }

    // Construct the FCM message payload
    const message = {
      notification: {
        title,
        body,
        image: imageUrl || undefined, // Use "image" instead of "imageUrl" for top-level notification
      },
      data: {
        deepLink: deepLink || "",
      },
      tokens,
      android: {
        notification: {
          image: imageUrl || undefined, // Use "image" for Android
        },
      },
      apns: {
        payload: {
          aps: {
            "mutable-content": 1, // Required for iOS to handle images
          },
        },
        fcm_options: {
          image: imageUrl || undefined, // Use "image" for iOS
        },
      },
    };

    // Remove undefined fields to avoid issues with FCM
    if (!imageUrl) {
      delete message.notification.image;
      delete message.android.notification.image;
      delete message.apns.fcm_options.image;
      console.log("⚠️ No imageUrl provided; removed image fields from payload.");
    }

    console.log("💾 Saving notification record to DB...");
    await new Notifications({ title, body, imageUrl, deepLink, platform: targetPlatform }).save();

    console.log("📤 Sending notifications...", JSON.stringify(message, null, 2));
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("✅ Notification sent successfully.", JSON.stringify(response, null, 2));

    res.status(200).json({ success: true, message: "Notification sent!", response });
  } catch (error) {
    console.error("❌ Error sending notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/notifications", verifyToken, async (req, res) => {
  console.log("\n[get-notifications] Request received.");
  try {
    const notifications = await Notifications.find().sort({ sentAt: -1 });
    console.log("✅ Fetched", notifications.length, "notifications.");
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("❌ Error retrieving notifications:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;