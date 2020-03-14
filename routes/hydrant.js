const express = require('express');
const checkAuth = require('../middleware/checkAuth');
const validation = require('../middleware/validation');

const hydrantController = require('../controllers/hydrant');

const router = express.Router();

router.get('/', hydrantController.getAllHydrantsInRadius);
router.get('/getAddress', hydrantController.getAddress);
router.get('/:hydrantId', hydrantController.getHydrantById);

router.put('/', hydrantController.updateHydrantPhoto);

router.post('/', validation.hydrantCoordsValidation, hydrantController.addHydrant);

router.put('/verify', checkAuth, hydrantController.verify);
module.exports = router;