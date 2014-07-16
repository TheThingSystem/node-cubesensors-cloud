// a node.js module to interface with the CubeSensors cloud API
//   cf., https://my.cubesensors.com/docs

var events      = require('events')
  , oauth       = require('oauth')
  , querystring = require('querystring')
  , util        = require('util')
  ;


var DEFAULT_LOGGER = { error   : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , warning : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , notice  : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , info    : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , debug   : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     };


var CubeSensorsAPI = function(state) {
  var k;

  var self = this;

  if (!(self instanceof CubeSensorsAPI)) return new CubeSensorsAPI(state);

  self.state = state;
  if ((!self.state.consumerKey) || (!self.state.consumerSecret)) throw new Error('consumerKey and consumerSecret required');
  if (!self.state.baseURL) self.state.baseURL = 'http://api.cubesensors.com';

  self.logger = self.state.logger  || {};
  for (k in DEFAULT_LOGGER) {
    if ((DEFAULT_LOGGER.hasOwnProperty(k)) && (typeof self.logger[k] === 'undefined'))  self.logger[k] = DEFAULT_LOGGER[k];
  }

  self.oauth = new oauth.OAuth(self.state.baseURL + '/auth/request_token', self.state.baseURL + '/auth/access_token',
                               self.state.consumerKey, self.state.consumerSecret, '1.0', 'oob', 'HMAC-SHA1');
};
util.inherits(CubeSensorsAPI, events.EventEmitter);


CubeSensorsAPI.prototype.authorize = function(callback) {
  var self = this;

  if (typeof callback !== 'function') throw new Error('callback is mandatory for authorize');

  var getAccessToken = function() {
    self.oauth.getOAuthAccessToken(function(err, oAuthAccessToken, oAuthAccessTokenSecret, results) {
      if (!!err) return callback(err);
console.log('>>> getOAuthAccessToken'); console.log(util.inspect(results, { depth: null }));

      self.state.oAuthAccessToken = oAuthAccessToken;
      self.state.oauthAccessSecret = oAuthAccessTokenSecret;

      callback(null, self.state);
    });

    return self;
  };

  if ((!!self.state.oAuthToken) && (!!self.state.oAuthTokenSecret)) return getAccessToken();

  self.oauth.getOAuthRequestToken(function(err, oAuthToken, oAuthTokenSecret, results) {
    if (!!err) return callback(err);
console.log('>>> getOAuthRequestToken'); console.log(util.inspect(results, { depth: null }));

    self.state.oAuthToken = oAuthToken;
    self.state.oAuthTokenSecret = oAuthTokenSecret;

    getAccessToken();
  });

  return self;
};


CubeSensorsAPI.prototype.getDevices = function(callback) {
  return this.roundtrip('GET', 'devices/', null, function(err, data) {
    var devices, i;

    if (!!err) return callback(err);
    if (!data) return callback(new Error('no data'));
    if (!util.isArray(data.devices)) return callback(new Error('no devices'));

    devices = [];
    for (i = 0; i < data.devices.length; i++) devices.push(normalizeInfo(data.devices[i]));
    callback(null, devices);
  });
};

CubeSensorsAPI.prototype.getDeviceInfo = function(deviceID, callback) {
  return this.roundtrip('GET', 'devices/', null, function(err, data) {
    if (!!err) return callback(err);
    if (!data) return callback(new Error('no data'));
    if (!data.device) return callback(new Error('no such device: ' + deviceID));

    callback(null, normalizeInfo(data.device));
  });
};

var normalizeInfo = function(device) {
  var prop;

  for (prop in device.extra) if ((device.extra.hasOwnProperty(prop)) && (!!device[prop])) device[prop] = device.extra[prop];

  return device;
};

CubeSensorsAPI.prototype.getDeviceState = function(deviceID, callback) {
  return this.roundtrip('GET', 'devices/' + deviceID + '/current', null, function(err, data) {
    if (!!err) return callback(err);
    if (!data) return callback(new Error('no data'));
    if (!util.isArray(data.results)) return callback(new Error('no results'));
    if (data.results.length < 1) return callback(null, null);
    if (!util.isArray(data.field_list)) return callback(new Error('no decoder ring (aka field_list)'));

    return normalizeState(data.field_list, data.results[0]);
  });
};

CubeSensorsAPI.prototype.getDeviceHistory = function(deviceID, starting, ending, callback) {
  var params;

  if (!callback) {
    if (typeof ending === 'function') {
      callback = ending;
      ending = null;
    } else if (typeof starting === 'function') {
      callback = starting;
      starting = null;
    }
  }

// http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
  var toType = function(obj) { return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase(); };

  var param2iso = function(param, value) {
    if (toType(value) !== 'date') {
      if (typeof value === 'string') value = parseInt(value, 10);
      if (isNaN(value)) throw new Error(param + ': not a number');
      value = new Date(value);
    }
    value.setMillseconds(0);

    return value.toISOString(value);
  };

  params = {};
  if (!!starting) params.start = param2iso('starting', starting);
  if (!!ending)   params.end   = param2iso('ending',   starting);
  params = ((!!params.start) || (!!params.end)) ? ('?' + querystring.stringify(params)) : '';

  return this.roundtrip('GET', 'devices/' + deviceID + '/history' + params, null, function(err, data) {
    var history, i;

    if (!!err) return callback(err);
    if (!data) return callback(new Error('no data'));
    if (!util.isArray(data.results)) return callback(new Error('no results'));
    if (data.results.length < 1) return callback(null, null);
    if (!util.isArray(data.field_list)) return callback(new Error('no decoder ring (aka field_list)'));

    history = [];
    for (i = 0; i < data.results.length; i++) history.push(normalizeState(data.field_list, data.results[i]));
    history.sort(function(a, b) { return a.timestamp - b.timestamp; });

    return callback(null, history);
  });
};

var normalizeState = function(fields, state) {
  var i, prop, result, value;

  result = {};

  i = fields.length;
  if (i > state.length) i = state.length;
  for (; i >= 0; i--) {
    prop = fields[i];
    prop = { time: 'lastSample', temp: 'temperature', battery: 'batteryLevel' }[prop] || prop;

    value = state[i];
    if (prop === 'lastSample') {
      value = new Date(state[i]).getTime();
      if (isNaN(value)) value = state[i];
    }

    result[prop] = value;
  }

  return result;
};


CubeSensorsAPI.prototype.roundtrip = function(method, path, json, callback) {
  var self = this;

  if ((!callback) && (typeof json === 'function')) {
    callback = json;
    json = null;
  }

  return self.invoke(method, path, json, function(err, code, data) {
    if (!!err) return callback(err);

    if ((!data.ok) && (util.isArray(data.errors)) && (data.errors.length > 0)) return callback(new Error(data.errors[0]));

    callback(null, data);
  });
};

CubeSensorsAPI.prototype.invoke = function(method, path, json, callback) {
  var self = this;

  if ((!callback) && (typeof json === 'function')) {
    callback = json;
    json = null;
  }
  if (!callback) {
    callback = function(err, data) {
      if (!!err) self.logger.error('invoke', { exception: err }); else self.logger.info(path, { data: data });
    };
  }
  if ((!self.state.oAuthAccessToken) || (!self.state.oAuthAccessTokenSecret)) {
    return callback(new Error('you must call authorize before roundtrip/invoke', 400));
  }

  if ((method !== 'GET') || (!!json)) {
    return callback(new Error('GET-without-payload supported only by CubeSensors API'), 405);
  }

console.log('>>> invoke ' + self.state.baseURL + '/v1/' + path);

  self.oauth2._request(method, self.state.baseURL + '/v1/' + path, 'GET', self.state.oAuthAccessToken,
                       self.state.oAuthAccessTokenSecret, function(oops, body, response) {
console.log('<<< ' + (response && response.statusCode) + 'oops='+util.inspect(oops, { depth: null })+ ' body='+body);
      var expected = { GET    : [ 200 ]
                     , PUT    : [ 200 ]
                     , POST   : [ 200, 201, 202 ]
                     , DELETE : [ 200 ]
                     }[method];

      var data = {};

      if (!!oops) return callback(new Error(oops.data), oops.statusCode);

      try { data = JSON.parse(body); } catch(ex) {
        self.logger.error(path, { event: 'json', diagnostic: ex.message, body: body });
        return callback(ex, response.statusCode);
      }

      if (expected.indexOf(response.statusCode) === -1) {
         self.logger.error(path, { event: 'http', code: response.statusCode, body: body });
         return callback(new Error('HTTP response ' + response.statusCode), response.statusCode, data);
      }

      callback(null, response.statusCode, data);

  });

  return self;
};


exports.CubeSensorsAPI = CubeSensorsAPI;
