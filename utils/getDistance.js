var toRadians = function (x) {
    return x * Math.PI / 180;
  };
  
exports.getDistance = (p1, p2) => {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = toRadians(p2.latitude - p1.latitude);
    var dLong = toRadians(p2.longitude - p1.longitude);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(p1.latitude)) * Math.cos(toRadians(p2.latitude)) *
      Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distanceInMeters = R * c;
    return distanceInMeters;
  };