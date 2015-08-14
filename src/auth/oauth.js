/**
 * Contains a node.js module for signing requests with OAuth.
 */

var assert = require('assert');
var crypto = require('crypto');
var urls = require('../net/urls.js');


/** 
 * A dumb data object for storing oauth key data. The token information may not
 * be available if the user is not yet authenticated.
 */
class KeyData {
  consumerKey: string;
  consumerSecret: string;
  token: ?string;
  tokenSecret: ?string;

  constructor(
    consumerKey: string, 
    consumerSecret: string, 
    token: ?string, 
    tokenSecret: ?string) {
    
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.token = token;
    this.tokenSecret = tokenSecret;
  }
}
exports.KeyData = KeyData;


/**
 * Collects all of the key-value pairings in map, uri-encodes them, and then
 * joins the pairs together with the given string.
 */
var encodeKeyValueFragments = function(
  map: { [key: string]: string }, join: string): string {

  var fragments = Object.keys(map).map(function(cur) {
    return urls.customUriEncode(cur) + '="' + urls.customUriEncode(map[cur]) + '"';
  });
  fragments.sort();
  return fragments.join(join);
};


/** Shallow copies the two objects together, throwing if there is a key conflict. */
var mergeObjectsWithoutConflict = function(
  objectA: { [key: string]: any }, objectB: { [key: string]: any }) {
  
  var resultingObject = {};
  for (var key in objectA) {
    resultingObject[key] = objectA[key];
  }

  for (var key in objectB) {
    if (key in resultingObject) {
      throw Error('conflict on key ' + key);
    }
    resultingObject[key] = objectB[key];
  }
  return resultingObject;
};


var nonceRegex = /\w+/g;
/**
 * Generates a nonce appropriate for sending to Twitter. Their example generates
 * random base64 encoded data and stripping out all non-word characters, so who
 * are we to object?
 */
var generateNonce = function(): string {
  // Uses pseudorandom since this only needs unpredictability, not
  // cryptographically strong numbers.
  // $FlowIssue: pseudoRandomBytes requires callback in Flow externs.
  var nonceBytes = crypto.pseudoRandomBytes(32);
  var nonceString = nonceBytes.toString('base64');
  var strippedNonceString = nonceString.match(nonceRegex).join('');

  // Chosen so that there's enough data remaining that it's unlikely there's a
  // collision.
  assert(strippedNonceString.length >= 8);
  return strippedNonceString;
};


var oauthSign = function(
  method: string, 
  baseUrl: string, 
  keyData: KeyData, 
  allParams: {[key: string]: string}): string {
  
  var percentEncodedKeys = [];
  var percentEncodedParams = {};

  for (var key in allParams) {
    var percentEncodedKey = urls.customUriEncode(key);
    var percentEncodedValue = urls.customUriEncode(allParams[key]);
    percentEncodedKeys.push(percentEncodedKey);
    percentEncodedParams[percentEncodedKey] = percentEncodedValue;
  }

  percentEncodedKeys.sort();

  var parameterStrings = [];

  percentEncodedKeys.forEach(function(value) {
    parameterStrings.push(value + '=' + percentEncodedParams[value]);
  });

  var parameterString = parameterStrings.join('&');

  var baseString = method.toUpperCase() + '&' + urls.customUriEncode(baseUrl) + '&'
      + urls.customUriEncode(parameterString);

  // If the token secret is missing, the & is kept but the token secret is left off.
  var signingKey = urls.customUriEncode(keyData.consumerSecret) + '&' +
        (keyData.tokenSecret ? urls.customUriEncode(keyData.tokenSecret) : '');

  var hmac = crypto.createHmac('sha1', signingKey);
  hmac.update(baseString);
  var digest = hmac.digest().toString('base64');
  return digest;
};


/**
 * A class that collects the various bits of information necessary to form a
 * valid OAuth Authorization header. Calling build() returns a string that can
 * be used to sign the request with the given information. 
 * 
 * build() may be called multiple times, and calling it different times with the
 * same information in the builder will return 
 */
class HeaderBuilder {
  method: string;
  url: string;
  keyData: KeyData;
  requestParams: ?{[key: string]: string};
  requestBody: ?string;
  callback: ?string;

  constructor(method: string, url: string, keyData: KeyData) {
    this.method = method;
    this.url = url;
    this.keyData = keyData;
  }

  setRequestParams(requestParams: {[key: string]: string}): HeaderBuilder {
    this.requestParams = requestParams;
    return this;
  }

  setRequestBody(requestBody: string): HeaderBuilder {
    this.requestBody = requestBody;
    return this;
  }

  setCallback(callback: string): HeaderBuilder {
    this.callback = callback;
    return this;
  }

  build(timestamp: ?number, nonce: ?string): string {
    var timestamp = timestamp ? timestamp : (Date.now() / 1000);
    assert(timestamp > 0, 'Timestamp must be positive');
    var headerTimestamp = Math.round(timestamp).toString();
    var headerNonce = nonce ? nonce : generateNonce();
    
    var oauthHeaders = {};
    if (this.keyData.token) {
      oauthHeaders['oauth_token'] = this.keyData.token;
    }
    oauthHeaders['oauth_consumer_key'] = this.keyData.consumerKey;
    oauthHeaders['oauth_nonce'] = headerNonce;
    oauthHeaders['oauth_signature_method'] = 'HMAC-SHA1';
    oauthHeaders['oauth_timestamp'] = headerTimestamp;
    oauthHeaders['oauth_version'] = '1.0';

    if (this.requestBody) {
      var shaHash = crypto.createHash('sha1');
      shaHash.update(this.requestBody);
      oauthHeaders['oauth_body_hash'] = shaHash.digest('hex');
    }

    if (this.callback) {
      oauthHeaders['oauth_callback'] = this.callback;
    }

    var allHeaders = this.requestParams ? 
          mergeObjectsWithoutConflict(oauthHeaders, this.requestParams) :
          oauthHeaders;

    oauthHeaders['oauth_signature'] = oauthSign(
      this.method, this.url, this.keyData, allHeaders);

    return 'OAuth ' + encodeKeyValueFragments(oauthHeaders, ', ');
  }
}
exports.HeaderBuilder = HeaderBuilder;
