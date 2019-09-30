const express = require('express');
const checkAuth = require('../middleware/checkAuth');
const validation = require('../middleware/validation');

const hydrantController = require('../controllers/hydrant');

const router = express.Router();

router.get('/', hydrantController.getAllHydrantsInRadius);

router.get('/all', hydrantController.getAllHydrants);

router.get('/:hydrantId', checkAuth, hydrantController.getHydrantById);

router.post('/', validation.hydrantCoordsValidation, hydrantController.addHydrant);

router.put('/verify', checkAuth, hydrantController.verify);
module.exports = router;