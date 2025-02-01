const express = require("express");
const  {loginController, signUpController, verifyOtp, logout,resendOtp,generateOtp}  = require("../controllers/authController/AuthController");
const { verify } = require("jsonwebtoken");

const authRouter = express.Router();
authRouter.post("/login",loginController);
authRouter.post("/signup",signUpController);
authRouter.post("/verify-otp",verifyOtp);
authRouter.post("/generate-otp",generateOtp);
// authRouter.post("/resend-otp",resendOtp);
authRouter.get("/logout",logout);
module.exports = authRouter;