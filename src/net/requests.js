/**
 * A node.js module containing utilities for forming requests.
 */

var assert = require('assert');


var quoteRegex = /"/g;
/** 
 * Makes a single-part request body.
 * TODO(jake): Validate the boundary, check that it doesn't occur elsewhere in 
 * the request.
 */
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

  return '--' 
        + boundary 
        + '\r\n' 
        + 'Content-Disposition: '
        + 'form-data; name="' + name + '"; '
        + 'filename="' + filename + '"\r\n'
        + 'Content-Type: application/octet-stream\r\n'
        + 'Content-Transfer-Encoding: base64\r\n'
        + '\r\n'
        + buffer.toString('base64')
        + '\r\n--'
        + boundary
        + '--\r\n';
};
exports.makeRequestBody = makeRequestBody;
