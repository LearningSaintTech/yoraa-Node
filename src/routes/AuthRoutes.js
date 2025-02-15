const express = require("express");
const  {loginController, signUpController,resetPassword,sendVerificationEmail,verifyEmail, verifyFirebaseOtp,signupFirebase,loginFirebase, logout,resendOtp,generateOtp}  = require("../controllers/authController/AuthController");
const { verify } = require("jsonwebtoken");

const authRouter = express.Router();
authRouter.post("/login",loginController);
authRouter.post("/signup",signUpController);
authRouter.post("/verifyFirebaseOtp",verifyFirebaseOtp);
authRouter.post("/generate-otp",generateOtp);
// authRouter.post("/resend-otp",resendOtp);
authRouter.post('/signup/firebase', signupFirebase);
authRouter.post('/login/firebase', loginFirebase);
authRouter.post('/sendVerificationEmail',sendVerificationEmail);
authRouter.post('/verifyEmail',verifyEmail)
authRouter.post('/resetPassword',resetPassword)

authRouter.get("/logout",logout);
module.exports = authRouter;