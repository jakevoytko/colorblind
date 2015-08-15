/**
 * Contains a node.js module defining helpers for dealing with the Twitter web
 * API.
 */

var crypto = require('crypto');
var http = require('http');
var https = require('https');
var oauth = require('../auth/oauth.js');
var requests = require('../net/requests.js');
var responses = require('../net/responses.js');
var urls = require('../net/urls.js');


// Matches numbers at the beginning of the input.
var NUMBER_REGEX = /^\s*([0-9]+)/g;
/**
 * A hanging GET to the Twitter API may contain length-delimited chunks. IE the
 * data will be prepended with an ASCII representation of the length of bytes to
 * be read. This reads the byte string, as well as all of the bytes from the
 * stream, and passes completed request buffers to the given callback.
 */
class DelimitedChunkAggregator {
  lengthToRead: number;
  chunkData: Array<Buffer>;
  lengthRead: number;
  callback: (x: Buffer) => void;

  constructor(callback: (x: Buffer) => void) {
    this.lengthToRead = -1;
    this.chunkData = [];
    this.lengthRead = 0;
    this.callback = callback;
  }
  
  add(chunk: Buffer) {
    var chunkString = chunk.toString('binary');

    // Bootstrap case.
    if (this.lengthToRead < 0) {
      // Empty lines may be sent between requests for keepalive.
      if (chunkString.trim().length == 0) {
        return;
      }
      var matches = NUMBER_REGEX.exec(chunkString);
      if (!matches || matches.length < 2) {
        console.error('Received chunk with no length information', chunkString);
        return;
      }
      
      var lengthToRead = parseInt(matches[1]);
      if (isNaN(lengthToRead) || lengthToRead <= 0) {
        console.error('Received chunk with unusable length', chunkString);
        return;
      }
      this.lengthToRead = lengthToRead;
      chunkString = chunkString.substr(matches[0].length);
      chunk = new Buffer(chunkString, 'binary');
    }

    this.chunkData.push(chunk);
    this.lengthRead += Buffer.byteLength(chunkString, 'binary');

    if (this.lengthToRead > this.lengthRead) {
      return;
    }

    // A complete chunk has been found! Pass to callback, and if there's
    // anything left, start over.
    var finalBuffer = Buffer.concat(this.chunkData);
    var remainder = null;

    if (this.lengthToRead < this.lengthRead) {
      finalBuffer = finalBuffer.slice(0, this.lengthToRead);
      remainder = finalBuffer.slice(this.lengthToRead);
    }

    this.callback(finalBuffer);

    this.lengthToRead = -1;
    this.chunkData = [];
    this.lengthRead = 0;
    
    // If there is a remainder, recurse to start all over.
    if (remainder) {
      this.add(remainder);
    }
  }
}
exports.DelimitedChunkAggregator = DelimitedChunkAggregator;


/**
 * Sends a request that opens a persistent connection to the Twitter API. A
 * shortcut for https.request.
 */
var openUserStream = function(
  keyData: oauth.KeyData, 
  callback: (response: http.IncomingMessage) => void): http.ClientRequest {
  var method = 'GET';
  var server = 'userstream.twitter.com';
  var path = '/1.1/user.json';

  var args = {delimited: 'length'};
  var url = 'https://' + server + path;
  var authHeader = new oauth.HeaderBuilder('GET', url, keyData).
        setRequestParams(args).
        build();
  var requestHeaders = {
    'User-Agent': 'JakeWouldSee 0.1',
    Authorization: authHeader
  };

  var requestOptions = {
    headers: requestHeaders,
    hostname: server,
    port: 443,
    path: path + '?delimited=length',
    method: 'GET'
  };

  // $FlowIssue: https module is not defined.
  return https.request(requestOptions, callback);
};
exports.openUserStream = openUserStream;


/** 
 * Uploads the given image on behalf of the user represented in the key data.
 */
var uploadImage = function(
  imageBuffer: Buffer, 
  oauthKeyData: oauth.KeyData, 
  callback: (mediaIdString: string) => void) {
  var server = 'upload.twitter.com';
  var path = '/1.1/media/upload.json';
  var url = 'https://' + server + path;
  var method = 'POST';
  var randomBytes = crypto.randomBytes(64);
  if (!randomBytes) {
    throw Error('Insufficient random bytes for image upload boundary.');
  }
  var boundary = 'JAKEWOULDSEEBOUNDARY' + randomBytes.toString('hex');

  var requestBody = requests.makeRequestBody(
    server, 
    path, 
    boundary,
    'media_data' /* name */, 
    'a.jpg' /* filename */, 
    imageBuffer);
  var authHeader = new oauth.HeaderBuilder(method, url, oauthKeyData).
        setRequestBody(requestBody).
        build();

  var requestHeaders = {
    'User-Agent': 'JakeWouldSee 0.1',
    'Content-Type': 'multipart/form-data, boundary="' + boundary + '"',
    'Content-Length': requestBody.length,
    'Authorization': authHeader
  };

  var options = {
    headers: requestHeaders,
    hostname: server,
    port: 443,
    path: path,
    method: method
  };

  // $FlowIssue: https module has no externs.
  var request = https.request(options, function(response) {
    if (response.statusCode != 200) {
      console.error('Error on upload request.');
      responses.collectBuffer(response, function(data) {
        console.error('Upload error response body: ', data.toString('utf8'));
      });
      return;
    }

    responses.collectBuffer(response, function(buffer) {
      var response = JSON.parse(buffer.toString('utf8'));
      callback(response.media_id_string);
    });
  });

  request.on('error', function(e) {
    console.error('Error with tweet request: ' + e.message);
  });

  request.write(requestBody);
  request.end();
};
exports.uploadImage = uploadImage;


/** 
 * Sends an tweet with the given message, referencing the given media id. Is
 * done on behalf of the user with the token given in the key data.
 */
var sendTweetReplyWithMedia = function(
  message: string, 
  keyData: oauth.KeyData, 
  tweetId: string, 
  mediaId: string, 
  callback: (response: http.IncomingMessage) => void) {

  var method = 'POST';
  var server = 'api.twitter.com';
  var path = '/1.1/statuses/update.json';
  var url = 'https://' + server + path;

  var postBodyParams = {
    status: message,
    media_ids: mediaId,
    in_reply_to_status_id: tweetId
  };

  var authHeader = new oauth.HeaderBuilder(method, url, keyData).
        setRequestParams(postBodyParams).
        build();
  var postData = urls.uriEncodeParams(postBodyParams);
  var requestHeaders = {
    'User-Agent': 'JakeWouldSee 0.1',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.length,
    Authorization: authHeader
  };

  var requestOptions = {
    headers: requestHeaders,
    hostname: server,
    port: 443,
    path: path,
    method: method
  };

  // $FlowIssue: https module has no externs.
  var request = https.request(requestOptions, callback);
  request.write(postData);
  return request;
};
exports.sendTweetReplyWithMedia = sendTweetReplyWithMedia;
