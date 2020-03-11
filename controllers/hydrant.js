const Hydrant = require("../models/hydrant");
const { checkIsHydrantNearby } = require('../utils/checkIsHydrantNearby');
const { getDistance } = require('../utils/getDistance');
const { setAddress } = require('../utils/setAddress');


exports.getHydrantById = async (req, res, next) => {
  const hydrantId = req.params.hydrantId;
  if (!hydrantId) res.status(400).json({ message: "Invalid parameters: id" });
  try {
    const fetchedHydrant = await Hydrant.findById(hydrantId);
    if (!fetchedHydrant) res.status(404).json({ message: "No hydrant fetched" });
    res.status(200).json({ message: "Hydrant fetched sucessfully", data: fetchedHydrant });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Something went wrong :("});
  }

};

exports.getAllHydrants = async (req, res, next) => {
  const hydrants = await Hydrant.find();
  if (!hydrants) {
    res.status(404).json({ message: "No hydrants in db" })
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
      return allHydrants.length === 0 ? res.status(404).json({ message: "No hydrants in db", rangeInMeters: rangeInMeters, data: null }) : res.status(200).json({ message: "Hydrants fetched successfull", rangeInMeters: rangeInMeters, data: allHydrants });
    }
    const hydrantsInRadius = allHydrants.filter(isInRadius);
    return hydrantsInRadius.length === 0 ? res.status(404).json({ message: "No hydrants in given range", rangeInMeters: rangeInMeters, data: null }) : res.status(200).json({ message: "Hydrants fetched successfull", rangeInMeters: rangeInMeters, data: hydrantsInRadius });
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
  if (!(parseFloat(req.body.latitude)) || !parseFloat(req.body.longitude)) {
    return res.status(400).json({ message: "Invalid parameters: latitude or longitude" });
  }
  const hydrantToAddLatitude = parseFloat(req.body.latitude);
  const hydrantToAddLongitude = parseFloat(req.body.longitude);
  try {
    const isNearby = await checkIsHydrantNearby({ latitude: hydrantToAddLatitude, longitude: hydrantToAddLongitude });
    if (!isNearby) {
      const address = await setAddress(hydrantToAddLatitude, hydrantToAddLongitude);
      const hydrant = new Hydrant({
        longitude: hydrantToAddLongitude,
        latitude: hydrantToAddLatitude,
        address: address
      });
      const addedHydrant = await hydrant.save();
      res.status(201).json({ message: "Hydrant added sucessfully", hydrant: addedHydrant });
    } else {
      res.status(400).json({ message: "There is hydrant nearby!!!" });
    }
  } catch (err) {
    res.status(500).json({ message: "Something went wrong :(" });
  }
};

exports.getAddress = async (req, res, next) => {
  if (!(parseFloat(req.query.latitude)) || !parseFloat(req.query.longitude)) {
    return res.status(400).json({ message: "Invalid parameters: latitude or longitude" });
  }
  try {
    const address = await setAddress(req.query.latitude, req.query.longitude);
    res.status(200).json({message: "Address fetched", data: address.Label})

  } catch (err) {
    res.status(500).json({ message: "Something went wrong :(" });
  }
}




