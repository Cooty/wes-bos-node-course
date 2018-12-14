const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.add = async (req, res) => {
    res.json(req.body);
};