'use strict';

var mqtt = require('mqtt');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-mqtt-doorbell", "mqtt-doorbell", DoorbellAccessory);
}

function DoorbellAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.url = config['url'];
  this.topic = config['topic'];
  this.client_Id 		= 'mqttjs_' + Math.random().toString(16).substr(2, 8);
  this.options = {
    keepalive: 10,
    clientId: this.client_Id,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30 * 1000,
    will: {
      topic: 'WillMsg',
      payload: 'Connection Closed abnormally..!',
      qos: 0,
      retain: false
      },
    username: config["username"],
    password: config["password"],
    rejectUnauthorized: false
  };

  this.service = new Service.Door(this.name);
  this.service
  .getCharacteristic(Characteristic.ProgrammableSwitchEvent)
  .on('get', this.triggerProgrammableSwitchEvent.bind(this));

  this.service
  .getCharacteristic(Characteristic.Volume)
  .on('get', this.mute_doorbell.bind(this));

  this.client  = mqtt.connect(this.url, this.options);
  var that = this;
  this.client.subscribe(this.topic);

  this.client.on('message', function (topic, message) {
  //data = JSON.parse(message);
  //if (data === null) {return null}
  that.ringbell = parseFloat(data);
  });
}


DoorbellAccessory.prototype.triggerProgrammableSwitchEvent = function(callback) {
  callback(null, this.ringbell);
}

DoorbellAccessory.prototype.triggerProgrammableSwitchEvent = function(callback) {
  callback(null, this.mute_doorbell);
}

DoorbellAccessory.prototype.getServices = function() {
  return [this.service];
}
