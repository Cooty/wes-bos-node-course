const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { catchErrors } = require('../handlers/errorHandlers');
const {
    addStore,
    createStore,
    getStores,
    editStore,
    updateStore,
} = storeController;

// Do work here
router.get('/', catchErrors(getStores));
// Handle GETTING stuff
router.get('/add', addStore);
// Handle POSTING stuff
router.post('/add', catchErrors(createStore));
router.get('/stores', catchErrors(getStores));
router.get('/stores/:id/edit', catchErrors(editStore));
router.post('/add/:id', catchErrors(updateStore));

module.exports = router;