// Create the data Schema for our stores here

// Needed for interacting w MongoDB
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slugs = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true, // built in functionality for trimming whitespace
        required: 'Please enter a name for the store!', // could also just say TRUE, but this way we get a custom error message too
    },
    slug: String,
    description: {
        type: String,
        trim: true,
    },
    tags: [String], // needs to be an Array of Strings
});

// Presave hook for MongoDB - stuff to do before saving data
// we autogenerate 'slug'
// 2nd argument needs to be a real function instead of an () => {}
// so we can use this
storeSchema.pre('save', function(next) {
    if(!this.isModified('name')) {
        next();
        return;
    }

    this.slug = slugs(this.name);

    // TODO: Make sure slugs are unique, now if 2 stores have the same name, then there slugs will overlap
    next(); // like in Middleware we have to tell it to move along in the execution
});

module.exports = mongoose.model('Store', storeSchema);