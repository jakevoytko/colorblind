/**
 * Contains the definition of the necessary colorspaces for the protanope
 * calculations, coordinates of various colors in the colorspaces, as well as
 * some conversion functions.
 */

var assert = require('assert');


/**
 * An RGB color. 0 is the absence of color and 255 is the primary for this
 * particular channel. Unintuitively, the channels may be negative and greater
 * than 255, they just can't be displayed on monitors.
 */
class Rgb {
  R: number;
  G: number;
  B: number;

  constructor(R: number, G: number, B: number) {
    this.R = R;
    this.G = G;
    this.B = B;
  }
}
exports.Rgb = Rgb;


/**
 * An XYZ color. Y is luminance, and X and Z represent chromacity.
 */
class Xyz {
  X: number;
  Y: number;
  Z: number;

  constructor(X: number, Y: number, Z: number) {
    this.X = X;
    this.Y = Y;
    this.Z = Z;   
  }
}
exports.Xyz = Xyz;


/**
 * An xyY color. The xy plane represents chromaticity, and Y represents
 * luminance.
 */
class Xyy {
  x: number;
  y: number;
  Y: number;

  constructor(x: number, y: number, Y: number) {
    this.x = x;
    this.y = y;
    this.Y = Y;
  }
}
exports.Xyy = Xyy;


/** 
 * The D50 white point in the xyY color space. Y can be ignored here, since it's
 * only useful in terms of chromaticity.
 */
var XYY_WHITE_D50 = new Xyy(0.3457, 0.3585, 1);
exports.XYY_WHITE_D50 = XYY_WHITE_D50;


/**
 * Gamma-corrects a sRGB intensity. Taken from 
 * http://www.w3.org/Graphics/Color/srgb 
 */
var srgbToXyzGamma = function(intensity: number): number {
  assert(intensity >= 0);
  assert(intensity <= 1);

  if (intensity < 0.04045) {
    return intensity / 12.92;
  }

  var alpha = .055;
  return Math.pow((intensity + alpha) / (1 + alpha), 2.4);
};


/** 
 * Converts an RGB color into an equivalent color in the XYZ color space. RGB
 * uses D65 as white, and XYZ uses D50 as white, so it uses a Bradford chromatic
 * adaptation matrix gotten from
 * http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html.
 */
var rgbToXyz = function(rgb: Rgb): Xyz {
  var r = srgbToXyzGamma(rgb.R / 255);
  var g = srgbToXyzGamma(rgb.G / 255);
  var b = srgbToXyzGamma(rgb.B / 255);

  // The RGB-to-XYZ matrix with a Bradford-adapted D65->D50 adjustment.
  var X = r * 0.4360747 + g * 0.3850649 + b * 0.1430804;
  var Y = r * 0.2225045 + g * 0.7168786 + b * 0.0606169;
  var Z = r * 0.0139322 + g * 0.0971045 + b * 0.7141733;

  return new Xyz(X, Y, Z);
};
exports.rgbToXyz = rgbToXyz;


/** 
 * Gamma-corrects an RGB value that's been converted from XYZ
 * intensity. Inferred from http://www.w3.org/Graphics/Color/srgb
 */
var xyzToSrgbGamma = function(intensity: number): number {
  if (intensity <= 0.0031308) {
    return intensity * 12.92;
  }

  var alpha = .055;
  return (1 + alpha) * Math.pow(intensity, 1 / 2.4) - alpha;
};


/** Converts an XYZ color into an equivalent RGB color. */
var xyzToRgb = function(xyz: Xyz): Rgb {
  // The XYZ-to-RGB matrix with a Bradford-adapted D65->D50 adjustment.
  var newR = xyz.X * 3.1338561  + xyz.Y * -1.6168667 + xyz.Z * -0.4906146;
  var newG = xyz.X * -0.9787684 + xyz.Y * 1.9161415  + xyz.Z * 0.0334540;
  var newB = xyz.X * 0.0719453  + xyz.Y * -0.2289914 + xyz.Z * 1.4052427;

  var finalR = xyzToSrgbGamma(newR);
  var finalG = xyzToSrgbGamma(newG);
  var finalB = xyzToSrgbGamma(newB);

  return new Rgb(255 * finalR, 255 * finalG, 255 * finalB);
};
exports.xyzToRgb = xyzToRgb;


/** Converts an XYZ color into an equivalent xyY color. */
var xyzToXyy = function(xyz: Xyz): Xyy {
  var sum = xyz.X + xyz.Y + xyz.Z;
  var x = XYY_WHITE_D50.x;
  var y = XYY_WHITE_D50.y;
  if (sum != 0) {
    x = xyz.X / (xyz.X + xyz.Y + xyz.Z);
    y = xyz.Y / (xyz.X + xyz.Y + xyz.Z);
  }
  return new Xyy(x, y, xyz.Y);
};
exports.xyzToXyy = xyzToXyy;


/** Converts an xyY color into an equivalent color in the XYZ colorspace. */
var xyyToXyz = function(xyy: Xyy): Xyz {
  var X = 0;
  var Y = 0;
  var Z = 0;

  if (xyy.y != 0) {
    X = xyy.x * xyy.Y / xyy.y;
    Y = xyy.Y;
    Z = (1 - xyy.x - xyy.y) * xyy.Y / xyy.y;
  }
  return new Xyz(X, Y, Z);
};
exports.xyyToXyz = xyyToXyz;


/** The RGB red primary in xyY. */
var XYY_RED_PRIMARY = xyzToXyy(rgbToXyz(new Rgb(255, 0, 0)));
exports.XYY_RED_PRIMARY = XYY_RED_PRIMARY;


/** The RGB green primary in xyY. */
var XYY_GREEN_PRIMARY = xyzToXyy(rgbToXyz(new Rgb(0, 255, 0)));
exports.XYY_GREEN_PRIMARY = XYY_GREEN_PRIMARY;


/** The RGB blue primary in xyY. */
var XYY_BLUE_PRIMARY = xyzToXyy(rgbToXyz(new Rgb(0, 0, 255)));
exports.XYY_BLUE_PRIMARY = XYY_BLUE_PRIMARY;


/** The 470 wavelength in xyY. Taken from CIE publication 15. */
var XYY_470 = new Xyy(0.12412, 0.05780, 0.090980);
exports.XYY_470 = XYY_470;


/** The 575 wavelength in xyY. Taken from CIE publication 15. */
var XYY_575 = new Xyy(0.47877, 0.52020, 0.915400);
exports.XYY_575 = XYY_575;
