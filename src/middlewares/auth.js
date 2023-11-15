const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity')
const response = require("../helpers/response");
const logger = require('../helpers/logger');


const isValidUser = async (req, res, next) => {
    try {
        console.log(req.body)
        const { authorization } = req.headers;
        console.log(authorization);
        let token;
        let decodedData;
        let activity;
        if (authorization && authorization.startsWith("Bearer")) {
            token = authorization.split(" ")[1];
            //console.log(token);
            decodedData = jwt.verify(token, process.env.JWT_ACCESS_TOKEN);
            console.log(decodedData);
            if (decodedData.role === 'super-admin' && decodedData.activityId!==null) {
                activity = await Activity.findById(decodedData.activityId)
            }
        }
        if (decodedData.role === 'super-admin' && activity === null) {
            return res.status(401).json(response({ status: 'Unauthorised', statusCode: '401', type: 'auth', message: req.t('You are not authorised to sign in now') }));
        }
        else if (!authorization) {
            return res.status(401).json(response({ status: 'Unauthorised', statusCode: '401', type: 'auth', message: req.t('Unauthorised') }));
        }
        else if (!decodedData) {
            return res.status(401).json(response({ status: 'Unauthorised', statusCode: '401', type: 'auth', message: req.t('Unauthorised') }));
        }
        req.body.userId = decodedData._id;
        next();
    } catch (error) {
        console.log("Middleware Error", error.message)
        logger.error(error, req.originalUrl);
        return res.status(401).json(response({ status: 'Unauthorised', statusCode: '401', type: 'auth', message: req.t('Error authorization') }));
    }
};


module.exports = { isValidUser };