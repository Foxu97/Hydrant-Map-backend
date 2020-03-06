const Hydrant = require('../models/hydrant');
const { getDistance } = require('./getDistance');

exports.checkIsHydrantNearby = async(userCoords) => {
    const distanceToCheck = 25; // hydrants cant be nearest than 25m to each other
    const isNearby = (hydrant) => {
        return getDistance(userCoords, {latitude: hydrant.latitude, longitude: hydrant.longitude}) <= distanceToCheck;
    }
    try {
      const allHydrants = await Hydrant.find();
      if(allHydrants.length === 0) return false;
      const hydrantNearby = allHydrants.find(isNearby);
      return hydrantNearby ? true : false;

    } catch (err) {
      console.log(err)
    }

  }