const passport = require('passport');

// This is Wes's original code, the problem with it is that I can't implement
// dynamic redirects when I want to pass an authentication-only url that
// the user has failed to access on a previous request...
// also a middleware but this time we reference stuff already implemented by Passport
// exports.login = passport.authenticate(
//     'local', // this is the name of the predefined "Strategy" we want to use
//     // and now for the config...
//     {
//         failureRedirect: '/login',
//         failureFlash: 'Failed login',
//         successRedirect: '/',
//         successFlash: 'You\'re now logged in!'
//     }
// );

// ... instead I use a manual callback and a dedicated route for handling the login
// the <form>'s action is '/do-login' this is a dummy route which doesn't render anything
// see.: http://www.passportjs.org/docs/authenticate/
exports.login = (req, res, next) => {
    passport.authenticate('local', (err, user) => {
        if (err) {
            return next(err);
        }

        if (!user) {
            req.flash('error', 'Failed login');
            return res.redirect('/login');
        }

        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }

            if(
                req.body.redirectPath &&
                req.body.redirectPath.startsWith('/') &&
                req.body.redirectPath !=='/'
            ) {
                return res.redirect(req.body.redirectPath);
            } else {
                req.flash('success', 'You\'re now logged in!');
                return res.redirect('/');
            }
        });
    })(req, res, next);
}

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You\'re now logged out! 👋');
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
    // use method added by Passport.js
    if(req.isAuthenticated()) {
        return next(); // let 'em go on...
    }
    redirectQuery = req.route.path && req.route.path !== '/' ? `?redirectPath=${req.route.path}` : '';
    req.flash('error', 'You need to be logged in!');
    res.redirect(`/login${redirectQuery}`);
};