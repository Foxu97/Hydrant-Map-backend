const Hydrant = require('../models/hydrant');
var rad = function (x) {
    return x * Math.PI / 180;
  };
  
  function getDistance(p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.latitude - p1.latitude);
    var dLong = rad(p2.longitude - p1.longitude);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(p1.latitude)) * Math.cos(rad(p2.latitude)) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
  };

exports.isHydrantNearby = async(userCoords) => {
    const distanceToCheck = 10;
    function isNearby(hydrant){
        let hydrantCoords = {
          latitude: hydrant.latitude,
          longitude: hydrant.longitude
        }
        return (getDistance(userCoords, hydrantCoords) < distanceToCheck);
    }
    let hydrants = await Hydrant.find();
    if(hydrants.length === 0) return false;
  
    let hydrantNearby = hydrants.find(isNearby)
    if(hydrantNearby){
      return true;
    }
    else {
      return false;
    }
  }