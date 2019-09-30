const moongose = require('mongoose');
const Schema = moongose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    }
});

module.exports = moongose.model('User', userSchema);