const fs = require('fs');

const DIRECTORIES = require('../constants/directory');

exports.createDirectories = () => {
    for (directory in DIRECTORIES){
        if (!fs.existsSync(DIRECTORIES[directory])){
            fs.mkdirSync(DIRECTORIES[directory]);
        }
    }
}