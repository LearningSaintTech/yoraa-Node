const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('../utils/firebaseConfig'); // Assuming firebaseConfig is set up
const User = require('../models/User');



// Firebase signup logic
exports.signupFirebase = async (idToken) => {
  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // Check if the user already exists in the database
    let firebaseUser = await User.findOne({ firebaseUid });

    if (!firebaseUser) {
      // Create a new user if not found
      firebaseUser = new User({
        email: decodedToken.email,
        firebaseUid: firebaseUid,
      });
        console.log("firebaseUser",firebaseUser)
      // Save the new user to the database
      await firebaseUser.save();
    }

    // Generate a JWT for the user
    const token = jwt.sign(
      { id: firebaseUser._id, email: firebaseUser.email },
      process.env.SECRET_KEY,
      { expiresIn: '1h' }
    );

    return token;
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
