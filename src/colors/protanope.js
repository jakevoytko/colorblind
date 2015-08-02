/**
 * Contains convertToProtanope, which converts an RGB color into an estimation
 * of the version that a protanope would see.
 */

var assert = require('assert');
var colors = require('./colors.js');


/** The protanope confusion point in the xyY spectrum. */
var xyyConfusionPoint = new colors.Xyy(0.747, 0.253, 1.0);


/** Stores the coefficients of a quadratic polynomial. */
var QuadraticPolynomial = function(xSquare: number, x: number, c: number) {
  this.xSquare = xSquare;
  this.x = x;
  this.c = c;
};


/** Calculates a step of the LaGrange interpolation method. */
var lagrangeStepXyy = function(
  xyy0: colors.Xyy, xyy1: colors.Xyy, xyy2: colors.Xyy): QuadraticPolynomial {
  var xSquare = xyy0.y / ((xyy0.x - xyy1.x) * (xyy0.x - xyy2.x));
  var x = xSquare * -xyy1.x + xSquare * -xyy2.x;
  var c = xSquare * xyy1.x * xyy2.x;
  return new QuadraticPolynomial(xSquare, x, c);
};


/** Interpolates through the three points given using Lagrange interpolation. */
var lagrangeInterpolateXyy = function(
  xyy0: colors.Xyy, xyy1: colors.Xyy, xyy2: colors.Xyy): QuadraticPolynomial {
  var result0 = lagrangeStepXyy(xyy0, xyy1, xyy2);
  var result1 = lagrangeStepXyy(xyy1, xyy0, xyy2);
  var result2 = lagrangeStepXyy(xyy2, xyy0, xyy1);

  return new QuadraticPolynomial(
    result0.xSquare + result1.xSquare + result2.xSquare, 
    result0.x + result1.x + result2.x, 
    result0.c + result1.c + result2.c);
};


/**
 * Protanopes can see wavelengths 470 and 575 correctly, as well as white. Doing
 * polynomial interpolation between these points produces a polynomial that can
 * be used to estimate all colors that protanopes can see.
 */
var xyyVisionCurve = lagrangeInterpolateXyy(
  colors.XYY_470, colors.XYY_575, colors.XYY_WHITE_D65);


/** Asserts that all RGB channels are between 0 and 255. */
var assertDisplayRgb = function(rgb: colors.Rgb): void {
  assert.ok(rgb.R >= 0);
  assert.ok(rgb.R <= 255);
  assert.ok(rgb.G >= 0);
  assert.ok(rgb.G <= 255);
  assert.ok(rgb.B >= 0);
  assert.ok(rgb.B <= 255);
};


/** Represents a line. */
var Line = function(m: number, b: number) {
  this.m = m;
  this.b = b;
};


/** Calculates a line between the two given xyY coordinates. */
var xyyLine = function(xyy0: colors.Xyy, xyy1: colors.Xyy): Line {
  // The confusion point for protanopes is outside the sRGB colorspace, so this
  // can't divide-by-0.

  if (xyy0.x > xyy1.x) {
    var point = xyy0;
    xyy0 = xyy1;
    xyy1 = point;
  }
  var slope = (xyy1.y - xyy0.y) / (xyy1.x - xyy0.x);
  return new Line(slope, xyy0.y - slope * xyy0.x);
};


/** 
 * Calculates the intersection between a quadratic and a line using the
 * ::drumroll:: quadratic formula!
 */
var intersectCurveLineXyy = function(
  poly: QuadraticPolynomial, line: Line, Y: number): colors.Xyy {
  var A = poly.xSquare;
  var B = poly.x - line.m;
  var C = poly.c - line.b;
  var discriminant = B*B - 4.0 * A * C;

  // Only the smaller X root falls in the color space.
  assert.ok(discriminant >= 0);

  var x = (-B + Math.sqrt(discriminant)) / (2.0 * A);

  return new colors.Xyy(x, line.m * x + line.b, Y);
};


/** 
 * If the xyy color falls outside the triangle defined by the sRGB primaries,
 * does a best-effort to move it back within the sRGB triangle by intersecting
 * the confusion line with the sRGB triangle.
 */
var moveWithinRgb = function(line: Line, xyy: colors.Xyy) {
  // Two cases for protanopes: line intersects Blue->Green, line intersects
  // Red->Green.
  var primaryLine = xyy.x < colors.XYY_GREEN_PRIMARY.x ? 
        xyyLine(colors.XYY_BLUE_PRIMARY, colors.XYY_GREEN_PRIMARY) : 
        xyyLine(colors.XYY_GREEN_PRIMARY, colors.XYY_RED_PRIMARY);

  var y = primaryLine.m * xyy.x + primaryLine.b;
  if (xyy.y > y) {
    var newX = (primaryLine.b - line.b) / (line.m - primaryLine.m);
    var newY = primaryLine.m * newX + primaryLine.b;
    return new colors.Xyy(newX, newY, xyy.Y);
  }

  return xyy;
};


/** Returns x if within min or max, otherwise the violated bound. */
var clamp = function(min: number, x: number, max: number): number {
  return Math.max(min, Math.min(x, max));
};


/**
 * Returns an RGB color representing the intersection between the protanope
 * confusion line in the xyY colorspace, and the true parabola in the xyY
 * colorspace. If this color falls outside the sRGB, the intersection of the
 * edge of the sRGB spectrum and the confusion line will be used. This was
 * implemented from http://www.cs.ucf.edu/~yhu/grapp2006.pdf
 * TODO(jake): Generalize to other dichromats.
 */
var convertToProtanope = function(rgb: colors.Rgb): colors.Rgb {
  assertDisplayRgb(rgb);
  var xyy = colors.xyzToXyy(colors.rgbToXyz(rgb));

  // First, find the confusion line. All colors along this line are perceived as
  // identical to protanopes.
  var confusionLine = xyyLine(xyyConfusionPoint, xyy);

  // The intersection between the vision curve and the confusion line is an
  // estimation of the color a protanope actually sees.
  var xyyIntersection = intersectCurveLineXyy(xyyVisionCurve, confusionLine, xyy.Y);

  // The color may have fallen outside the sRGB colorspace. If so, move it back
  // along the confusion line. Note: This can still convert to colors outside of
  // the display sRGB colorspace.
  var boundedXyy = moveWithinRgb(confusionLine, xyyIntersection);

  // Convert back to RGB.
  var returnRgb = colors.xyzToRgb(colors.xyyToXyz(xyyIntersection));

  // Unclear what to do here besides clamp. If this is outside [0-255], then
  // it's the case where there was no intersection between the confusion line
  // and the sRGB colorspace.
  var finalRgb = new colors.Rgb(
    clamp(0, Math.round(returnRgb.R), 255), 
    clamp(0, Math.round(returnRgb.G), 255), 
    clamp(0, Math.round(returnRgb.B), 255));

  assertDisplayRgb(finalRgb);
  return finalRgb;
};
exports.convertToProtanope = convertToProtanope;
