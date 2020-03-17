const Hydrant = require("../models/hydrant");
const { getDistance } = require('../utils/getDistance');
const ExifImage = require('exif').ExifImage;
const fs = require('fs');

const ConvertDMSToDD = (degrees, minutes, seconds, direction) => {
    var dd = degrees + minutes/60 + seconds/(60*60);

    if (direction.toUpperCase() == "S" || direction.toUpperCase() == "W") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}

const removeTempImage = (imageName) => {
    const fileToRemove = "tempImages/" + imageName
    fs.unlink(fileToRemove, (err) => {
      if (err) throw err;
    });
}
const readImageCoords = async(image) => {
    return new Promise((resolve, reject) => {
        new ExifImage({ image: image.path}, (err, exifData) => {
            if (err) { //no exifData
                removeTempImage(image.filename)
                console.log(err);
                resolve(null); // maybe there is better way?
            } else {
                if (exifData.gps) {
                    console.log(exifData.gps);
                    image.gps = exifData.gps;
                    const latitudeDegrees = exifData.gps.GPSLatitude[0];
                    const latitudeMinutes = exifData.gps.GPSLatitude[1];
                    const latitudeSeconds = exifData.gps.GPSLatitude[2];
                    const latitudeDirection = exifData.gps.GPSLatitudeRef;
    
                    const longitudeDegrees = exifData.gps.GPSLongitude[0];
                    const longitudeMinutes = exifData.gps.GPSLongitude[1];
                    const longitudeSeconds = exifData.gps.GPSLongitude[2];
                    const longitudeDirection = exifData.gps.GPSLongitudeRef;
    
                    const imageLatitude = ConvertDMSToDD(latitudeDegrees, latitudeMinutes, latitudeSeconds, latitudeDirection);
                    const imageLongitude = ConvertDMSToDD(longitudeDegrees, longitudeMinutes, longitudeSeconds, longitudeDirection);
                    image.latitude = imageLatitude;
                    image.longitude = imageLongitude;
                    resolve(image);
                }
            }
        });
    })
}
const getCoordinatesFromImages = async(images) => {
    const imagesWithCoordinates = [];
    await asyncForEach(images, async(image) => {
        const img = await readImageCoords(image);
        if (img !== null){
            imagesWithCoordinates.push(img);
        }
    })
    console.log(imagesWithCoordinates);
    //it should return only images with coords;
    return {images: imagesWithCoordinates, info: {
        recived: images.length,
        returned: images.length - (images.length - imagesWithCoordinates.length)
    }};
}
const asyncForEach = async(array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

exports.exifHydrantUploader = async (req, res, next) => {
    const images = req.files;

    
    if (images.length === 0) return res.status(400).json({message: "No images sent"});
    
    try{
        const imagesWithData = await getCoordinatesFromImages(images);
        console.log(imagesWithData);
        // fetch all hydrants from db
        // check for each image if there is already hydrant nearby, 
        //if yes chcec 
        //if hasPhoto if has delete file
        //else add path and remove file to hydrantsImages
        // const allHydrantsInDB = await Hydrant.find();
        res.status(200).json({message: "All hydrants fetched", data: imagesWithData});

    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong"});
    }
}

