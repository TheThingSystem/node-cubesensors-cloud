node-cubesensors-cloud
======================

A node.js module to interface with the [cloud service](https://my.cubesensors.com/docs)
for [CubeSensors](https://cubesensors.com).

Before Starting
---------------
You will need to activate your CubeSensor hub and send an email to [the folks at CubeSensors](mailto:api@cubesensors.com)
to request a consumer key and a consumer secret.


Install
-------

    npm install cubesensors-cloud

API
---

### Load

    var CubesensorsAPI = require('cubesensors-cloud');

### Login to cloud

Once you have the consumer key and consumer secret, you now need to generate 

    clientState = { clientKey : clientKey, clientSecret : clientSecret };

    var client = new CubesensorsAPI.CubesensorsAPI(clientState).on('error', function(err) {
      console.log('background error: ' + err.message);
    }).authorize(function(err, state) {
      if (!!err) return console.log('authorization failed: ' + err.message);

      clientState = state;
      // securely persist clientState, it has extra parameters
    });


### REST API

    var util = require('util')
      ;

    client.getDevices(function(err, devices) {
      var device, i;

      if (!!err) return console.log('getDevices failed: ' + err.message);

      var infocb = function(device) {
        return function(err, info) {
          if (!!err) return console.log('getDeviceInfo ' + device.uid + ' failed: ' + err.message);

          console.log('>>> device ' + device.name + ' (' + device.uid + ') info');
          console.log(util.inspect(info, { depth: null }));
        };
      };

      var statecb = function(device) {
        return function(err, state) {
          if (!!err) return console.log('getDeviceState ' + device.uid + ' failed: ' + err.message);

          console.log('>>> device ' + device.name + ' (' + device.uid + ') state:');
          console.log(util.inspect(state, { depth: null }));
        };
      };

      var historycb = function(device) {
        return function(err, history) {
          var i, state;

          if (!!err) return console.log('getDeviceHistory ' + device.uid + ' failed: ' + err.message);

          console.log('>>> device ' + device.name + ' (' + device.uid + ') history:');
          for (i = 0; i < history.length; i++) {
            state = state[i];
            console.log('>>> history entry #' + i);
            console.log(util.inspect(state, { depth: null }));
          }
        };
      };

      for (i = 0; i < devices.length; i++) {
        device = devices[i];
        console.log('>>> device #' + i);
        console.log(util.inspect(device, { depth: null }));

        this.getDeviceInfo(device.uid, infocb(device))
            .getDeviceState(device.uid, statecb(device))
            .getDeviceHistory(device.uid, historycb(device));
      }
    });


Finally
-------

Enjoy!
