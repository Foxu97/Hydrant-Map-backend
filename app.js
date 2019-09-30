const path = require('path');
const dotenv = require('dotenv').config();
//const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');
const port = process.env.PORT || 8081;

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const dbConfig = require('./config/dbConfig');

const hydrantRoutes = require('./routes/hydrant');
const authRoutes = require('./routes/authentication');

//const app = express();
var fs = require('fs')
var https = require('https')
const multer = require('multer');
const upload = multer();
//var privateKey = fs.readFileSync('localhost.key', 'utf8');
//var certificate = fs.readFileSync('localhost.cert', 'utf8');

//var credentials = { key: privateKey, cert: certificate };

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});

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

app.use('/hydrant', hydrantRoutes);
app.use('/auth', authRoutes);

const isHydrantNearbyUtility = require('./utils/isHydrantNearby').isHydrantNearby;


io.on("connection", socket => {
    let isNearby;
    socket.on("isHydrantNearby", async (userCoords) => {
        isNearby = await isHydrantNearbyUtility(userCoords);
        if(!userCoords.latitude || !userCoords.longitude){
            isNearby = true;
        }
        // console.log(userCoords)
        // console.log(isNearby)
        socket.emit('isNearby', isNearby);

    })
    io.emit('isNearby', isNearby);

})


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
    server.listen(port);
    //app.listen(8081, "0.0.0.0");
    //https.createServer(credentials, app).listen(443, "0.0.0.0");
    console.log("Listening on port ", port)
}).catch(err => console.log(err));

