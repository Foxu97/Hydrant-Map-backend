const express = require('express');
const validation = require('../middleware/validation');
const authController = require('../controllers/authentication');

const router = express.Router();

router.post('/signup', validation.signUpValidation, authController.signup);

router.post('/signin', authController.signin);

module.exports = router;