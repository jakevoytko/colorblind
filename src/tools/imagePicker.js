/**
 * Defines the entry point for a node.js-based image picker tool. This tool is
 * passed a single command line argument, a file. It...
 *
 *  - Ceases processing if $imagename-proto.rmsd is present
 *  - It reads the binary data image from $imagename.ext
 *  - Calculates the RMSD using each pixel in the original image and protanope image
 *  - Creates an output file, $imagename-proto.rmsd.tmp, containing the RMSD
 *  - Moves $imagename-proto.rmsd.tmp to $imagename-proto.rmsd
 *  - Writes the proto image into $imagename-proto.ext
 *
 * This can be used to find images that change the most for a protanope, and
 * also other interesting things (like ones that change the least).
 *
 * This avoids batching for simplicity. Just use xargs to parallelize.
 */

var assert = require('assert');
var colors = require('../colors/colors.js');
var fs = require('fs');
// $FlowFixMe: lwip does not have externs.
var lwip = require('lwip');
var protanope = require('../colors/protanope.js');


/** Parses argv for the file. */
var getFileFromArgs = function(argv: Array<string>): ?string {
  if (argv.length != 3) {
    return null;
  }

  return argv[2];
};


var JPG_REGEX = /^([^.]+)\.jpg$/i;
/** 
 * Validates that the file arg passed to the program is real, and likely a
 * jpeg. Returns the arg if it is real, otherwise null.
 */
var validateFile = function(file: ?string): ?string {
  if (!file) {
    return null;
  }

  if (file.search(JPG_REGEX) != 0) {
    return null;
  }

  try {
    var stats = fs.statSync(file);
    return stats.isFile() ? file : null;
  } catch (e) {
    // Does not exist.
    return null;
  }
};


/** Gets the filename without the .jpg extension. */
var getBasename = function(imageName: string): string {
  return imageName.match(JPG_REGEX)[1];
};


/** Returns the RMSD filename. */
var getRmsdFilename = function(imageName: string): string {
  return getBasename(imageName) + '-proto.rmsd';
};


/** Returns the processed filename. */
var getProtoFilename = function(imageName: string): string {
  return getBasename(imageName) + '-proto.jpg';
};


/** Returns the usage string for the program. */
var getUsage = function(): string {
  return 'Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' $imageName\n' +
    '\n' +
    'For the given image, calculates how different the image is, and outputs\n' +
    '$imagename-proto.rmsd. Does not recalculate when the .rmsd file is\n' +
    'already present.\n' +
    '\n' +
    'TODO: only works with .jpg files.\n';
};


/** Checks if the given image has already been processed */
var checkImageFinished = function(imageName: string): boolean {
  try {
    var stats = fs.statSync(getRmsdFilename(imageName));
    return stats.isFile();
  } catch (e) {
    // Does not exist.
    return false;
  }
};


/** 
 * Outputs the filename and difference score into a temp file, and then renames
 * it to the .rmsd version. This avoids empty score files, since moves are
 * atomic.
 */
var outputDifferenceScore = function(
  sourceFilename: string, differenceScore: number) {

  assert(!isNaN(differenceScore));
  assert(differenceScore >= 0);
  var rmsdFilename = getRmsdFilename(sourceFilename);
  fs.writeFileSync(
    rmsdFilename + '.tmp', 
    differenceScore + ',"' + sourceFilename + '"');
  fs.renameSync(rmsdFilename + '.tmp', rmsdFilename);
};


/** Calculates the direct distance between a and b. */
var calculateDistance = function(a: colors.Xyz, b: colors.Xyz): number {
  return Math.sqrt(
    Math.pow(a.X - b.X, 2) + Math.pow(a.Y - b.Y, 2) + Math.pow(a.Z - b.Z, 2));
};


/** 
 * High-level program logic, roughly a pipeline, since LWIP is strictly async.
 * - main
 * - processImage
 */
var main = function(): void {
  var image = validateFile(getFileFromArgs(process.argv));
  if (!image) {
    console.error(process.argv, getUsage());
    return;
  }

  if (checkImageFinished(image)) {
    console.log('image %s already processed, exiting', image);
    return;
  }

  console.log('processing image %s', image);

  lwip.open(image, processImage);
};


/**
 * Calculates the root-mean-square deviation for the protanope image, after
 * converting into a color space with linear intensities (XYZ) and calculating
 * their absolute distances. Ultimately writes it into the score file.
 */
var processImage = function(err: Error, image: lwip.Image): void {
  var batchImage = image.batch();
  var squaredError = 0;
  for (var row = 0; row < image.height(); row++) {
    for (var col = 0; col < image.width(); col++) {
      var pixel = image.getPixel(col, row);
      var originalColor = new colors.Rgb(pixel.r, pixel.g, pixel.b);
      var protanopeColor = protanope.convertToProtanope(originalColor);
      
      var originalXyz = colors.rgbToXyz(originalColor);
      var protanopeXyz = colors.rgbToXyz(protanopeColor);

      var distance = calculateDistance(originalXyz, protanopeXyz);
      squaredError += Math.pow(distance, 2);

      batchImage.setPixel(col, row, {
        r: protanopeColor.R,
        g: protanopeColor.G,
        b: protanopeColor.B,
        a: pixel.a
      });
    }
  }

  assert(squaredError >= 0);

  var meanSquaredDeviation = squaredError / (image.height() * image.width());
  var rmsd = Math.sqrt(meanSquaredDeviation);
  var file = getFileFromArgs(process.argv);
  if (!file) { // Needed for type checker.
    throw Error('This should never be hit: file already found in FS.');
  }
  outputDifferenceScore(file, rmsd);

  batchImage.writeFile(getProtoFilename(file), 'jpg', {quality:100}, function(err) {
    if (err) {
      console.error('Error writing protan file for ', file, err);
    } else {
      console.log('finished processing %s', file);
    }
  });
};


main();
