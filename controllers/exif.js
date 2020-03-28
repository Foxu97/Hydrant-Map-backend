const Hydrant = require("../models/hydrant");
const { getDistance } = require('../utils/getDistance');
const { setAddress } = require('../utils/setAddress');
const ExifImage = require('exif').ExifImage;
const fs = require('fs');
const rimraf = require("rimraf");
const compressImage = require('../utils/compressImages').compressImage;

const ConvertDMSToDD = (degrees, minutes, seconds, direction) => {
    var dd = degrees + minutes / 60 + seconds / (60 * 60);

    if (direction.toUpperCase() == "S" || direction.toUpperCase() == "W") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}

const removeFolder = (image) => {
    let imageFolderPath = image.path.split("\\");
    imageFolderPath = imageFolderPath[0] + "/" + imageFolderPath[1];
    rimraf(imageFolderPath, (err) => {
        if (err) throw err;
    });
}
const readImageCoords = async (image) => {
    return new Promise((resolve, reject) => {
        new ExifImage({ image: image.path }, async (err, exifData) => {
            if (err) { //no exifData
                    removeFolder(image);
                    resolve(null); // maybe there is better way?
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
const getCoordinatesFromImages = async (images) => {
    const imagesWithCoordinates = [];
    await asyncForEach(images, async (image) => {
        const img = await readImageCoords(image);
        if (img !== null) {
            imagesWithCoordinates.push(img);
        }
    });
    return {
        images: imagesWithCoordinates, info: {
            recived: images.length,
            returned: images.length - (images.length - imagesWithCoordinates.length)
        }
    };
}
const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

const deleteLocationDuplicates = async (images) => {
    const duplicatesIndexes = [];

    for (let i = 0; i < images.length; i++) {
        for (let j = 0; j < images.length; j++) {
            if (i === j || duplicatesIndexes.includes(i)) { // compare the same image or already checked;
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
    images.forEach(image => {
        if (image.isDuplicate) {
            removeFolder(image);
        }
    })
    console.log(uniqImages.length);
    return uniqImages;
}

exports.exifHydrantUploader = async (req, res, next) => {
    const images = req.files;
    if (images.length === 0) return res.status(400).json({ message: "No images sent" });
    if (images.length > 10) return res.status(400).json({ message: "Too many images" });
    const stats = {
        recived: images.length,
        added: 0,
        updatedImages: 0,
        alreadyExistsWithImage: 0
    }
    try {
        const imagesWithData = await getCoordinatesFromImages(images);
        stats.withLocation = imagesWithData.images.length;

        const withoutLocationDuplicates = await deleteLocationDuplicates(imagesWithData.images);
        stats.locationDuplicates = (imagesWithData.images.length - withoutLocationDuplicates.length);
        stats.unique = withoutLocationDuplicates.length;

        const allHydrantsFormDB = await Hydrant.find();

        await asyncForEach(withoutLocationDuplicates, async (image) => {
            let hydrantExistsInThisLocation = false;
            const p1 = {
                latitude: image.latitude,
                longitude: image.longitude
            }
            await asyncForEach(allHydrantsFormDB, async (hydrant) => {
                const p2 = {
                    latitude: hydrant.latitude,
                    longitude: hydrant.longitude
                }
                const distanceInMeters = getDistance(p1, p2);
                if (distanceInMeters < 25 && hydrant.imagePath === null) {
                    hydrantExistsInThisLocation = true;
                    const compressedImagePath = await compressImage(image.path);
                    const updatedHydrant = await Hydrant.findByIdAndUpdate(hydrant._id, { imagePath: compressedImagePath });
                    if (updatedHydrant) {
                        stats.updatedImages++;
                    }

                    //it should return from j loop
                } else if (distanceInMeters < 25 && hydrant.imagePath !== null) {
                    hydrantExistsInThisLocation = true;
                    removeFolder(image);
                    stats.alreadyExistsWithImage++;
                    //it should return from j loop
                }
            });
            if (!hydrantExistsInThisLocation) {
                const compressedImagePath = await compressImage(image.path);
                const address = await setAddress(image.latitude, image.longitude);
                const newHydrant = new Hydrant({
                    longitude: image.longitude,
                    latitude: image.latitude,
                    address: address,
                    imagePath: compressedImagePath
                });
                const createdHydrant = await newHydrant.save();
                if (createdHydrant) {
                    stats.added++
                }
            }
        });

        res.status(200).json({ message: "Ok", data: stats });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong" });
    }
}

