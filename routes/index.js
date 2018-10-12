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
    upload,
    resize,
} = storeController;

// Do work here
router.get('/', catchErrors(getStores));
// Handle GETTING stuff
router.get('/add', addStore);
// Handle POSTING stuff
router.post(
    '/add',
    upload,
    catchErrors(resize),
    catchErrors(createStore)
);
router.get('/stores', catchErrors(getStores));
router.get('/stores/:id/edit', catchErrors(editStore));
router.post(
    '/add/:id',
    upload,
    catchErrors(resize),
    catchErrors(updateStore)
);

module.exports = router;