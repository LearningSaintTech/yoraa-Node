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
        // Extract fields from request body
        const { address, email, dob, gender, anniversary, stylePreferences, name, phNo } = req.body;
console.log("req.body",req.body)
        // Prepare the update object dynamically for UserProfile
        let updateProfileFields = {};
        if (address) updateProfileFields.address = address;
        if (email) updateProfileFields.email = email;
        if (dob) updateProfileFields.dob = dob;
        if (gender) updateProfileFields.gender = gender;
        if (anniversary) updateProfileFields.anniversary = anniversary;
        if (stylePreferences) updateProfileFields.stylePreferences = stylePreferences;

        // Handle image upload if file is provided
        if (req.file) {
            const imageUrl = await uploadMultipart(req.file, "userProfiles", userId);
            updateProfileFields.imageUrl = imageUrl;
        }

        // Update UserProfile if there are fields to update
        let updatedProfile;
        if (Object.keys(updateProfileFields).length > 0) {
            updatedProfile = await UserProfile.findOneAndUpdate(
                { user: userId },
                { $set: updateProfileFields },
                { new: true, runValidators: true }
            );

            if (!updatedProfile) {
                return res.status(404).json({ message: "User Profile not found" });
            }
        }

        // Update User model (name, phone number, email)
        const user = await User.findById(userId);
        user.isProfile = true;
        if(user.isPhoneVerified==false && user.isEmailVerified==true)
        {
            user.isPhoneVerified=true;
        }
        if(user.isPhoneVerified==true && user.isEmailVerified==false)
            {
                user.isEmailVerified=true;
            }

        if (name) user.name = name;  
        console.log("phno",phNo)    // Update name if provided
        if (phNo) user.phNo = phNo;      // Update phone number if provided
        if (email) user.email = email;   // Update email if provided

        await user.save();

        res.json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                name: user.name,
                phNo: user.phNo,
                email: user.email
            },
            profile: updatedProfile || {}  // Send updated profile or empty object if not updated
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

