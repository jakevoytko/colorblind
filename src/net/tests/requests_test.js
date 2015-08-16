var assert = require('assert');
var requests = require('../requests.js');

describe('requests', function() {
  describe('makeRequestBody()', function() {
    it('should throw when the filename contains quotes', function() {
      assert.throws(function() {
        callMakeRequestBody('media', '"filename.txt"');
      });
    });

    it('should throw when the param name contains quotes', function() {
      assert.throws(function() {
        callMakeRequestBody('"media"', 'filename.txt');
      });
    });

    it('check a regular request body', function() {
      var expected = '--bound-ree\r\n'
            + 'Content-Disposition: form-data; '
            + 'name="media"; '
            + 'filename="filename.txt"\r\n'
            + 'Content-Type: application/octet-stream\r\n'
            + 'Content-Transfer-Encoding: base64\r\n'
            + '\r\nVGhpcyBpcyBzb21lIHVwbG9hZGVkIGRhdGEu\r\n--bound-ree--\r\n';

      assert.equal(expected, callMakeRequestBody('media', 'filename.txt'));
    });

    it('should throw when the request body contains the boundary', function() {
      assert.throws(function() {
        return requests.makeRequestBody(
          'api.api.api',
          '/api/upload.json',
          new Buffer('bound-ree').toString('base64'),
          'media',
          'filename.txt',
          new Buffer('bound-ree'));
      });
    });
  });
});


/** Helper for making request bodies. */
var callMakeRequestBody = function(name, filename) {
  return requests.makeRequestBody(
    'api.api.api', 
    '/api/upload.json', 
    'bound-ree', 
    name,
    filename,
    new Buffer('This is some uploaded data.'));
};
