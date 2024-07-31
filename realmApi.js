const axios = require('axios');
const { Authflow } = require('prismarine-auth');
const config = require('./config.json');
const kp = require('./players.json');
const fs = require('fs')

class RealmApi {
    constructor() {
        this.config = config;
        this.realmId = this.config.realmId;
        this.onlinePlayers = [];
        this.userIds = [];
	this.onlineUsers = []
        this.realmData = {}
        this.realmHeaders = {
            'Authorization': '',
            'Cache-Control': 'no-cache',
            'Charset': 'utf-8',
            'Client-Version': '1.19.31',
            'User-Agent': 'MCPE/UWP',
            'Accept-Language': 'en-US',
            'Accept-Encoding': 'gzip, deflate, br',
            'Host': 'pocket.realms.minecraft.net'
        };
        this.authConfig = {
            method: 'get',
            url: 'https://x-bot.live/api/postman/auth?relyingParty=https://pocket.realms.minecraft.net/',
            headers: { 'Authorization': this.config.xbotToken }
        };
    }
    setup(){
        this.players = Object.values(kp);
        let hdr;
        axios(this.authConfig).then((response)=>{
            this.realmHeaders.Authorization = `XBL3.0 x=${response.data.userHash};${response.data.XSTSToken}`
        }).catch((er) => { console.error(er); });
    }
    
	async getApiHeaders(){
		let tmpAuthConfig = {
            method: 'get',
            url: 'https://x-bot.live/api/postman/auth?relyingParty=https://pocket.realms.minecraft.net/',
            headers: { 'Authorization': this.config.xbotToken }
        };
        let tmpPlayers = Object.values(kp);
        let hdr;
		let tmpHeaders = {}
        axios(tmpAuthConfig).then((response)=>{
            hdr= `XBL3.0 x=${response.data.userHash};${response.data.XSTSToken}`;
			tmpHeaders = {
                'Authorization': hdr,
                'Cache-Control': 'no-cache',
                'Charset': 'utf-8',
                'Client-Version': '1.19.31',
                'User-Agent': 'MCPE/UWP',
                'Accept-Language': 'en-US',
                'Accept-Encoding': 'gzip, deflate, br',
                'Host': 'pocket.realms.minecraft.net'
            }
        }).catch((er) => { console.error(er); });
		let newHeaders = await new Promise((resolve, reject)=>{setTimeout(()=>{tmpHeaders.Authorization = hdr; return resolve(tmpHeaders)}, 1300)})
		return newHeaders
	return this
    }
	
    async getOnlinePlayers() {
		let oPlrs = [];
		let usrIds = [];
		let hdrs = await this.getApiHeaders()
        let getPlayerConfig = {
            method: 'get',
            url: 'https://pocket.realms.minecraft.net/activities/live/players',
            headers: hdrs ?? this.realmHeaders 
        };
        axios(getPlayerConfig).then(async(r) => {
			let plrs = JSON.parse(fs.readFileSync('./players.json', 'utf-8', (e)=>console.log(e)))
            r.data.servers[0].players.forEach((ee) => {
				if (ee.online === true){
					for (let ech of Object.values(plrs)){
						if (ee.uuid === ech.xbox_user_id){
							oPlrs.push({'uuid': ee.uuid, 'operator': ee.operator, username: ech.username})
							usrIds.push(ee.uuid);
						}}
				}
			});
		this.onlinePlayers = await oPlrs
		this.userIds = await usrIds
        });
		return setTimeout(async()=>{return this.onlinePlayers}, 1200)
    }

    async getPlayerByXuid(xuid) {
        this.players.find((e) => {
            if (parseInt(e.xbox_user_id) === xuid) {
                return e;
            }
        });
    }

    async unInvitePlayerByXuid(xuid) {
        var data = `{\r\n    "invites": {\r\n        "${xuid}": "REMOVE"\r\n    }\r\n}`;
        let bootPlayerConfig = {
            method: 'put',
            url: `https://pocket.realms.minecraft.net/invites/${this.config.realmId}/invite/update`,
            headers: this.realmHeaders,
            data: data
        };
        axios(bootPlayerConfig).then((r) => { console.log(r?.data); });
    }

    async banPlayerByXuid(xuid) {
        let banConfig = {
            method: 'post',
            url: `https://pocket.realms.minecraft.net/worlds/${this.config.realmId}/blocklist/${xuid}`
        };
        let result;
        axios(banConfig).then((r) => { console.log("Banned player with xuid: ", xuid, "result: ", r); });
    }

    async getWorldDetails(realmId = this.config.realmId) {
        let RD
        let getWorldConfig = {
            method: 'get',
            url: `https://pocket.realms.minecraft.net/worlds/${realmId}`,
            headers: await this.getApiHeaders()
        };
        let world = await axios(getWorldConfig)
        RD = world?.data
        if (!!RD){this.realmData[realmId.toString()] = RD }
        console.log(RD, JSON.stringify(RD), JSON.parse(JSON.stringify(RD)))
        return RD
        
    }

}

module.exports = RealmApi;
