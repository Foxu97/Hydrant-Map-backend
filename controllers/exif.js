const Hydrant = require("../models/hydrant");
const { getDistance } = require('../utils/getDistance');
const ExifImage = require('exif').ExifImage;
const fs = require('fs');
const rimraf = require("rimraf");
const compress = require('../utils/compressImages').compressImages;

const ConvertDMSToDD = (degrees, minutes, seconds, direction) => {
    var dd = degrees + minutes/60 + seconds/(60*60);

    if (direction.toUpperCase() == "S" || direction.toUpperCase() == "W") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}

const removeTempImage = (imageName) => {
    return new Promise((resolve, reject) => {
        const fileToRemove = "tempImages/" + imageName
        fs.unlink(fileToRemove, (err) => {
          if (err) throw err; //reject ? 
          resolve();
        });
    })
}
const moveImage = (image) => {
    return new Promise((resolve, reject) => {
        const src = image.path;
        dest = "hydrantsImages/" + image.filename;
        fs.copyFile(src, dest, (err) => {
          if (err) throw err; // reject?
          resolve();
        });
    })

}
const readImageCoords = async(image) => {
    return new Promise((resolve, reject) => {
        new ExifImage({ image: image.path}, async(err, exifData) => {
            if (err) { //no exifData
                try {
                    await removeTempImage(image.filename)
                    resolve(null); // maybe there is better way?
                } catch (err) {
                    resolve(null);
                }
            } else {
                if (exifData.gps) {
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
    });
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

const deleteLocationDuplicates = async(images) => {
    const duplicatesIndexes = [];

    for (let i = 0; i < images.length; i++){
        for (let j = 0; j < images.length; j++) {
            if (i === j || duplicatesIndexes.includes(i)){ // compare the same image or already checked;
                continue;
            }
            const p1 = {
                latitude: images[i].latitude,
                longitude: images[i].longitude,
            }
            const p2 = {
                latitude: images[j].latitude,
                longitude: images[j].longitude,
            }
            const distance = getDistance(p1, p2);
            if (distance < 25) {
                duplicatesIndexes.push(j);
            } // minimal distance to nearest hydrant
        }

    }
    console.log("Duplicates indexes: ", duplicatesIndexes);
    duplicatesIndexes.forEach(duplicate => {
        images[duplicate].isDuplicate = true;
    });
    const uniqImages = images.filter(image => {
        return image.isDuplicate != true;
    });
    try {
        await asyncForEach(images, async(image) => {
            if (image.isDuplicate) {
                await removeTempImage(image.filename);
            }
        })  
    } catch (err) {
        console.log(err);
    }
    console.log(uniqImages.length);
    return uniqImages;
}

exports.exifHydrantUploader = async (req, res, next) => {
    const images = req.files; 
    if (images.length === 0) return res.status(400).json({message: "No images sent"});
    try{
        const imagesWithData = await getCoordinatesFromImages(images);
        const withoutLocationDuplicates = await deleteLocationDuplicates(imagesWithData.images);
        console.log("Otrzymano: ", images.length)
        console.log("Z lokalizacją: ", imagesWithData.info)
        console.log("Bez duplikatów: ", withoutLocationDuplicates.length);
        // await asyncForEach(withoutLocationDuplicates, async(image) => {
        //     await moveImage(image);
        // });
        const allHydrantsFormDB = await Hydrant.find();
        // await asyncForEach(images, async(image) => {
        //     await removeTempImage(image.filename);
        // });
        //console.log(imagesWithData);
        // fetch all hydrants from db
        // check for each image if there is already hydrant nearby, 
        //if yes chcec 
        //if hasPhoto if has delete file
        //else add path and remove file to hydrantsImages
        // const allHydrantsInDB = await Hydrant.find();
        res.status(200).json({message: "All hydrants fetched", data: withoutLocationDuplicates});

    } catch (err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong"});
    }
}

