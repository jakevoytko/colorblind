/**
 * Contains a node.js module with logic that is unrelated to gluing the
 * processing pipeline together.
 */

var colors = require('./colors/colors.js');
var protanope = require('./colors/protanope.js');
// $FlowFixMe: LWIP externs not defined.
var lwip = require('lwip');


/** Checks whether a.endsWith(b); for strings. */
function endsWith(a: string, b: string) {
  return a.indexOf(b, a.length - b.length) != -1;
}


var supportedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
/** Checks whether the given URL is a supported image type. */
var urlHasSupportedImageType = function(url: string): boolean {
  var lowerCaseUrl = url.toLowerCase();
  for (var i = 0; i < supportedTypes.length; i++) {
    if (endsWith(lowerCaseUrl, supportedTypes[i])) {
      return true;
    }
  }
  return false;
};
exports.urlHasSupportedImageType = urlHasSupportedImageType;


/**
 * Converts the given image into the protan version using colors/protanope.js.
 */
var createProtanImage = function(
  image: lwip.Image, callback: (image: lwip.Image) => void): void {

  var batch = image.batch();
  var cols = image.width();
  var rows = image.height();

  for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
      var pixel = image.getPixel(col, row);
      var rgb = new colors.Rgb(pixel.r, pixel.g, pixel.b);
      var protanRgb = protanope.convertToProtanope(rgb);
      batch.setPixel(col, row, {
        r: protanRgb.R, g: protanRgb.G, b: protanRgb.B, a: pixel.a
      });
    }
  }

  batch.exec(function(err: ?Error, image: lwip.Image) {
    if (err) {
      console.error('error batch processing image, ', err);
      return;
    }
    callback(image);
  });
};
exports.createProtanImage = createProtanImage;
