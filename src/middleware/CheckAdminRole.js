const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

const checkAdminRole = async (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    console.log("token",token)

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY); 
        console.log("decoded",decoded)
        const user = await User.findById(decoded._id); 

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isAdmin) {
            return res.status(403).json({ message: 'Access denied, admin rights required' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized, invalid token' });
    }
};

module.exports = checkAdminRole;
