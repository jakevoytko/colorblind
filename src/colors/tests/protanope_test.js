var assert = require('assert');
var colors = require('../colors.js');
var protanope = require('../protanope.js');


/** Checks that the delta between original and test is less than epsilon. */
var assertNear = function(original, test, epsilon) {
  assert(Math.abs(original - test) <= epsilon);
};


describe('protanope', function() {
  describe('protanope.convertToProtanope', function() {
    it('white should roundtrip perfectly', function() {
      var white = new colors.Rgb(255, 255, 255);
      var value = protanope.convertToProtanope(white);
      assert.deepEqual(white, value);
    });

    it('black should roundtrip perfectly', function() {
      var black = new colors.Rgb(0, 0, 0);
      var value = protanope.convertToProtanope(black);
      assert.deepEqual(black, value);
    });

    it('check a point that forms a flat confusion line', function() {
      // The line has no slope from the confusion point so the math is simpler.
      var rgb = colors.xyzToRgb(colors.xyyToXyz(new colors.Xyy(.3, .253, 0.5)));

      // Blue falls outside the bounds in this color.
      assert(rgb.B > 255);
      var clippedRgb = new colors.Rgb(rgb.R, rgb.G, 255);
      var value = protanope.convertToProtanope(clippedRgb);

      // Calculated with some graphing calculator magic.
      var expected = new colors.Rgb(165, 182, 255);

      // Check that the RGB channels are within the margin of error of rounding.
      assertNear(value.R, expected.R, 0.5);
      assertNear(value.G, expected.G, 0.5);
      assertNear(value.B, expected.B, 0.5);
    });
  });
});
