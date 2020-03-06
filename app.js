const path = require('path');
const dotenv = require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const app = require('express')();
const server = require('http').createServer(app);
const compression = require('compression');
const fs = require('fs');
const multer = require('multer');
const upload = multer();
const PORT = process.env.PORT || 8081;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');


const dbConfig = require('./config/dbConfig');
const hydrantRoutes = require('./routes/hydrant');
const authRoutes = require('./routes/authentication');




const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});

app.use(compression());
app.use(helmet());
app.use(bodyParser.json());
app.use(upload.none());
app.use(morgan('combined', {stream: accessLogStream}));


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
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
    server.listen(PORT, () => {
        console.log("Listening on port ", PORT);
    })
}).catch(err => console.log(err));

