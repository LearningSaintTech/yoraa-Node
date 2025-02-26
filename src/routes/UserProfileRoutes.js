const express = require("express");
const multer = require("multer");
const router = express.Router();
const userProfileController = require("../controllers/userController/UserProfileController");
const { verifyToken } = require("../middleware/VerifyToken");
const storage = multer.memoryStorage();
const upload = multer({ storage });
// Routes
router.get("/getProfile",verifyToken, userProfileController.getUserProfile);
router.post("/postProfile", verifyToken, upload.single("image"), userProfileController.createUserProfile);
router.put("/updateProfile", verifyToken, upload.single("image"), userProfileController.updateUserProfile);
router.get("/getProfileByUserId/:userId",verifyToken,userProfileController.getUserProfileById );

module.exports = router;
