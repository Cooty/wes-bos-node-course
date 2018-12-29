const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// Do work here
router.get('/', catchErrors(storeController.getStores));
// Handle GETTING stuff
router.get(
    '/add',
    // before we handle rendering the page we call the auth middleware to check for logged in state
    authController.isLoggedIn,
    storeController.addStore
);
// Handle POSTING stuff
router.post(
    '/add',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.createStore)
);
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/:slug', catchErrors(storeController.getStoreBySlug));
router.get('/stores/:id/edit', catchErrors(storeController.editStore));
router.post(
    '/add/:id',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.updateStore)
);
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));
router.get('/login', userController.loginForm);
router.post(
    '/do-login',
    authController.login
);
router.get('/register', userController.registerForm);
// 1. Validate the data (server side validation if it would pass client-side validation, before it hits the DB Schema)
// 2. Register the user (write to DB)
// 3. Log the user in
router.post(
    '/register',
    userController.validateRegister,
    userController.register,
    authController.login
);
router.get('/logout', authController.logout);
router.get(
    '/account',
    authController.isLoggedIn,
    userController.account
);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get(
    '/account/reset/:token',
    catchErrors(authController.validateToken),
    authController.reset
);
router.post(
    '/account/reset/:token',
    catchErrors(authController.validateToken),
    authController.validatePasswordConfirmation, // check if passwords match
    catchErrors(authController.update)
);

router.get('/map', storeController.mapPage);

router.get(
    '/hearts',
    authController.isLoggedIn,
    catchErrors(storeController.getHearts)
);

router.post(
    '/reviews/:id',
    authController.isLoggedIn,
    catchErrors(reviewController.add)
);

router.get(
    '/top',
    catchErrors(storeController.getTopList)
);

// API
router.get(
    '/api/search',
    catchErrors(storeController.searchStores)
);

router.get(
    '/api/stores/near',
    catchErrors(storeController.mapStores)
);

router.post(
    '/api/stores/:id/heart',
    catchErrors(storeController.heartStore)
);

module.exports = router;