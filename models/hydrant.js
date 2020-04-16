const moongose = require('mongoose');
const Schema = moongose.Schema;

const User = require("./user");

const hydrantSchema = new Schema({
    key: {
    type: Date,
    required: false
    },
    longitude: {
        type: Number,
        required: true
    },
    latitude:{
        type: Number,
        required: true
    },
    verifiedBy: {
      type: Array,
      ref: 'User',
      required: false,
    },
    numberOfVerifications: {
      type: Number,
      required: false
    },
    imageName: {
      type: String,
      required: false,
      default: null
    },
    distance: {
      type: Number,
      required: false
    },
    address:{
        type: Object,
        "Response": {
            "MetaInfo": {
              "Timestamp": String,
              "NextPageInformation": String
            },
            "View": [{
              "_type": String,
              "ViewId": Number,
              "Result": [{
                "Relevance": Number,
                "Distance": Number,
                "MatchLevel": String,
                "MatchQuality": {
                  "Country": Number,
                  "State": Number,
                  "County": Number,
                  "City": Number,
                  "District": Number,
                  "Street": [],
                  "HouseNumber": Number,
                  "PostalCode": Number
                },
                "MatchType": String,
                "Location": {
                  "LocationId": String,
                  "LocationType": String,
                  "DisplayPosition": {
                    "Latitude": Number,
                    "Longitude": Number
                  },
                  "MapView": {
                    "TopLeft": {
                      "Latitude": Number,
                      "Longitude": Number
                    },
                    "BottomRight": {
                      "Latitude": Number,
                      "Longitude": Number
                    }
                  },
                  "Address": {
                    "Label": String,
                    "Country": String,
                    "State": String,
                    "County": String,
                    "City": String,
                    "District": String,
                    "Street": String,
                    "HouseNumber": String,
                    "PostalCode": String,
                    "AdditionalData": [
                      {
                        "value": String,
                        "key": String
                      },
                      {
                        "value": String,
                        "key": String
                      },
                      {
                        "value": String,
                        "key": String
                      },
                      {
                        "value": String,
                        "key": String
                      }
                    ]
                  },
                  "MapReference": {
                    "ReferenceId": String,
                    "Spot": Number,
                    "SideOfStreet": String,
                    "CountryId": String,
                    "StateId": String,
                    "CountyId": String,
                    "CityId": String,
                    "BuildingId": String,
                    "AddressId": String
                  },
                  "Shape": {
                    "_type": String,
                    "Value": String
                  }
                }
              }]
            }]
          }
    }
}, { timestamps: true }
);

module.exports = moongose.model('Hydrant', hydrantSchema);