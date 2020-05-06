const Hydrant = require("../models/hydrant");
const { checkIsHydrantNearby } = require('../utils/checkIsHydrantNearby');
const { getDistance } = require('../utils/getDistance');
const { setAddress } = require('../utils/setAddress');
const rimraf = require("rimraf");
const compressImage = require('../utils/compressImages').compressImage;

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
    return hydrantsInRadius.length === 0 ? res.status(404).json({ message: "No hydrants in given range", rangeInMeters: rangeInMeters, data: [] }) : res.status(200).json({ message: "Hydrants fetched successfull", rangeInMeters: rangeInMeters, amountOfHydrantsInRange: hydrantsInRadius.length, data: hydrantsInRadius });
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
      let compressedImagePath = null;
      if (image) {
         await compressImage(image.path);
         compressedImagePath = image.filename;
      }
      const hydrant = new Hydrant({
        longitude: req.query.longitude,
        latitude: req.query.latitude,
        address: address,
        imageName: compressedImagePath 
      });
      const addedHydrant = await hydrant.save();
      return res.status(201).json({ message: "Hydrant added sucessfully", data: addedHydrant });
    }
    if (image) {
      let imageFolderPath = image.path.split("\\");
      imageFolderPath = imageFolderPath[0] + "/" + imageFolderPath[1];
      rimraf(imageFolderPath, (err) => {
        if (err) throw err;
      });
    }
    return res.status(400).json({ message: "There is hydrant nearby!!!" });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: "Something went wrong! :(" });
  }
}

exports.getAddress = async (req, res, next) => {
  if (!(parseFloat(req.query.latitude)) || !parseFloat(req.query.longitude)) {
    return res.status(400).json({ message: "Invalid parameters: latitude or longitude" });
  }
  try {
    const address = await setAddress(req.query.latitude, req.query.longitude);
    const addressFormatted = `${address.City}, ${address.Street} ${address.HouseNumber}`;
    res.status(200).json({ message: "Address fetched", data: addressFormatted });

  } catch (err) {
    res.status(500).json({ message: "Something went wrong :(" });
  }
}

exports.uploadImage = async (req, res, next) => {
  if (!req.files[0]) {
    res.status(400).json({ message: "No image." });
  }
  const image = req.files[0];
  if (
    !req.body.hydrantID ||
    !req.body.latitude ||
    !req.body.longitude
  ) {
    res.status(400).json({ message: "Bad parametrs." });
  }
  const hydrantID = req.body.hydrantID;

  const fetchedHydrant = await Hydrant.findById(hydrantID);
  if (!fetchedHydrant) {
    res.status(404).json({ message: "Hydrant not found." });
  }
  const userPosition = {
    latitude: req.body.latitude,
    longitude: req.body.longitude
  }
  const hydranPosition = {
    latitude: fetchedHydrant.latitude,
    longitude: fetchedHydrant.longitude
  }
  const distance = getDistance(userPosition, hydranPosition);
  if (distance > 25) {
    res.status(400).json({ message: "You have to be closer to hydrant if you want to update its image." });
  }
  await compressImage(image.path);

  fetchedHydrant.imageName = image.filename;
  await fetchedHydrant.save();
  res.status(201).json({ message: "Hydrants image updated." });
}

exports.getXNearestHydrants = async (req, res, next) => {
  if (!(parseFloat(req.query.latitude)) || !parseFloat(req.query.longitude) || !parseInt(req.query.amount)) {
    return res.status(400).json({ message: "Invalid parameters: latitude, longitude, range or amount" });
  }
  const userLatitude = req.query.latitude;
  const userLongitude = req.query.longitude;
  const amount = req.query.amount;
  let rangeInMeters = 0;
  if (req.query.range) {
    rangeInMeters = req.query.range
  }
  //req.query.range ? rangeInMeters = req.query.range : rangeInMeters = 0;

  const allHydrants = await Hydrant.find();

  const compare = (hydrantA, hydrantB) => {
    let comparsion = 0;
    if (hydrantA.distance > hydrantB.distance){
      comparsion = 1;
    } else if (hydrantA.distance < hydrantB.distance){
      comparsion = -1
    }
    return comparsion;
  }

  const isInRadius = (hydrant) => {
    const distance = getDistance({ latitude: hydrant.latitude, longitude: hydrant.longitude }, { latitude: userLatitude, longitude: userLongitude });
    hydrant.distanceToHydrant = distance;
    return distance <= rangeInMeters;
  }
  // kwestia wydajnosciowa
  // zrobic poprawne zapytanie na baze które zwroci mi hydranty tylko z odpowiednimi lat, lng w zaleznosci od range
  // nie sortowac calosci hydrantsInRadius a nastepnie obcinac w zaleznosci od amount tylko
  // napisac metode ktora bierze hydrant z najmniejszym distance (nie branym w poprzedniej iteracji) i dodaje go do nowej tablicy az tablica ma length amount;
  let hydrantsInRadius;
  if (rangeInMeters === 0){
    hydrantsInRadius = [...allHydrants];
  } else {
    hydrantsInRadius = allHydrants.filter(isInRadius);
  }
  hydrantsInRadius.forEach(hydrant => {
    hydrant.distance = getDistance({ latitude: hydrant.latitude, longitude: hydrant.longitude }, { latitude: userLatitude, longitude: userLongitude }).toFixed(2);
  }) //bezsensu ze musze wywolac getDistance drugi raz
  hydrantsInRadius.sort(compare);
  if (amount < hydrantsInRadius.length) {
    hydrantsInRadius = hydrantsInRadius.slice(0, amount);
  }
  return res.status(200).json({data: hydrantsInRadius, amount: hydrantsInRadius.length});

}