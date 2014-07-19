var CubeSensorsAPI = require('./cubeSensors-cloud')
  , util           = require('util')
  ;

var clientState = { consumerKey       : '...'
                  , consumerSecret    : '...'
                  , oAuthToken        : null
                  , oAuthTokenSecret  : null
                  , oAuthVerifier     : null
                  , oAuthAccessToken  : null
                  , oAuthAccessSecret : null
              };

new CubeSensorsAPI.CubeSensorsAPI(clientState).on('error', function(err) {
  console.log('background error: ' + err.message);
}).authorize(function(err, state, redirectURL) {
  if (!!err) return console.log('authorization failed: ' + err.message);

  if (!!state) {
    console.log('>>> please update clientState above to contain these parameters:');
    console.log(util.inspect(state, { depth: null }));
  }
  if (!!redirectURL) {
    console.log('redirect user to ' + redirectURL);
    console.log('upon success, enter the code from the browser as the oAuthVerifier parameter above');
    process.exit(0);
  }

  this.getDevices(function(err, devices) {
    var device, i, then;

    if (!!err) return console.log('getDevices failed: ' + err.message);

    var infocb = function(device) {
      return function(err, info) {
        if (!!err) return console.log('getDeviceInfo ' + device.uid + ' failed: ' + err.message);

        console.log('>>> device ' + device.name + ' (' + device.uid + ') info:');
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

        console.log('>>> device ' + device.name + ' (' + device.uid + ') history: ' + history.length + ' entries');
        for (i = 0; i < history.length; i++) {
          state = history[i];
          console.log('>>> history entry #' + i);
          console.log(util.inspect(state, { depth: null }));
        }
      };
    };

    then = new Date().getTime() - (6 * 60 * 1000);
    for (i = 0; i < devices.length; i++) {
      device = devices[i];
      console.log('>>> device #' + i);
      console.log(util.inspect(device, { depth: null }));

      this.getDeviceInfo(device.uid, infocb(device))
          .getDeviceState(device.uid, statecb(device))
          .getDeviceHistory(device.uid, then, undefined, historycb(device));
    }
  });
});
