const User = require("../models/User");

exports.checkAdmin = async (req, res, next) => {
	try {
		User.findById(req.b)
		const { admin } = req.cookies;
		console.log("The value of admin is", admin);
		if (admin === "true") {
			next();
		} else {
			res.status(401).json({ message: "Unauthorized" });
		}
	} catch (error) {
		res.status(401).json({ message: "Unauthorized" });
	}
};
