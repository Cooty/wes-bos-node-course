const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
    res.render(
        'login',
        {
            title: 'Login',
            redirectPath: req.query.redirectPath
        }
    );
}

exports.registerForm = (req, res) => {
    res.render('register', {title: 'Register'});
}

exports.validateRegister = (req, res, next) => {
    req.sanitizeBody('name'); // comes from express-validator used as global middleware
    req.checkBody(
        'name',
        'You must supply a name')
            .notEmpty();
    req.checkBody(
        'email',
        'Not a valid email address!')
            .isEmail();
    req.sanitizeBody('email').normalizeEmail({
        remove_dots: false,
        remove_extension: false,
        gmail_remove_subaddress: true,
    });
    req.checkBody(
        'password',
        'Password can\'t be blank!')
            .notEmpty();
    req.checkBody(
        'confirm-password',
        'Password and Confirm password have to match!')
            .equals(req.body.password);

    const errors = req.validationErrors();

    if(errors && errors.length) {
        req.flash('error', errors.map(err => err.msg));
        res.render(
            'register',
            {
                title: 'Register',
                body: req.body,
                flashes: req.flash()
            }
        );
        return; // exit the function
    }
    // go on to the next one...
    next();
};

exports.register = async (req, res, next) => {
    const user = new User({
        email: req.body.email,
        name: req.body.name
    });

    // .register comes from Passport.js
    // ... problem is the 3rd party lib is callback based,
    // so will promisify it...
    // User.register(user, req.body.password, function(user, err) {
    //     // do some error handling here...
    // });
    const register = promisify(
        User.register, // the function to promisify
        User // object to bind to... since the original method lives on an object
    );

    // and now we can use it with await
    await register(user, req.body.password); // the method from Passport takes care of hashing
    next();
};

exports.account = (req, res) => {
    res.render('account', {title: 'My Account'});
};

exports.updateAccount = async (req, res) => {
    // We just want to change certain parts of the User object...
    const updates = {
        name: req.body.name,
        email: req.body.email,
    };

    const user = await User.findOneAndUpdate(
        // 1) the query
        { _id: req.user._id },
        // 2) the update
        { $set: updates },
        // 3) options for findOneAndUpdate mongoose method
        { new: true, runValidators: true, context: 'query' }
    );

    res.redirect('back');
};