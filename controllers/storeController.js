const mongoose = require('mongoose');
const Store = mongoose.model('Store');

exports.homePage = (req, res) => {
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
};

exports.createStore = async (req, res) => {
    // Because our schema is strict, if someone would post anything else that
    // does not match our schema definitions it just gets thrown away
    const store = await (new Store(req.body)).save(); // instantiate the a new Store which is based on our schema

    req.flash('success', `Successfully created ${store.name}! Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
    const stores = await Store.find();
    console.log(stores);
    res.render('stores', { title: 'Stores', stores });
};

exports.editStore = async (req, res) => {
    const store = await Store.findById(req.params.id);
    // TODO: Verify if the user is allowed to edit this store - needs WebAuthentication...
    res.render('editStore', {title: `Edit ${store.name}`, store});
};

exports.updateStore = async (req, res) => {
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