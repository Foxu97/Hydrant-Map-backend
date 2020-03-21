const Hydrant = require("../models/hydrant");
const { checkIsHydrantNearby } = require('../utils/checkIsHydrantNearby');
const { getDistance } = require('../utils/getDistance');
const { setAddress } = require('../utils/setAddress');
const fs = require('fs');
const rimraf = require("rimraf");
const compress = require('../utils/compressImages').compressImages;


exports.getHydrantById = async (req, res, next) => {
  const hydrantId = req.params.hydrantId;
  if (!hydrantId) res.status(400).json({ message: "Invalid parameters: id" });
  try {
    const fetchedHydrant = await Hydrant.findById(hydrantId);
    if (!fetchedHydrant) res.status(404).json({ message: "No hydrant fetched" });
    res.status(200).json({ message: "Hydrant fetched sucessfully", data: fetchedHydrant });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Something went wrong :(" });
  }

};

exports.getAllHydrants = async (req, res, next) => {
  const hydrants = await Hydrant.find();
  if (!hydrants) {
    res.status(404).json({ message: "No hydrants in db", data: [] })
  }
  res.status(200).json(hydrants);
}

exports.getAllHydrantsInRadius = async (req, res, next) => {
  console.log(req.query)
  if (!(parseFloat(req.query.latitude)) || !parseFloat(req.query.longitude)) {
    return res.status(400).json({ message: "Invalid parameters: latitude or longitude" });
  }
  const userLatitude = parseFloat(req.query.latitude);
  const userLongitude = parseFloat(req.query.longitude);
  let rangeInMeters = 0;
  if (!!parseInt(req.query.range)) {
    rangeInMeters = parseInt(req.query.range);
  }
  const isInRadius = (hydrant) => {
    return (getDistance({ latitude: hydrant.latitude, longitude: hydrant.longitude }, { latitude: userLatitude, longitude: userLongitude }) <= rangeInMeters);
  }
  try {
    const allHydrants = await Hydrant.find();
    if (rangeInMeters === 0) {
      return allHydrants.length === 0 ? res.status(404).json({ message: "No hydrants in db", rangeInMeters: rangeInMeters, data: [] }) : res.status(200).json({ message: "Hydrants fetched successfull", rangeInMeters: rangeInMeters, data: allHydrants });
    }
    const hydrantsInRadius = allHydrants.filter(isInRadius);
    return hydrantsInRadius.length === 0 ? res.status(404).json({ message: "No hydrants in given range", rangeInMeters: rangeInMeters, data: [] }) : res.status(200).json({ message: "Hydrants fetched successfull", rangeInMeters: rangeInMeters, data: hydrantsInRadius });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong :(" })
  }
};

exports.verify = (req, res, next) => {
  const userId = req.userData.userId;
  const hydrantId = req.body.hydrantId;
  Hydrant.findById(hydrantId)
    .then(fetchedHydrant => {
      if (fetchedHydrant.verifiedBy.includes(userId)) {
        res.status(403).json({ mess: "Hydrant already verified by this user!" })
      }
      else {
        fetchedHydrant.verifiedBy.push(userId);
        fetchedHydrant.save()
          .then(
            res.status(200).json({ mess: "Hydrant verified successfully!" })
          )
      }
    })
};


exports.addHydrant = async (req, res, next) => {
  console.log(req.query)
  const latLongValid = parseFloat(req.query.latitude) && parseFloat(req.query.longitude);
  if (!latLongValid) {
    return res.status(400).json({ message: "Invalid parameters: latitude or longitude." });
  }
  let image;
  if (req.files) {
    image = req.files[0];
  }
  try {
    const isNearby = await checkIsHydrantNearby({ latitude: req.query.latitude, longitude: req.query.longitude });
    if (!isNearby) {
      const address = await setAddress(req.query.latitude, req.query.longitude);
      let dest = null;
      if (image) {
        dest = "hydrantsImages/" + image.filename;
        let imageFolderPath = image.path.split("\\");
        imageFolderPath = imageFolderPath[0] + "/" + imageFolderPath[1];
        compress(imageFolderPath, () => {
          rimraf(imageFolderPath, (err) => {
            if (err) throw err;
          });
        });
      }
      const hydrant = new Hydrant({
        longitude: req.query.longitude,
        latitude: req.query.latitude,
        address: address,
        imagePath: dest
      });
      const addedHydrant = await hydrant.save();
      console.log("Hydrant added sucessfully")
      return res.status(201).json({ message: "Hydrant added sucessfully", data: addedHydrant });
    }
    if(image){
      const fileToRemove = "tempImages/" + image.filename // need to create function
      fs.unlink(fileToRemove, (err) => {
        if (err) throw err;
      });
    }

    console.log("There is hydrant nearby!!!")
    return res.status(400).json({ message: "There is hydrant nearby!!!" });
  } catch (err) {
    console.log(err)
    console.log("Something went wrong! :(")
    res.status(500).json({ message: "Something went wrong! :(" });
  }
}

exports.updateHydrantPhoto = async (req, res, next) => {
  if (!req.query.id || !req.file) {  
    console.log("Invalid data!")
    return res.status(400).json({ message: "Invalid data!" });
  }
  try {
    const fetchedHydrant = await Hydrant.findById(req.query.id);
    if (!fetchedHydrant) {
      console.log("No hydrant fetched :(")
      return res.status(400).json({ message: "No hydrant fetched" });
    }
    const src = req.file.path;
    let dest = "hydrantsImages/" + req.file.filename;
    fs.copyFile(src, dest, (err) => {
      if (err) throw err;
      const fileToRemove = "tempImages/" + req.file.filename
      fs.unlink(fileToRemove, (err) => {
        if (err) throw err;
      });
    });
    fetchedHydrant.imagePath = dest;
    const updatedHydrant = await fetchedHydrant.save();
    console.log("Hydrant updated!")
    res.status(201).json({message: "Hydrant updated!", data: updatedHydrant})
    
  } catch (err) {
    console.log(err)
    console.log("Something went wrong! :(")
    res.status(500).json({ message: "Something went wrong! :(" });
  }
}



exports.getAddress = async (req, res, next) => {
  if (!(parseFloat(req.query.latitude)) || !parseFloat(req.query.longitude)) {
    return res.status(400).json({ message: "Invalid parameters: latitude or longitude" });
  }
  try {
    const address = await setAddress(req.query.latitude, req.query.longitude);
    res.status(200).json({ message: "Address fetched", data: address.Label });

  } catch (err) {
    res.status(500).json({ message: "Something went wrong :(" });
  }
}




