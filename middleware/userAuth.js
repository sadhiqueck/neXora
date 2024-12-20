
const authsession = (req, res, next) => {
    try {
        if (req.session.user) {
            next(); // Allow access if session exists
        } else {
            res.redirect('/user/home'); // Redirect to home if no session
        }
    } catch (error) {
        console.error("Error in authsession middleware:", error);
        res.redirect('/user/home'); // Redirect to home on error
    }
};


const isLogin = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/user/home'); // Redirect to home if already logged in
    }
    next(); // Proceed if not logged in
};

function loginStatus(req, res, next) {
    res.locals.isLoggedIn = req.session.isLoggedIn || false;
    res.locals.user = req.session.user || null;
    next();
}

module.exports = { authsession, loginStatus,isLogin }