const express = require('express');
const checkAuth = require('../middleware/checkAuth');
const validation = require('../middleware/validation');

const hydrantController = require('../controllers/hydrant');
const exifController = require('../controllers/exif')

const router = express.Router();

router.get('/', hydrantController.getAllHydrantsInRadius);
router.get('/getAddress', hydrantController.getAddress);
router.get('/nearest', hydrantController.getXNearestHydrants);
router.get('/:hydrantId', hydrantController.getHydrantById);


//router.put('/', hydrantController.updateHydrantPhoto);
router.put('/image', hydrantController.uploadImage);

router.post('/', validation.hydrantCoordsValidation, hydrantController.addHydrant);
router.post('/exif', exifController.exifHydrantUploader);

router.put('/verify', checkAuth, hydrantController.verify);
module.exports = router;