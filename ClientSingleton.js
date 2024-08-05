const EventEmitter = require('events');
const bedrock = require('bedrock-protocol');

class ClientSingleton extends EventEmitter {
  /**
   * @type {ClientSingleton}
   */
  static instance;

  constructor() {
    super();
    if (!ClientSingleton.instance) {
      ClientSingleton.instance = this;
      this.client = null;
      this.connectionReady = false;
    }

    return ClientSingleton.instance;
  }

  async getGameClient(config) {
    if (this.client) {
      return this.client;
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          console.log("Creating game client...");
          const c = bedrock.createClient({
            connectTimeout: 15000,
            realms: !config.isRealm ? null : {
              realmId: config.realmId,
            },
            username: config.isRealm ? null : config.botName ?? null,
            host: config.isRealm ? null : config.serverIp ?? "127.0.0.1",
            port: config.isRealm ? null : config.serverPort ?? 0,
          });
          this.client = c;
          this.setupClientListeners(c);
          console.log("Game client created successfully.");
          resolve(c);
        } catch (e) {
          console.error("Error creating game client:", e);
          reject(e.message);
        }
      }, 60000); // 1 minute delay
    });
  }

  setupClientListeners(client) {
    client.on('join', () => {
      this.connectionReady = true;
      console.log("Client has joined the server. Connection is now ready.");
      this.emit('connectionReady');
    });

    client.on('disconnect', () => {
      this.connectionReady = false;
      console.log("Client has disconnected from the server. Connection is no longer ready.");
      this.emit('connectionLost');
    });

    client.on("text", (packet) => {
      this.emit('textPacket', packet);
    });

    client.on("player_list", (packet) => {
      this.emit('playerListPacket', packet);
    });

    client.on('session', () => {
      this.connectionReady = true;
      console.log("Client has joined the server. Connection is now ready.");
      this.emit('sessionStarted');
    });

    client.on('disconnect', () => {
      this.connectionReady = false;
      console.log("Client has disconnected from the server. Connection is no longer ready.");
      this.emit('connectionLost');
    });

    client.on("packet", (packet) => {
      this.emit('packet', packet);
    });

    client.on("spawn", () => {
      this.connectionReady = true;
      this.emit('spawn');
    });
  }

  onConnectionReady() {
    console.log("Client connection is now ready.");
    return new Promise((resolve, reject) => {
      if (this.connectionReady) {
        resolve();
      } else {
        this.once('connectionReady', () => {
          resolve();
        });

      }
    })
  }
}

const instance = new ClientSingleton();

module.exports = instance;
