/**
 * Contains a node.js module with utility methods for dealing with responses.
 */

var http = require('http');


/**
 * Joins all of the chunks together for the given request. Assumes that the
 * request is going to 'end' at some point; this is not appropriate for use with
 * streams like hanging-GETs.
 */
var collectBuffer = function(
  result: http.IncomingMessage, callback: (data: Buffer) => void) {

  var data = [];
  result.on('data', function(chunk) {
    data.push(chunk);
  });
  result.on('end', function() {
    callback(Buffer.concat(data));
  });
};
exports.collectBuffer = collectBuffer;
