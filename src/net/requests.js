/**
 * A node.js module containing utilities for forming requests.
 */

var assert = require('assert');


var quoteRegex = /"/g;
/** Makes a single-part request body. */
var makeRequestBody = function(
  server: string, 
  path: string, 
  boundary: string, 
  name: string, 
  filename: string, 
  buffer: Buffer): string {

  // Force the caller to encode these.
  assert(!name.match(quoteRegex));
  assert(!filename.match(quoteRegex));

  var requestBody = '--' +
        boundary +
        '\r\n' +
        'Content-Disposition: ' +
        'form-data; name="' +
        name +
        '"; ' +
        'filename="' +
        filename +
        '"\r\nContent-Type: application/octet-stream\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        buffer.toString('base64') +
        '\r\n--' +
        boundary +
        '--\r\n';

  // The boundary should appear exactly twice.

  assert.equal(2, requestBody.indexOf(boundary));
  // The length, minus 4 for the suffix, minus the boundary length.
  var expectedNextIndex = requestBody.length - 4 - boundary.length;
  assert.equal(expectedNextIndex, requestBody.indexOf(boundary, 3));

  return requestBody;
};
exports.makeRequestBody = makeRequestBody;
