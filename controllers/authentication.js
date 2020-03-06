const { validationResult } = require('express-validator/check');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const User = require('../models/user');


exports.signup = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const error = new Error('Validation failded.');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const password = req.body.password;
    bcrypt
    .hash(password, 12)
    .then(hashedPassword => {
        const user = new User({
            email: email,
            password: hashedPassword
        });
        return user.save();
    })
    .then(result => {
        res.status(201).json({ message: 'User created!'});
    })
    .catch(err => {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        res.status(422).json({ message: err});
        next(err)
    });
};

exports.signin = (req, res, next) => {
    let fetchedUser
    User.findOne({ email: req.body.email })
    .then(user => {
        if(!user){
            return res.status(401).json({
                message: "NO user, Auth failed"
            });
        }
        fetchedUser = user;
        return bcrypt.compare(req.body.password, user.password)
    })
    .then(result => { 
        if(!result) {
            return res.status(401).json({
                message: "Auth failed"
            });
        }
        const token = jwt.sign(
            { email: fetchedUser.email, userId: fetchedUser._id },
             process.env.JWT_SECRET,
              { expiresIn: "1h" }
            );
            res.status(200).json({
                token: token,
                expiresIn: 3600
            });

    })
    .catch(err => {
        console.log(err)
        return res.status(401).json({
            message: "Auth failed"
        });
    })
    ;
}