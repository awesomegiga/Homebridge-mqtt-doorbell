'use strict';

var mqtt = require('mqtt');
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-mqtt-doorbell", "mqtt-doorsystem", doorSystem);
};

function doorSystem(log, config) {
  this.log = log;
  this.name = config["name"];
  this.url = config['url'];
  this.topicDoorbellRinging = config['topic_doorbellRinging'];
  this.topicDoorbellMute = config['topic_doorbellMute'];
  this.topicDoorOpener = config['topic_doorOpener'];

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

  this.doorbellRinging = false;
  this.doorbellMute = false;
  this.doorClosed = 1;
  this.doorOpen = false;
  this.doorState = false;
  this.doorOpeningObstruction = false;

  this.Doorbellservice = new Service.MotionSensor(this.name);
  this.Doorbellservice
    .getCharacteristic(Characteristic.MotionDetected)
    .on('get', this.getDoorbellRinging.bind(this));

  // this.DoorbellVolume = new Service.Speaker()
  this.Doorbellservice
    .addCharacteristic(Characteristic.On)
    .on('get', this.getmuteDoorbell.bind(this))
    .on('set', this.setmuteDoorbell.bind(this));
  //
  // this.doorOpener = new Service.GarageDoorOpener();
  // this.doorOpener
  this.Doorbellservice
    .addCharacteristic(Characteristic.TargetDoorState)
    .on('get', function(callback) {
      callback(null, (this.doorClosed));
    }.bind(this))
    .on('set', this.openDoor.bind(this));
  //
  // this.doorOpener
  //   .getCharacteristic(Characteristic.CurrentDoorState)
  //   .on('get', function(callback) {
  //     callback(null, this.doorState);
  //   }.bind(this));
  //
  // this.doorOpener
  //   .getCharacteristic(Characteristic.ObstructionDetected)
  //   .on('get', function(callback) {
  //     callback(null, this.doorOpeningObstruction);
  //   }.bind(this));

  this.informationService = new Service.AccessoryInformation()
    .setCharacteristic(Characteristic.Manufacturer, "GiGa Factory")
    .setCharacteristic(Characteristic.Model, "ESP8266")
    .setCharacteristic(Characteristic.SerialNumber, "XXXXXX");


  this.client  = mqtt.connect(this.url, this.options);
  var that = this;
  this.client.subscribe(this.topicDoorbellRinging);

  this.client.on('message', function (topic, message) {
    // data = JSON.parse(message);
    // if (data === null) {return null}
    if (topic === that.topicDoorbellRinging){
      // that.doorbellRinging = parseFloat(message);
      that.log('MQTT:message arrived (Topic: ', that.topicDoorbellRinging, ', Content: ', message.toString(), ')');
      if (message.toString() === 'true'){
        that.doorbellRinging = true;
        that.setDoorbellRiningEvent();
      }
    }
  }.bind(that));
}

doorSystem.prototype.getmuteDoorbell = function(callback) {
  callback(null, (this.doorbellMute));
}

doorSystem.prototype.setmuteDoorbell = function(value, callback) {
  this.doorbellMute = value;
  this.log('Doorbell mute is: ', this.doorbellMute);
  this.client.publish(this.topicDoorbellMute ,this.doorbellMute.toString(), { qos: 1, retained: true });
  this.doorbellMute = this.doorbellMute;
  callback(null);
}

doorSystem.prototype.openDoor = function(value, callback) {
  if (value == 1){
    this.doorOpen = false;
    this.doorClosed = 1;
    }
  else if (value == 0){
    this.doorOpen = true;
    this.doorClosed = 0;
  }
  else{
  this.log('Unknown State pf door open');}
  this.log('Open the door: ', this.doorOpen);
  this.client.publish(this.topicDoorOpener ,this.doorOpen.toString(), { qos: 1, retained: true });
  this.doorOpen = !(this.doorOpen);
  this.doorClosed = !(this.doorClosed);
  callback(null);
}

doorSystem.prototype.getDoorbellRinging = function(callback) {
  callback(null, this.doorbellRinging);
}

doorSystem.prototype.setDoorbellRiningEvent = function() {
  this.log("Doorbell is Ringing");
  this.Doorbellservice.setCharacteristic(Characteristic.MotionDetected, this.doorbellRinging);
  this.doorbellRinging = false;
  // this.log("Doorbell Ringing status is: ", this.doorbellRinging);
}

doorSystem.prototype.getServices = function() {
  // return [this.infoService, this.Doorbellservice, this.doorOpener, this.DoorbellVolume];
  return [this.Doorbellservice, this.informationService];
}
