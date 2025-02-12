
const User = require("../../models/User");
const Otp = require("../../models/OTP");
const bcrypt = require("bcryptjs");
const {ApiResponse} = require("../../utils/ApiResponse");
const {generateToken} = require("../../utils/generateToken");
const { generateOtp } = require("../../utils/generateOtp");
const UserProfile = require("../../models/UserProfile");
const { handleFirebaseSignup, loginFirebase } = require('../../services/authService');

const admin = require('../../utils/firebaseConfig'); 

exports.loginController = async (req, res) => {
    try {
        const { phNo, password } = req.body;

        const existingUser = await User.findOne({ phNo });

        console.log("Existing User", existingUser);

        if (!existingUser) {
            return res.status(404).json(ApiResponse(null, "User not found", false, 404));
        }

        // Check if the user is verified
        if (!existingUser.isVerified) {
            return res.status(403).json(ApiResponse(null, "User is not verified. Please verify your account first.", false, 403));
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) {
            return res.status(400).json(ApiResponse(null, "Invalid credentials", false, 400));
        }

        // Convert Mongoose document to plain object and remove password before sending response
        const userObject = existingUser.toObject();
        delete userObject.password;

        // Generate JWT token (same logic as in verifyOtp)
        const token = await generateToken(userObject);

        console.log("Generated Token:", token);

        // Add token to user object

        // Return response
        return res.status(200).json(ApiResponse({ token, user: userObject }, "Login successful", true, 200));

    } catch (error) {
        console.error("Error logging in:", error.message);
        return res.status(500).json(ApiResponse(null, "Internal server error", false, 500));
    }
};



exports.signUpController = async (req, res) => {
    console.log("req.body",req.body)
    try {
        console.log("qqqqqqqqqqqqqq00000000000000")

        const existingUser = await User.findOne({ phNo: req.body.phNo });
        console.log("qqqqqqqqqqqqq11111111111111")

       if(existingUser){
        if (existingUser.isVerified==false) {
            console.log("qqqqqqqqqqqqqq")
            return res.status(403).json(ApiResponse(null, "User is not verified. Please verify your account first.", false, 403));
        }
        if (existingUser.isVerified==true) {
            console.log("qqqqqqqqqqqqqq1111111111111")

            return res.status(403).json(ApiResponse(null, "User is  verified registered. Please login", false, 403));
        }
       }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        req.body.password = hashedPassword;

        const createdUser = new User(req.body);
        await createdUser.save();

        const hardcodedOtp = "1234"; 
        console.log("This is the generated OTP:", hardcodedOtp);

        const newOtp = new Otp({
            phNo: req.body.phNo, 
            otp: hardcodedOtp,
            expiresAt: Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME),
        });

        await newOtp.save();
        const newUserProfile = new UserProfile({
            user: createdUser._id,
            
        });
        await newUserProfile.save();


        return res.status(201).json(ApiResponse(null, "Signup successful. OTP sent successfully.", true, 201));
    } catch (error) {
        console.log(error);
        return res.status(500).json(ApiResponse(null, "Error occurred during signup", false, 500));
    }
};






exports.verifyOtp = async (req, res) => {
	try {
		const { phNo, otp } = req.body;

		const user = await User.findOne({ phNo });

		if (!user) {
			return res.status(404).json(ApiResponse(null, "User not found", false, 404));
		}

		const storedOtp = await Otp.findOne({ phNo });
        console.log("storedOtp",storedOtp)

		if (!storedOtp) {
			return res.status(404).json(ApiResponse(null, "OTP not found", false, 404));
		}

		if (storedOtp.expiresAt.getTime() < Date.now()) {
			await Otp.deleteOne({ phNo });
			return res.status(400).json(ApiResponse(null, "OTP has expired", false, 400));
		}

		if (storedOtp.otp !== otp) {
			return res.status(400).json(ApiResponse(null, "Invalid OTP", false, 400));
		}

		// Update isVerified and get updated user
		const updatedUser = await User.findOneAndUpdate(
			{ phNo },
			{ $set: { isVerified: true } },
			{ new: true } // Ensures we get the updated user
		);

		if (!updatedUser) {
			return res.status(500).json(ApiResponse(null, "Failed to update verification status", false, 500));
		}

		// Convert Mongoose document to plain object and remove password
		const userObject = updatedUser.toObject();
		delete userObject.password;

		// Generate JWT token
		const token = await generateToken(userObject);

		// Delete OTP after successful verification
		await Otp.deleteOne({ phNo });

		// Return updated user and token
		return res.status(200).json(ApiResponse({ token, user: userObject }, "OTP verified successfully", true, 200));

	} catch (error) {
		console.error("Error verifying OTP:", error);
		return res.status(500).json(ApiResponse(null, "Error occurred during OTP verification", false, 500));
	}
};


exports.generateOtp = async (req, res) => {
    console.log("req.body",req.body)
    try {
        const { phNo } = req.body;

        // Here we will use a hardcoded OTP for simplicity
        const hardcodedOtp = "4321"; // Replace with any OTP generation logic if needed
        console.log("Generated OTP:", hardcodedOtp);

        const existingUser = await User.findOne({ phNo });
        if (!existingUser) {
            return res.status(404).json(ApiResponse(null, "User not found", false, 404));
        }


        await Otp.deleteOne({ phNo });
        console.log("Otp.deleteOne({ phNo })",Otp.findOne({ phNo }))

        const newOtp = new Otp({
            phNo: phNo,
            otp: hardcodedOtp,
            expiresAt: Date.now() + parseInt(process.env.OTP_EXPIRATION_TIME),
        });

        await newOtp.save();

        return res.status(201).json(ApiResponse(null, "OTP sent successfully", true, 201));

    } catch (error) {
        console.error("Error generating OTP:", error);
        return res.status(500).json(ApiResponse(null, "Error generating OTP", false, 500));
    }
};







exports.logout = async (req, res) => {
	try {
		res.cookie("token", {
			maxAge: 0,
			sameSite: process.env.PRODUCTION === "true" ? "None" : "Lax",
			httpOnly: true,
			secure: process.env.PRODUCTION === "true" ? true : false,
		});
		return res.status(200).json({ message: "Logout successful" });
	} catch (error) {
		console.log(error);
	}
};


exports.signupFirebase = async (req, res) => {
    const { idToken } = req.body;
    console.log("Firebase signup received with ID token:", idToken);
  
    try {
      const { token, user } = await handleFirebaseSignup(idToken);  // Destructure token and user
      console.log("JWT token generated:", token);
  
      return res.status(200).json(ApiResponse({ token, user }, "OTP verified successfully", true, 200));
    } catch (error) {
      console.error("Error during Firebase signup:", error);
      return res.status(400).json(ApiResponse(null, error.message, false, 400));
    }
  };
  
  
  // Firebase login route
  exports.loginFirebase = async (req, res) => {
    const { idToken } = req.body;
    console.log("Firebase login received with ID token:", idToken);
  
    try {
      const token = await loginFirebase(idToken);
      console.log("JWT token generated:", token);
      res.status(200).json({ token });
    } catch (error) {
      console.error("Error during Firebase login:", error);
      res.status(400).json({ message: error.message });
    }
  };


  exports.verifyFirebaseOtp = async (req, res) => {
    console.log("111111111111111111")
    const { idToken, phNo } = req.body;
    console.log("111111111111111111",req.body)

    try {
        // Verify the Firebase ID Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log("Decoded Firebase Token:", decodedToken);

        if (!decodedToken.phone_number || decodedToken.phone_number !== phNo) {
            return res.status(400).json(ApiResponse(null, "Phone number mismatch", false, 400));
        }

        // Check if user exists in DB
        let phNo1 = phNo.replace('+91', '');
        console.log("Trimmed phone number (phNo1):", phNo1);
    
        // Find the user in the database using the trimmed phone number
        let user = await User.findOne({ phNo: phNo1 });
        console.log("User found:", user);

        if (!user) {
            // If user doesn't exist, create a new one
            user = new User({ phNo, isVerified: true });
            await user.save();
        } else {
            // If user exists, mark as verified
            user.isVerified = true;
            await user.save();
        }

        // Generate JWT Token
        const token = await generateToken({ _id: user._id, phNo: user.phNo });

        return res.status(200).json(ApiResponse({ token, user }, "OTP verified successfully", true, 200));
    } catch (error) {
        console.error("Error verifying Firebase OTP:", error);
        return res.status(400).json(ApiResponse(null, error.message, false, 400));
    }
};
  