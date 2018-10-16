const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
    email: {
        type: String,
        unique: true,
        lowercase: true, // lower-case conversion before saving
        trim: true, // trims the string when saving to DB
        validate: [
            validator.isEmail,
            'Invalid Email Address',
        ],
        required: 'Please supply an email address'
    },
    name: {
        type: String,
        required: 'Please supply a name',
        trim: true,
    }
});

// Adds a field that's calculated on the fly from existing fields and it's not actually stored
userSchema.virtual('gravatar').get(function() {
    // Gravatar just MD5 hashes the user's email address
    const hash = md5(this.email);
    return `https://gravatar.com/avatar/${hash}.jpg?s=200`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email'});
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);