const axios = require("axios");


const API_KEY = process.env.API_KEY;

exports.generateOtp = async (phoneNumber) => {
  
    try {
        const response = await axios.get(`https://2factor.in/API/V1/${API_KEY}/SMS/${phoneNumber}/AUTOGEN/OTPTEMPLATENAME`);
        console.log("OTP Sent:", {
            success:"OTP Successfully Send",
            response:response.data
        });
        return response;
    } catch (error) {
        console.error("Error sending OTP:", error.response ? error.response.data : error.message);
    }
}


