const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const email = require('../handlers/email');

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
    req.flash('success', `You\'ve been sent a reset email to <em>${user.email}</em>.`);
    try {
        await email.send({
            user,
            subject: 'Password reset from Dang That\'s delicious',
            resetURL,
            filename: 'password-reset', // name of the .pug file that renders the email
        });
    } catch (err) {
        req.flash('error', `An error happened: ${err}`);
        res.redirect('back');
    }
    // 4) Redirect to the login page
    res.redirect('/login');
};

exports.validateToken = async (req, res, next) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if(user) {
        req.user = user;
        return next();
    } else {
        req.flash('error', 'Token is not found or expired');
        return res.redirect('/login');
    }
};

exports.reset = (req, res) => {
    return res.render(
        'reset',
        {
            title: 'Reset your password',
            email: req.user.email
        }
    );
};

exports.validatePasswordConfirmation = (req, res, next) => {
    if(req.body['password'] === req.body['confirm-password']) {
        return next();
    }
    req.flash('error', 'Passwords do not match');
    return res.redirect('back');
};

exports.update = async (req, res) => {
    const setPassword = promisify(req.user.setPassword, req.user); // setPassword comes from Passport

    await setPassword(req.body.password);

    // get rid of the token and the expiry
    req.user.resetPasswordToken = req.user.resetPasswordExpires = undefined;
    const updateUser = await req.user.save();
    await req.login(updateUser);
    req.flash('success', 'You\'re password has been reset! You\'re now logged in!');
    return res.redirect('/');
};