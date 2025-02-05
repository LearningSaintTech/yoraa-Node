const User = require("../../models/User");
const UserProfile = require("../../models/UserProfile");
const { uploadMultipart } = require("../../utils/S3"); // Ensure this function handles file uploads properly
const mongoose = require("mongoose");

// Get User Profile by User ID from Token
exports.getUserProfile = async (req, res) => {
    const userId = req.user._id;
    try {
        const userProfile = await UserProfile.findOne({ user: userId }).populate("user");
        if (!userProfile) {
            return res.status(404).json({ message: "User Profile not found" });
        }
        res.json(userProfile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a New User Profile with Image Upload
exports.createUserProfile = async (req, res) => {
    const userId = req.user._id;
    try {
        const { address, email, dob, gender, anniversary, stylePreferences } = req.body;

        // Check if profile already exists
        const existingProfile = await UserProfile.findOne({ user: userId });
        if (existingProfile) {
            return res.status(400).json({ message: "User Profile already exists" });
        }

        let imageUrl = "";
        if (req.file) {
            imageUrl = await uploadMultipart(req.file, "userProfiles", userId);
        }

        const newUserProfile = new UserProfile({
            user: userId,
            address,
            email,
            dob,
            gender,
            anniversary,
            stylePreferences,
            imageUrl // Store image URL in profile
        });

        const savedProfile = await newUserProfile.save();
        const user = await User.findById(userId);
        user.isProfile = true;
        await user.save();

        res.status(201).json(savedProfile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update User Profile
exports.updateUserProfile = async (req, res) => {
    const userId = req.user._id;
    try {
        const { address, email, dob, gender, anniversary, stylePreferences } = req.body;

        let imageUrl = "";
        if (req.file) {
            imageUrl = await uploadMultipart(req.file, "userProfiles", userId);
        }

        const updatedProfile = await UserProfile.findOneAndUpdate(
            { user: userId },
            { address, email, dob, gender, anniversary, stylePreferences, imageUrl },
            { new: true, runValidators: true }
        );

        if (!updatedProfile) {
            return res.status(404).json({ message: "User Profile not found" });
        }

        res.json(updatedProfile);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
