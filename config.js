const path = require("path");
const fs = require('fs');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));

module.exports = config;
