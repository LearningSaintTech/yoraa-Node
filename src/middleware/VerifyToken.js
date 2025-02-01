require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.verifyToken = async (req, res, next) => {
    try {
        // Extract the token from Authorization header
        const authHeader = req.headers.authorization;

        // If no token is present, return a 401 response
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Token missing, please login again" });
        }

        const token = authHeader.split(" ")[1]; // Extract token after 'Bearer'
        // console.log("Extracted token:", token);

        // Verify the token
        const decodedInfo = jwt.verify(token, process.env.SECRET_KEY);
        // console.log("Decoded token info:", decodedInfo);

        // Ensure required details exist in decoded token
        if (decodedInfo && decodedInfo._id) { // Fix: Check for `_id` instead of `id`
            req.user = decodedInfo; // Attach user data to request
            return next();
        }

        return res.status(401).json({ message: "Invalid Token, please login again" });

    } catch (error) {
        console.log("JWT Verification Error:", error);

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ message: "Token expired, please login again" });
        } else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ message: "Invalid Token, please login again" });
        } else {
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
};
