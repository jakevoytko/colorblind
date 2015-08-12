var assert = require('assert');
var json = require('../json.js');

describe('json', function() {
  describe('isTweet()', function() {
    it('should not choke on an empty object', function() {
      assert.ok(!json.isTweet({}));
    });

    it('should return false for an empty id string', function() {
      assert.ok(!json.isTweet({id_str: ''}));
    });

    it('should return true for a present id string', function() {
      assert.ok(json.isTweet({id_str: '8675309'}));
    });
  });

  describe('getTweetId()', function() {
    it('should return null for an empty object', function() {
      assert.equal(null, json.getTweetId({}));
    });

    it('should return null for an empty id string', function() {
      assert.equal(null, json.getTweetId({id_str: ''}));
    });

    it('should return true for a present id string', function() {
      assert.equal('8675309', json.getTweetId({id_str: '8675309'}));
    });
  });

  describe('getTweetScreenName()', function() {
    it('should return null for an empty object', function() {
      assert.equal(null, json.getTweetScreenName({}));
    });

    it('should return null for a user object with no name', function() {
      assert.equal(null, json.getTweetScreenName({user: {}}));
    });

    it('should return null for a user object with an empty name', function() {
      assert.equal(null, json.getTweetScreenName({user: {screen_name: ''}}));
    });

    it('should return the name if it is there', function() {
      assert.equal('b', json.getTweetScreenName({user: {screen_name: 'b'}}));
    });
  });

  describe('getTweetPhotoUrls()', function() {
    it('should return [] for an empty object', function() {
      assert.deepEqual([], json.getTweetPhotoUrls({}));
    });

    it('should return [] if media is missing', function() {
      assert.deepEqual([], json.getTweetPhotoUrls({extended_entities: {}}));
    });

    it('should return [] if media is empty', function() {
      assert.deepEqual(
        [], json.getTweetPhotoUrls({extended_entities: {media: []}}));
    });

    it('should return [] if media has a non-photo', function() {
      assert.deepEqual(
        [], json.getTweetPhotoUrls({
          extended_entities: {
            media: [
              {
                type: 'foo', 
                media_url_https: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
              }
            ]
          }
        }));
    });

    it('should return the photo id if present', function() {
      assert.deepEqual(
        ['https://example.com/photo.jpg'], json.getTweetPhotoUrls({
          extended_entities: {
            media: [
              {
                type: 'photo', 
                media_url_https: 'https://example.com/photo.jpg'
              }
            ]
          }
        }));
    });

    it('should return multiple photo ids if present', function() {
      assert.deepEqual(
        ['https://example.com/photo.jpg', 'https://example.com/photo2.jpg'], 
        json.getTweetPhotoUrls({
          extended_entities: {
            media: [
              {
                type: 'photo', 
                media_url_https: 'https://example.com/photo.jpg'
              },
              {
                type: 'photo', 
                media_url_https: 'https://example.com/photo2.jpg'
              }
            ]
          }
        }));
    });
  });
});