const express = require('express');
const admin = require('firebase-admin');
const User = require('../models/User');
const { verifyToken } = require("../middleware/VerifyToken");
const Notifications = require("../models/Notifications");
const router = express.Router();

/**
 * @route   POST /api/save-token
 * @desc    Save or update user FCM token
 */
router.post('/save-token',verifyToken, async (req, res) => {
    const { token } = req.body;
    const userId = req.user._id;

    if (!userId || !token) {
        return res.status(400).json({ message: 'User ID and FCM Token are required' });
    }

    try {
        const user = await User.findOneAndUpdate(
            { _id: userId },  // Find user by ID
            { $set: { fcmToken: token } },  // Update only fcmToken
            { new: true, upsert: false }  // Do not create a new user if not found
        );
        

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'Token saved successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


/**
 * @route   POST /api/send-notification
 * @desc    Send notification to all users
 */
router.post('/send-notification',verifyToken, async (req, res) => {
    const { title, body } = req.body;

    if (!title || !body) {
        return res.status(400).json({ message: 'Title and body are required' });
    }

    try {
        const users = await User.find({}, 'fcmToken');
        const tokens = users.map(user => user.fcmToken).filter(token => token);

        if (tokens.length === 0) {
            return res.status(400).json({ message: 'No FCM tokens found' });
        }

        const message = {
            notification: { title, body },
            tokens: tokens,
        };

        // ✅ Use `sendEachForMulticast`
        const newNotification = new Notifications({ title, body });
        await newNotification.save();
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log("response",response)
        res.status(200).json({ 
            success: true, 
            message: 'Notification sent!', 
            response 
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, error: error.message });
    }
});


/**
 * @route   GET /api/get-tokens
 * @desc    Retrieve all stored FCM tokens
 */
router.get('/get-tokens', async (req, res) => {
    try {
        const users = await User.find({}, 'name email fcmToken');
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

/**
 * @route   POST /api/logout
 * @desc    Remove FCM token when user logs out
 */
router.post('/delete-token', async (req, res) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
        return res.status(400).json({ message: 'User ID and FCM Token are required' });
    }

    try {
        const user = await User.findOneAndUpdate(
            { _id: userId, fcmToken: token }, // Ensure we update only if the token matches
            { $set: { fcmToken: null } },  // Set FCM token to null
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found or token mismatch' });
        }

        res.status(200).json({ success: true, message: 'Logged out successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/notifications',verifyToken, async (req, res) => {
    try {
        const notifications = await Notifications.find().sort({ sentAt: -1 }); // Show latest first
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
