const jwt = require('jsonwebtoken');

const isValidUser = async (req, res, next) => {
    try {
        const { authorization } = req.headers;
        console.log(authorization);
        let token;
        let decodedData;
        if (authorization && authorization.startsWith("Bearer")) {
            token = authorization.split(" ")[1];
            console.log(token);
            decodedData = jwt.verify(token, process.env.JWT_ACCESS_TOKEN);
            console.log(decodedData);
        } else if (!authorization) {
            return res.status(403).json({ error: 'Unauthorized' });
        } else if (!decodedData) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        req.body.userId = decodedData._id;
        next();
    } catch (error) {
        console.log("Middleware Error", error.message)
        return res.status(500).json({ message: "Error authorization" });
    }
};


module.exports = { isValidUser };