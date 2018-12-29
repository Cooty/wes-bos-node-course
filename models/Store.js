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
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // name of the Model we want to reference
        required: 'You must supply an author'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Do indexing
storeSchema.index({
    name: 'text',
    description: 'text',
});

storeSchema.index({
    location: '2dsphere'
});

storeSchema.statics.getTagsList = function() {
    return this.aggregate([
        { $unwind: '$tags' },
        {
            $group: {
                _id: '$tags',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

storeSchema.statics.getTopStores = function() {
    return this.aggregate([
        // Lookup stores and populate their reviews
        {
            $lookup: {
                from: 'reviews', // MongoDB lowercases our model and put the plural 's' to it automatically
                localField: '_id',
                foreignField: 'store',
                as: 'reviews', // and that's are custom field name we want to add on and populate (can be anything)
            } 
        },
        // result of $lookup gets passed down to the next operator in the pipeline... 
        // Filter for items that have at least 2 reviews
        {
            $match: {
                // 'somekey.NUMBER' is the way to access things in MongoDB
                // that are index based, so we just check if there is a 2nd item
                'reviews.1': { $exists: true }
            }
        },
        // Add the average reviews field
        {
            // Wes is using $project in the original code which just adds the new field
            // but all other field get lost from the output.
            // Since I'm using a newer version > 3.4 I can use $addFeilds
            // which can add the data a field and retain the originals
            // https://docs.mongodb.com/manual/reference/operator/aggregation/addFields/
            $addFields: {
                averageRating: { $avg: '$reviews.rating' } // the $reviews means it's a field beign piped in
            }
        },
        // Sort it based on the average rating
        {
            $sort: { averageRating: -1 } // -1 means DESC
        },
        // and finally limit it
        { $limit: 10 }
    ]);
};

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

storeSchema.virtual(
    'reviews',
    {
        ref: 'Review', // what model to link
        localField: '_id', // look for this field on the 'Store'...
        foreignField: 'store', // ... and match it with the 'store' field on the 'Review' model
    }
);

function autopopulate(next) {
    this.populate('reviews');
    next();
};

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);