const fetch = require('node-fetch');

const _apiURL = process.env.HERE_API_STRING;

exports.setAddress = async (lat, long) => {
  const prox = "&prox=" + lat.toString() + "," + long.toString() + ",150";
  const searchUrl = _apiURL + prox;

  try {
    const response = await fetch(searchUrl);
    const json = await response.json();
    console.log("address:", json.Response.View[0].Result[0].Location.Address);
    return json.Response.View[0].Result[0].Location.Address;
  } catch (err) {
    console.log(err)
  }

}