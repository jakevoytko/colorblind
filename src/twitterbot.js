/**
 * Contains the entry point for the node.js app. This...
 * - loads the user's OAuth data
 * - opens a hanging request to the user's stream
 * - pieces together the image processing / Tweet re-uploading pipeline
 *
 * All application logic should be in this file. The pipeline is pieced together
 * using an 'args' object that is passed around per-Tweet, since ain't nobody
 * got time to line up arguments to callbacks.
 * 
 * The basic pipeline is.. 
 * runUserStream | chunkReaderCallback | downloadImage | processImage | 
 *     uploadImage | sendTweetReplyWithMedia
 */

var appUtil = require('./apputil.js');
var config = require('./config.js');
var https = require('https');
// $FlowFixMe: Type check lwip.
var lwip = require('lwip');
var responses = require('./net/responses.js');
var twitter = require('./twitter/twitter.js');
var twitterJson = require('./twitter/json.js');
var util = require('util');


/**
 * Opens the user stream, passing all chunks into the constructed chunk
 * aggregator. This aggregator kicks off the processing pipeline for each tweet.
 */
var runUserStream = function(): void {
  console.log('opening user stream for user ' + config.username);
  var chunkReader = new twitter.DelimitedChunkAggregator(chunkReaderCallback);

  var request = twitter.openUserStream(config.oauthData, function(response) {
    console.log('user stream status code: ' + response.statusCode);
    
    response.on('data', function(data) {
      chunkReader.add(data);
    });
    response.on('end', function() {
      console.error('Connection was ended by Twitter.');
    });

    if (response.statusCode != 200) {
      console.error('Failed to connect to Twitter.');
    }
  });

  request.on('error', function(e) {
    console.error('Error connecting to user stream: ', e.message, util.inspect(e));
  });
  request.end();
};


/**
 * Attempts to parse Tweet data from the given buffer, and then downloads the
 * first image URL it finds in the Tweet that is a supported format, and process
 * that image.
 */
var chunkReaderCallback = function(err: ?Error, buffer: ?Buffer) {
  if (err) {
    console.error('Received bad chunk data. Crashing.');
    throw err;
  }
  if (!buffer) {
    throw Error('Expected non-null buffer for chunk reader callback.');
  }
  console.log('Received complete chunk.');
  var tweet = JSON.parse(buffer.toString('utf8'));

  if (!twitterJson.isTweet(tweet)) {
    console.log('Received non-tweet message.');
    return;
  }

  var screenName = twitterJson.getTweetScreenName(tweet);
  if (!screenName) {
    console.error('Unrecognizable Tweet format', util.inspect(tweet));
    return;
  }
  if (screenName.toLowerCase() == config.username.toLowerCase()) {
    // Avoid processing a steady stream of Tweets from self.
    return;
  }

  var urls = twitterJson.getTweetPhotoUrls(tweet).filter(
    appUtil.urlHasSupportedImageType);
  if (urls.length) {
    var args = {
      oauthKeyData: config.oauthData,
      imageUrl: urls[0],
      tweet: tweet
    };
    downloadImage(args);
  } else {
    console.log('No photo URLs in tweet.');
  }
};


/**
 * Downloads the given image, and attempts to open it in LWIP. If successful,
 * passes the image onto processImage.
 */
var downloadImage = function(args: Object): void {
  console.log('Downloading image.');
  var url = args.imageUrl;
  var smallUrl = url + ':small';
  console.log('Downloading image ' + smallUrl);

  // $FlowIssue: https module is not defined.
  var request = https.get(smallUrl, function(response) {
    console.log('Download image status code: ' + response.statusCode);
    if (response.statusCode != 200) {
      console.error('Error downloading image.');
      responses.collectBuffer(response, function(data) {
        console.error('Error response: ', data.toString('utf8'));
      });
      return;
    }
    responses.collectBuffer(response, function(data) {
      lwip.open(data, url.substr(url.lastIndexOf('.') + 1).toLowerCase(), 
        function(err, image) {
          if (err) {
            console.error('opening the image did not work. ' + err);
            return;
          }
          console.log('Image downloaded and opened successfully.');
          args.image = image;
          processImage(args);
        });
    });
  });
  request.on('error', function(e) {
    console.error('Error downloading image', e);
  });
  request.end();
};


/**
 * Decodes the image, converts it to the protan version, and then encodes it as
 * a jpeg.
 */
var processImage = function(args: Object) {
  console.log('processImageFn');

  var image = args.image;
  appUtil.createProtanImage(image, function(image) {
    image.toBuffer('jpg', {quality:100}, function(err, buffer) {
      if (err) {
        console.error('image buffer call failed.');
        throw err;
      }
      args.processedImageBuffer = buffer;
      uploadImageFn(args);
    });
  });
};


/**
 * Uploads the given image to Twitter on behalf of the user represented in the
 * key data.
 */
var uploadImageFn = function(args) {
  console.log('uploadImageFn');

  var imageBuffer = args.processedImageBuffer;
  var oauthKeyData = args.oauthKeyData;

  twitter.uploadImage(imageBuffer, oauthKeyData, function(mediaId) {
    args.mediaId = mediaId;
    sendTweetReplyWithMedia(args);
  });
};


/**
 * Sends a tweet response back to the user who sent the original image,
 * referencing the new media id.
 */
var sendTweetReplyWithMedia = function(args) {
  console.log('sendTweetReplyWithMediaFn');

  var baseMessage = 'Here is the colorblind version of your picture.';

  var oauthKeyData = args.oauthKeyData;
  var tweet = args.tweet;
  var mediaId = args.mediaId;

  var tweetScreenName = twitterJson.getTweetScreenName(tweet);
  var tweetId = twitterJson.getTweetId(tweet);
  if (!tweetScreenName || !tweetId) {
    console.error('Twitter screenname or id not populated in object.');
    return;
  }
  var message = '@' + tweetScreenName + ' ' + baseMessage;
  var callback = function(res) {
    if (res.statusCode == 200) {
      console.log('The whole shebang has successfully happened!');
      return;
    }
    console.error('Tweet reply failed.', res.statusCode);
    responses.collectBuffer(res, function(data) {
      console.error('Error data: ', data.toString('utf8'));
    });
  };

  console.log(message, tweetId, mediaId);
  var request = twitter.sendTweetReplyWithMedia(
    message, oauthKeyData, tweetId, mediaId, callback);
  request.on('error', function(err) {
    console.error('Tweet response error: ', err);
  });
  request.end();
};


// Run the program. Opens a hanging GET listening on the user stream.
runUserStream();
