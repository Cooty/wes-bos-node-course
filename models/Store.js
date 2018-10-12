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
    created: {
        // you can also store Unix timestamps, but the built in Date-type in Mongo ismuch smarter, enables custom queries and filters
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            // yeah that's how you give a location-point type to Mongo, kinda wierd...
            type: String,
            default: 'Point'
        },
        // Array cause there are more of them
        coordinates: [
            {
                type: Number,
                required: 'You must add coordinates'
            },
        ],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,
});

// Presave hook for MongoDB - stuff to do before saving data
// we autogenerate 'slug'
// 2nd argument needs to be a real function instead of an () => {}
// so we can use this
storeSchema.pre('save', async function(next) {
    if(!this.isModified('name')) {
        next();
        return;
    }

    this.slug = slugs(this.name);

    // Now we need to query the DB and find if there are other stores with the same slug
    // if there is already a slug called "some-store", then do "some-store-1", "some-store-2", etc...
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');

    const storesWithSlug = await this.constructor.find({slug: slugRegEx});

    if(storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }

    // TODO: Make sure slugs are unique, now if 2 stores have the same name, then there slugs will overlap
    next(); // like in Middleware we have to tell it to move along in the execution
});

module.exports = mongoose.model('Store', storeSchema);