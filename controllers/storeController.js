const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
    storage: multer.memoryStorage(), // we'll keep the image in memory, resize it, then save it to disk
    fileFilter: (req, file, next) => { // this is very we limit filetype uploads
        // testing for MIME-type is much reliable then checking the extension...
        const isImage = file.mimetype.startsWith('image/');

        if(isImage) {
            // typical Node.js pattern
            // if you pass in anything truthy as the 1st argument then it means it's an error
            // if passing in null as the 1st argument and true as the 2nd it means it worked
            // and the 2nd value will get passed forward to the next handler
            next(null, true);
        } else {
            next({message: 'That file type isn\'t allowed'}, false);
        }
    }
};

exports.homePage = (req, res) => {
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
    // need to check if the user actually added the file
    // it can also be and edit operation and in that case no new image is posted
    // req.file is appended by multer...
    if(!req.file) {
        // just call next - so pass on the request to the next function
        next();
        return;
    }

    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    // Now for the resizing;
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
};

exports.createStore = async (req, res) => {
    req.body.author = req.user ? req.user._id : false;
    // Because our schema is strict, if someone would post anything else that
    // does not match our schema definitions it just gets thrown away
    const store = await (new Store(req.body)).save(); // instantiate the a new Store which is based on our schema

    req.flash(
        'success',
        `Successfully created ${store.name}. Care to leave a review?`);
    res.redirect(`/stores/${store.slug}`);
};

exports.getStores = async (req, res) => {
    const stores = await Store.find();
    res.render('stores', { title: 'Stores', stores });
};

const confirmOwner = (store, user) => {
    if(!store.author || !store.author.equals(user._id)) {
        throw Error('You must own a store to be able to edit it!');
    }
}

exports.editStore = async (req, res) => {
    const store = await Store.findById(req.params.id);
    // TODO: Verify if the user is allowed to edit this store - needs WebAuthentication...
    confirmOwner(store, req.user);
    res.render('editStore', {title: `Edit ${store.name}`, store});
};

exports.updateStore = async (req, res) => {
    if(req.body.location) {
        req.body.location.type = 'Point';
    }
    const store = await Store.findOneAndUpdate(
        {_id: req.params.id}, // query to find the store
        req.body, // 2) the data to update - in this case these are the posted form fields
        // 3) settings
        {
            new: true, // return the new store instead of the old one
            runValidators: true, // needed to have are required fields in the Schema validated again, by default Mongo only checks at the creation of the object not the updates
        }
    ).exec();
    req.flash(
        'success',
        `Successfully updated <strong>${store.name}</strong>
        <a href="/stores/${store.slug}">View it here!</a>!`
    );
    res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ 
        slug: req.params.slug 
    }).populate('author reviews');
    // handle 'not found' stores, since mongoDB will return null if the user enters a non-existing slug
    if(!store) {
        next();
        return;
    }
    res.render('store', { title: store.name, store });
};

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };
    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({
        tags: tagQuery
    });

    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    const title = tag ? `Tags: ${tag}` : 'Tags';

    res.render('tag', {tags, title, tag, stores});
};

exports.searchStores = async (req, res) => {
    const textScore = { $meta: 'textScore' };
    const stores = await Store.find({
        $text: {
            $search: req.query.q
        }
    }, {
        // we're "projecting" (aka adding) a virtual field to the search
        // https://docs.mongodb.com/manual/reference/operator/projection/meta/
        score: textScore
    })
    .sort({
        score: textScore
    })
    .limit(5)
    .select('name slug');
    return res.json(stores);
};

exports.mapStores = async (req, res) => {
    const coordinates = [
        req.query.lng,
        req.query.lat,
    ].map(parseFloat);

    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000 // 10km
            }
        }
    };

    const stores = await Store
                            .find(q)
                            .select('slug name description location photo')
                            .limit(10);

    return res.json(stores);
};

exports.mapPage = (req, res) => {
    return res.render('map', {title: 'Map'});
};

exports.getHearts = async (req, res) => {
    if(!req.user || !req.user.hearts) {
        next();
        return;
    }

    const stores = await Store.find({
        _id: { $in: req.user.hearts }
    });

    res.render(
        'stores',
        {
            title: 'Hearted Stores',
            stores
        }
    );
};

exports.heartStore = async (req, res) => {
    if(!req.user && !req.user.hearts) {
        next();
        return;
    }
    // actually the Schema returns Objects, so the mapped lamdas
    // will be the Object we defined in the User Schema's Array
    // since we need a String we just run toString on them, which works thanks to MongoDB
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User.findByIdAndUpdate(
            req.user._id,
            // ES6 computed propertynames
            { [operator]: { hearts: req.params.id } },
            // If it's an update then return the new user
            {new: true},
        );
    res.json(user);
};