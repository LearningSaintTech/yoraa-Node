const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../utils/firebaseConfig'); // Assuming firebaseConfig is set up
const User = require('../models/User');
const UserProfile = require("../models/UserProfile");
const {ApiResponse} = require("../utils/ApiResponse");



// Firebase signup logic
exports.handleFirebaseSignup = async (idToken) => {
  console.log("handleFirebaseSignup")
  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
        console.log("firebaseUid",firebaseUid)
    // Check if the user already exists in the database
    let firebaseUser = await User.findOne({ firebaseUid });
    console.log("firebaseUser",firebaseUser)

    if (!firebaseUser) {
      // Create a new user if not found
      firebaseUser = new User({
        email: decodedToken.email,
        firebaseUid: firebaseUid,
        isVerified: true,
        isEmailVerified:true,
      });
      await firebaseUser.save();

      // Create associated user profile
      const newUserProfile = new UserProfile({
        user: firebaseUser._id,
        email: firebaseUser.email,
      });
      await newUserProfile.save();
    }

    // Generate a JWT for the user
    const token = jwt.sign(
      { _id: firebaseUser._id, email: firebaseUser.email },
      process.env.SECRET_KEY,
      { expiresIn: '1h' }
    );
    console.log("token",token)

    const decodedToken1 = jwt.decode(token);
    console.log("Decoded inside auth services  token payload:", decodedToken1);
    
    // Construct user object to return
    const userObject = {
      id: firebaseUser._id,
      email: firebaseUser.email,
      isVerified: firebaseUser.isVerified,
    };

    return { token, user: userObject }; // Return both token and user
  } catch (error) {
    console.error('Error during Firebase signup:', error);
    throw new Error('Firebase signup failed');
  }
};


// Firebase login logic
exports.loginFirebase = async (idToken) => {
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const firebaseUser = await User.findOne({ firebaseUid: decodedToken.uid });

  if (!firebaseUser) {
    throw new Error('User not found');
  }

  const token = jwt.sign({ id: firebaseUser._id, email: decodedToken.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return token;
};
