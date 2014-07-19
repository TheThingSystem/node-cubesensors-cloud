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

### Get Authorized Request Tokens

Once you have the consumer key and consumer secret, you now need to generate a request token.
With a request token, you can redirect the user to the CubeSensors website,
where they can login and authorize access.
The goal is to get two parameters that are needed to use the REST API: oAuthAccessToken,  and oAuthAccessSecret.
This need be done only once.

The steps are:

1. Create a client with the consumerKey and consumerSecret.

2. Use the authorize method to get the oAuthToken, oAuthTokenSecret, and a redirectURL.

3. Ask the user to go to authorize the application at the redirectURL.
If so, the CubeSensors website will display the oAuthVerifier.

4. Create a client using the consumerKey, consumerSecret, oAuthToken, oAuthTokenSecret, and oAuthVerifier.

5. Use the authorize method to get the oAuthAccessToken and oAuthAccessSecret.

In other words, you run this code twice, updating the clientState variable each time:
    
    var clientState = { consumerKey       : '...'
                      , consumerSecret    : '...'
                      , oAuthToken        : null
                      , oAuthTokenSecret  : null
                      , oAuthVerifier     : null
                      , oAuthAccessToken  : null
                      , oAuthAccessSecret : null
                      };

    var client = new CubesensorsAPI.CubesensorsAPI(clientState).on('error', function(err) {
      console.log('background error: ' + err.message);
    }).authorize(function(err, state, redirectURL) {
      if (!!err) return console.log('authorization failed: ' + err.message);

      if (!!state) clientState = state;

      if (!!redirectURL) {
        // redirect user to redirectURL
        // if the user authorizes access, the browser will display the oAuthVerifier code
      }
    });


### REST API

    var util = require('util')
      ;

    var clientState = { consumerKey       : '...'
                      , consumerSecret    : '...'
                      , oAuthAccessToken  : '...'
                      , oAuthAccessSecret : '...'
                      };

    var client = new CubesensorsAPI.CubesensorsAPI(clientState).on('error', function(err) {
      console.log('background error: ' + err.message);
    })..getDevices(function(err, devices) {
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

        this.getDeviceInfo(device.uid,    infocb(device))
            .getDeviceState(device.uid,   statecb(device))
            .getDeviceHistory(device.uid, historycb(device));
      }
    });


Finally
-------

Enjoy!
