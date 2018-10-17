const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');

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
    return res.redirect(`/login${redirectQuery}`);
};

exports.forgot = async (req, res) => {
    // 1) Check if the user associated with the email address sent exists
    const user = await User.findOne({ email: req.body.email });

    if(!user) {
        req.flash('error', 'We\'ve sent you a password rest...'); // exposing emails is not a good idea...
        return res.redirect('/login');
    }
    // 2) If it exists: set a password recovery token and a token expiry time for that account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    // 3) Send the user an email with the token in it
    // TODO: send this via email
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    req.flash('success', `We\'ve emailed you a password reset link! ${resetURL}`);
    // 4) Redirect to the login page
    res.redirect('/login');
};

const getUserByResetToken = async (token) => {
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    return new Promise(resolve => {
        resolve(user);
    });
};

const handleExpiredToken = (req, res) => {
    req.flash('error', 'Token is not found or expired');
    res.redirect('/login');
}

exports.reset = async (req, res) => {
    // res.json(req.params.token);
    const user = await getUserByResetToken(req.params.token);
    console.log(user);
    if(!user) {
        return handleExpiredToken(req, res);
    }

    return res.render('reset', { title: 'Reset your password', email: user.email });
};

exports.confirmedPasswords = (req, res, next) => {
    if(req.body['password'] === req.body['confirm-password']) {
        return next();
    }
    req.flash('error', 'Passwords do not match');
    return res.redirect('back');
};

exports.update = async (req, res) => {
    const user = await getUserByResetToken(req.params.token);
    console.log(user);
    if(!user) {
        return handleExpiredToken(req, res);
    }

    const setPassword = promisify(user.setPassword, user); // setPassword comes from Passport

    await setPassword(req.body.password);

    // get rid of the token and the expiry
    user.resetPasswordToken = user.resetPasswordExpires = undefined;
    const updateUser = await user.save();
    await req.login(updateUser);
    req.flash('success', 'You\'re password has been reset! You\'re now logged in!');
    return res.redirect('/');
};