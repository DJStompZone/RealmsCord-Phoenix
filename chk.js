const axios = require("axios");
const bedrock = require('bedrock-protocol');
const fs = require('fs');
var util = require('util');
const chalk = require('chalk');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const crypto = require('crypto');
const curve = 'secp384r1';
const config = JSON.parse(fs.readFileSync("./config.json"));

class RealmConnection {
    constructor() {
        this.reset();
    }
    reset() {
        this.keypair = crypto.generateKeyPairSync('ec', { namedCurve: curve }).toString('base64');
        this.flow = new Authflow();
        this.flow.getMsaToken();
        this.prealmapi = RealmAPI.from(this.flow, 'bedrock');

        this.restrealm = async function () {
            const rr = await this.prealmapi.getRealm(config.realmId);
            return await rr;
        };
    }
    async numActivePlayers() {
        const rr = await this.restrealm();
        const np = await rr.players?.filter(e => e.online).length;
        return np;
    }
}
    
const RC = new RealmConnection()
const realmState = (async()=>{return await RC.numActivePlayers()})().then((e)=>{console.log(e)})
