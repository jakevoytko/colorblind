/**
 * Contains a node.js module with utilities for handling Twitter-specific JSON
 * response objects.
 */

var assert = require('assert');
var twitter = require('./twitter.js');
var util = require('util');


/** 
 * Returns whether this is a Tweet. The dev documentation doesn't state anything
 * about what fields can be used to infer the presence of Tweets, so this just
 * assumes that anything with a top-level ID field is fine.
 */
var isTweet = function(obj: Object): bool {
  return 'id_str' in obj && !!obj.id_str && (typeof obj.id_str == 'string');
};
exports.isTweet = isTweet;


/**
 * Returns the tweet ID as a string, or null if none is present.
 */
var getTweetId = function(obj: Object): ?string {
  return isTweet(obj) ? obj.id_str : null;
};
exports.getTweetId = getTweetId;


/**
 * Extracts the Twitter screen name from the given Tweet, returning null if not
 * present.
 */
var getTweetScreenName = function(obj: Object): ?string {
  if (!('user' in obj) || !(obj.user instanceof Object)) {
    return null;
  }

  if (!obj.user.screen_name || (typeof obj.user.screen_name != "string")) {
    return null;
  }
  return obj.user.screen_name || null;
};
exports.getTweetScreenName = getTweetScreenName;


/**
 * Gets all of the photo URLs from the given Tweet. Always returns an array,
 * which will be empty if there are no matches. Accordingly there is no way to
 * differentiate between a present empty array and the absence of these URLs.
 */
var getTweetPhotoUrls = function(obj: Object): Array<string> {
  var extendedEntities = obj.extended_entities;
  if (!extendedEntities) {
    return [];
  }

  var urls = [];
  var media = extendedEntities.media || [];
  assert(media instanceof Array);
  media.forEach(function(currentValue) {
    if (currentValue.type == 'photo' && !!currentValue.media_url_https &&
        (typeof currentValue.media_url_https == "string")) {
      urls.push(currentValue.media_url_https);
    }
  });
  return urls;
};
exports.getTweetPhotoUrls = getTweetPhotoUrls;
