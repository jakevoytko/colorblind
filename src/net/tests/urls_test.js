var assert = require('assert');
var urls = require('../urls.js');

describe('urls', function() {
  describe('customUriEncode()', function() {
    it('should be fine escaping nothing', function() {
      assert.equal('', urls.customUriEncode(''));
    });

    it('should escape a unicode snowman', function() {
      assert.equal('%E2%98%83', urls.customUriEncode('☃'));
    });

    it('should escape an exclamation mark', function() {
      assert.equal('%21', urls.customUriEncode('!'));
    });

    it('should escape a URL with an exclamation mark', function() {
      assert.equal('http%3A%2F%2Ftest.url%3Fparam%3Dvery%20yes%21',
                   urls.customUriEncode('http://test.url?param=very yes!'));
    });
  });

  describe('uriEncodeParams()', function() {
    it('should not choke on an empty map', function() {
      assert.equal('', urls.uriEncodeParams({}));
    });

    it('should return the string in param-sorted order', function() {
      assert.equal('a=a&b=b&c=c', urls.uriEncodeParams({c: 'c', b: 'b', a: 'a'}));
    });

    it('should uri-encode the keys and values', function() {
      assert.equal('%21=%E2%98%83', urls.uriEncodeParams({'!': '☃'}));
    });
  });
});