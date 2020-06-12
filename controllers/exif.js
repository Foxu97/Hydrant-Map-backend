const Hydrant = require("../models/hydrant");
const ExifImage = require('exif').ExifImage;
const fs = require('fs');
const rimraf = require("rimraf");
const _ = require('lodash');

const { getDistance } = require('../utils/getDistance');
const { setAddress } = require('../utils/setAddress');
const compressImage = require('../utils/compressImages').compressImage;
const hydrantExifUploadStats = require('../models/hydrantExifUploadStats');

const ConvertDMSToDD = (degrees, minutes, seconds, direction) => {
    var dd = degrees + minutes / 60 + seconds / (60 * 60);

    if (direction.toUpperCase() == "S" || direction.toUpperCase() == "W") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}

const removeFolder = (image) => {
    let imageFolderPath = image.path.split("\/");
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
                if (_.isEmpty(exifData.gps)) {
                    resolve(null);
                    return;
                }
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
                    if (isNaN(imageLatitude) || isNaN(imageLongitude)){
                        resolve(null);
                        return;
                    }
                    image.latitude = imageLatitude;
                    image.longitude = imageLongitude;
                    resolve(image);
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
    return uniqImages;
}

exports.exifHydrantUploader = async (req, res, next) => {
    const images = req.files;
    if (!images || images.length === 0) return res.status(400).json({ message: "No images sent" });
    if (images.length > 12) return res.status(400).json({ message: "Too many images" });
    const statsDetails = new Map();

    const updateStatsDetails = (revicedImages, imagesArray, status) => {
        revicedImages.forEach(image => {
            const isImage = imagesArray.find((element) => {
                return image.filename === element.filename
            });
            if (!isImage && !statsDetails.has(image.originalname)) {
                statsDetails.set(image.originalname, status)
            }
        });
    }

    const stats = {
        recived: images.length,
        added: 0,
        updatedImages: 0,
        alreadyExistsWithImage: 0
    }
    try {
        const imagesWithData = await getCoordinatesFromImages(images);
        stats.withLocation = imagesWithData.images.length;
        updateStatsDetails(images, imagesWithData.images, hydrantExifUploadStats.NO_EXIF_DATA);


        const withoutLocationDuplicates = await deleteLocationDuplicates(imagesWithData.images);
        stats.locationDuplicates = (imagesWithData.images.length - withoutLocationDuplicates.length);
        stats.unique = withoutLocationDuplicates.length;

        updateStatsDetails(images, withoutLocationDuplicates, hydrantExifUploadStats.DUPLICATE);


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
                if (distanceInMeters < 25 && hydrant.imageName === null) {
                    hydrantExistsInThisLocation = true;
                    const updatedHydrant = await Hydrant.findByIdAndUpdate(hydrant._id, { imageName: image.filename });
                    await compressImage(image.path);
                    if (updatedHydrant) {
                        statsDetails.set(image.originalname, hydrantExifUploadStats.UPDATED_IMAGE)
                        stats.updatedImages++;
                    }

                    //it should return from j loop
                } else if (distanceInMeters < 25 && hydrant.imageName !== null) {
                    hydrantExistsInThisLocation = true;
                    statsDetails.set(image.originalname, hydrantExifUploadStats.ALREADY_EXIST_WITH_IMAGE)
                    removeFolder(image);
                    stats.alreadyExistsWithImage++;
                    //it should return from j loop
                }
            });
            if (!hydrantExistsInThisLocation) {
                const address = await setAddress(image.latitude, image.longitude);
                const newHydrant = new Hydrant({
                    longitude: image.longitude,
                    latitude: image.latitude,
                    address: address,
                    imageName: image.filename
                });
                const createdHydrant = await newHydrant.save();
                await compressImage(image.path);
                if (createdHydrant) {
                    stats.added++
                    statsDetails.set(image.originalname, hydrantExifUploadStats.ADDED)
                }
            }
        });
        res.status(200).json({ message: "Ok", data: stats, details: [...statsDetails] });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong" });
    }
}

