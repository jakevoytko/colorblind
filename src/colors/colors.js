/**
 * Contains the definition of the necessary colorspaces for the protanope
 * calculations, coordinates of various colors in the colorspaces, as well as
 * some conversion functions.
 */

/**
 * An RGB color. 0 is the absence of color and 255 is the primary for this
 * particular channel. Unintuitively, the channels may be negative and greater
 * than 255, they just can't be displayed on monitors.
 * TODO(jake): Make separate classes for display sRGB (0-255) and sRGB (0-1).
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
 * The white point in the xyY color space. Y can be ignored here, since it's
 * only defined in terms of chromaticity. Calculated converting from RGB
 * white. Defined explicitly to avoid circular dependency in definitions.
 */
var XYY_WHITE_D65 = new Xyy(0.31273126898108394, 0.3290328736744088, 1);
exports.XYY_WHITE_D65 = XYY_WHITE_D65;


/** 
 * Converts an RGB color into an equivalent color in the XYZ color space. 
 * TODO(jake): Gamma correct.
 */
var rgbToXyz = function(rgb: Rgb): Xyz {
  var r = rgb.R / 255;
  var g = rgb.G / 255;
  var b = rgb.B / 255;

  var X = r * 0.412453 + g * 0.357580 + b * 0.180423;
  var Y = r * 0.212671 + g * 0.715160 + b * 0.072169;
  var Z = r * 0.019334 + g * 0.119193 + b * 0.950227;

  return new Xyz(X, Y, Z);
};
exports.rgbToXyz = rgbToXyz;


/** Converts an XYZ color into an equivalent RGB color. */
var xyzToRgb = function(xyz: Xyz): Rgb {
  var newR = xyz.X * 3.240479 - xyz.Y * 1.537150 - xyz.Z * 0.498535;
  var newG = xyz.X * -0.969256 + xyz.Y * 1.875992 + xyz.Z * 0.041556;
  var newB = xyz.X * 0.055648 - xyz.Y * 0.204043 + xyz.Z * 1.057311;

  return new Rgb(255 * newR, 255 * newG, 255 * newB);
};
exports.xyzToRgb = xyzToRgb;


/** Converts an XYZ color into an equivalent xyY color. */
var xyzToXyy = function(xyz: Xyz): Xyy {
  var sum = xyz.X + xyz.Y + xyz.Z;
  var x = XYY_WHITE_D65.x;
  var y = XYY_WHITE_D65.y;
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
