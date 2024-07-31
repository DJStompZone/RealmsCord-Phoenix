const { rtest, pktrgx, ignorepackets, logpaknames } = require('./utils');
const { OPO } = require('./colors');

function logOrIgnore(packetname) {
    if (!(logPacketNames)) { return }
    try {
        if (logpaknames !== 1) {
            return;
        }
        if (rtest(packetname) === true) {
            return;
        }
        if (ignorepackets.includes(packetname)) {
            return;
        }
        OPO("Received a", packetname, "packet.");
    } catch (e) {
        console.log(e);
    }
}

module.exports = {
    logOrIgnore
};

