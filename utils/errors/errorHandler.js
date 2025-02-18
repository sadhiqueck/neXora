const AppError = require('./AppError');
const statusCodes = require('../statusCodes');

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || statusCodes.INTERNAL_SERVER_ERROR;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
        });
    } else if (process.env.NODE_ENV === 'production') {
        if (err.isOperational) {
            if (err.statusCode === 404) {
                res.status(404).render('404', { layout: false });
            } else if (err.statusCode === 500) {
                res.status(500).render('500', { layout: false });
            } else {
                res.status(err.statusCode).json({
                    status: err.status,
                    message: err.message,
                });
            }
        } else {
            console.error('ERROR 💥', err);
            res.status(statusCodes.INTERNAL_SERVER_ERROR).render('500',{ layout: false });
        }
    }
};

module.exports = errorHandler;