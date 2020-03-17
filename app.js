const path = require('path');
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const express = require('express');
const app = express();
const compression = require('compression');
const fs = require('fs');
const multer = require('multer');
const PORT = process.env.PORT || 8081;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');


const dbConfig = require('./config/dbConfig');
const hydrantRoutes = require('./routes/hydrant');
const authRoutes = require('./routes/authentication');
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

app.use(compression());
app.use(helmet());
app.use(morgan('combined', { stream: accessLogStream }));


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
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

app.use(bodyParser.json());
// app.use(
//    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
// );
// const { exifHydrantUploader } = require('./controllers/exif');
//app.use('/images', express.static(path.join(__dirname, 'images')));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).array('image'));
app.use('/hydrant', hydrantRoutes);
app.use('/auth', authRoutes);




app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data });
})

mongoose.connect(
    dbConfig.url, dbConfig.options
).then(result => {
    app.listen(PORT, () => {
        console.log("Listening on port ", PORT);
    })
}).catch(err => console.log(err));

