const { validationResult } = require('express-validator/check');
const Hydrant = require("../models/hydrant");
const Request = require('request-promise');
const isHydrantNearbyUtility = require('../utils/isHydrantNearby').isHydrantNearby;
_ULR = process.env.HERE_API_STRING;

function setAddress(lat, long) {
  return new Promise((resolve, reject) => {
    const prox = "&prox=" + lat.toString() + "," + long.toString() + ",150";
    const searchUrl = this._ULR + prox;
    Request(searchUrl, { json: true }, (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      resolve(body);
    });
  });
}



exports.getHydrantById = (req, res, next) => {
  const hydrantId = req.params.hydrantId;
  Hydrant.findById(hydrantId)
    .then(hydrant => {
      if (!hydrant) {
        const error = new Error('Could no find hydrant');
        error.statusCode = 404;
        throw error;
      }
      let newHydrant = {
        _id: hydrant._id,
        longitude: hydrant.longitude,
        latitude: hydrant.latitude,
        numberOfVerifications: hydrant.verifiedBy.length,
        address: hydrant.address,
      };
      if(req.userData){
        if(hydrant.verifiedBy.includes(req.userData.userId)){
          res.status(200).json({ hydrant: newHydrant, canVerify: false });
        }
        else{
          res.status(200).json({ hydrant: newHydrant, canVerify: true });
        }
      } else {
        res.status(200).json({ hydrant: newHydrant, canVerify: false });
      }
    }

    ).catch(err => {
      if (!err.statusCode) {
        err.statudCode = 500;
      }
      next(err);
    })
};

exports.getAllHydrants = async(req, res, next) => {
  const hydrants = await Hydrant.find();
  if(!hydrants){
    res.status(404).json({message: "No hydrants in db"})
  }
  res.status(200).json({hydrants: hydrants});
}

exports.getAllHydrantsInRadius = (req, res, next) => {
  let defaultDistanceInMeters
  req.query.distance ? defaultDistanceInMeters = req.query.distance : defaultDistanceInMeters = 2000;
  let userCoords = {
    lat: req.query.latitude,
    lng: req.query.longitude
  }
  function isInRadius(hydrant){
    return (getDistance({lat: hydrant.latitude, lng: hydrant.longitude}, userCoords) <= defaultDistanceInMeters);
  } 
  Hydrant.find()
    .then(hydrants => {
      let hydrantsList = [];
      hydrants.forEach(hydrant => {
        let newHydrant = {
          _id: hydrant._id,
          latitude: hydrant.latitude,
          longitude: hydrant.longitude,
          numberOfVerifications: hydrant.numberOfVerifications,
          address: hydrant.address
        }
        hydrantsList.push(newHydrant); // maybe better query?
      });

      let hydrantsInRadius = hydrantsList.filter(isInRadius);
      res
        .status(200)
        .json({ message: 'Hydrants in ' + defaultDistanceInMeters.toString() + ' meters fetched.', hydrants: hydrantsInRadius });
    })
    .catch(err => {
      if (!err.statudCode) {
        err.statudCode = 500;
      }
      next(err);
    })

};

exports.verify = (req, res, next) => {
  const userId = req.userData.userId;
  const hydrantId = req.body.hydrantId;
  Hydrant.findById(hydrantId)
  .then(fetchedHydrant => {
    if(fetchedHydrant.verifiedBy.includes(userId)){
      res.status(403).json({mess: "Hydrant already verified by this user!"})
    }
    else{
      fetchedHydrant.verifiedBy.push(userId);
      fetchedHydrant.save()
      .then(
        res.status(200).json({mess: "Hydrant verified successfully!"})
      )
    }
  })
};


exports.addHydrant = async(req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    throw error;
  }
  let isHydrantNearby = await isHydrantNearbyUtility({latitude: req.body.latitude, longitude: req.body.longitude});
  if(!isHydrantNearby) {
   let address = await setAddress(req.body.latitude, req.body.longitude);
      const hydrant = new Hydrant({
      longitude: req.body.longitude,
      latitude: req.body.latitude,
      address: address,
      key: req.body.key
    });
    hydrant.save();
    //res.status(201).json({message: "Hydrant added sucessfully", hydrant: {...hydrant, key: req.body.key}});
    res.status(201).json({message: "Hydrant added sucessfully", hydrant: hydrant});
  } else {
    res.status(400).send("There is hydrant nearby!!!");
  }
};




