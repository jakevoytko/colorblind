/**
 * Contains a node.js module with utility methods for dealing with urls.
 */


var encodeURIRegex = /!/g;
/**
 * Performs the same job as encodeURIComponent, and also escapes exclamation points.
 */
var customUriEncode = function(str: string): string {
  return encodeURIComponent(str).replace(encodeURIRegex, '%21');
};
exports.customUriEncode = customUriEncode;


/**
 * Takes a map of key/value pairs, and URI-encodes them.
 */
var uriEncodeParams = function(map: {[key: string]: string}): string {
  var fragments = Object.keys(map).map(function(cur) {
    return customUriEncode(cur) + '=' + customUriEncode(map[cur]);
  });
  fragments.sort();
  return fragments.join('&');
};
exports.uriEncodeParams = uriEncodeParams;
