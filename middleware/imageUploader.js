const multer = require('multer');

const DIRECTORIES = require('../constants/directory');

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        let date = new Date().toISOString();
        while (date.includes(":")) {
            date = date.replace(":", "-");
        }
        const tempDirectory = DIRECTORIES.tempImages + "/" + date;
        console.log(tempDirectory)
        cb(null, 'tempImages');
    },
    filename: (req, file, cb) => {
        let fileName = new Date().toISOString() + file.originalname;
        while(fileName.includes(":")){
            fileName = fileName.replace(":", "-")
        }
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
exports.imageUploader = () => {
    multer({ storage: fileStorage, fileFilter: fileFilter }).array('image');
}