var assert = require('assert');
var colors = require('../colors.js');


/**
 * Asserts that the difference between a and b is <= delta.
 */
var assertNear = function(a, b, delta) {
  return assert(Math.abs(a - b) <= delta);
};


/** Creates an RGB round trip test for the given inputs. */
var createRgbRoundTripTest = function(r, g, b) {
  return function() {
    var rgb = new colors.Rgb(r, g, b);
    var newRgb = 
          colors.xyzToRgb(
            colors.xyyToXyz(
              colors.xyzToXyy(
                colors.rgbToXyz(rgb))));
    assertNear(rgb.R, newRgb.R, .01);
    assertNear(rgb.G, newRgb.G, .01);
    assertNear(rgb.B, newRgb.B, .01);
  };
};


describe('colors', function() {
  describe('Primary tests', function() {
    it('RGB->xyY for red primary should be correct', function() {
      // Testing from http://www.w3.org/Graphics/Color/srgb
      var rgb = new colors.Rgb(255, 0, 0);
      var xyy = colors.xyzToXyy(colors.rgbToXyz(rgb));
      assertNear(.64, xyy.x, .01);
      assertNear(.33, xyy.y, .01);
    });

    it('RGB->xyY for green primary should be correct', function() {
      // Testing from http://www.w3.org/Graphics/Color/srgb
      var rgb = new colors.Rgb(0, 255, 0);
      var xyy = colors.xyzToXyy(colors.rgbToXyz(rgb));
      assertNear(.30, xyy.x, .01);
      assertNear(.60, xyy.y, .01);
    });

    it('RGB->xyY for blue primary should be correct', function() {
      // Testing from http://www.w3.org/Graphics/Color/srgb
      var rgb = new colors.Rgb(0, 0, 255);
      var xyy = colors.xyzToXyy(colors.rgbToXyz(rgb));
      assertNear(.15, xyy.x, .01);
      assertNear(.06, xyy.y, .01);
    });
  });

  describe('round trip tests', function() {
    it('RGB->xyY should roundtrip for red primary', function() {
      var rgb = new colors.Rgb(255, 0, 0);
      var newRgb =
            colors.xyzToRgb(
              colors.xyyToXyz(
                colors.xyzToXyy(
                  colors.rgbToXyz(rgb))));
      assertNear(rgb.R, newRgb.R, .001);
      assertNear(rgb.G, newRgb.G, .001);
      assertNear(rgb.B, newRgb.B, .001);
    });

    for (var r = 0; r <= 255; r+=51) {
      for (var g = 0; g <= 255; g+=51) {
        for (var b = 0; b <= 255; b+=51) {
          it('RGB roundtrip test for [' + [r, g, b].join(',') + ']',
             createRgbRoundTripTest(r, g, b));
        }
      }
    }
  });
});
