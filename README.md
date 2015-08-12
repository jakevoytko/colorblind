# Colorblind Twitterbot #

This is a Twitterbot written in node.js. It is designed to run a single Twitter
account. The bot...

- Listens for Tweets sent directly to the bot which contain images.
- Downloads the first such image.
- Converts each pixel to an approximated pixel that a protan (red-green
  colorblind) individual would see.
- Re-uploads the image on behalf of the authenticated user.
- Sends a response Tweet on behalf of the authenticated user. The tweet is a
  reply to the original Tweet, and references the uploaded image.

# Purpose #

This bot was written by me, Jake Voytko (jakevoytko@gmail.com), for a
[Queens JS](http://queensjs.com) talk, "I am colorblind, and so can you!"  It is
designed to teach others about how colorblindness functions by producing
pictures that shows them, and additionally providing code so the process can be
understood algorithmically. This is also to teach me how node.js
works. 

Accordingly, don't use this as a template for other Twitterbots. At the very
least, you should swap out the OAuth functions with an OAuth library, since I
rolled these by hand to learn how OAuth works.

# External dependencies #

- [Facebook Flow](http://flowtype.org/) for static type checking.
- [LWIP](https://github.com/EyalAr/lwip) to handle image encoding/decoding.
- [Facebook jstransform](https://github.com/facebook/jstransform) to strip the
  inline type checking information.
- [Mocha](https://mochajs.org/) for testing.

# Code organization #

- **./src/color/protanope.js**: Contains #convertToProtanope. This contains
  contains all of the high-level logic for converting a single pixel to its
  colorblind version.
- **./src/twitterbot.js**: The entry point. Defines the processing pipeline and
  runs it.
- **Everything else**: Utilities of various persuasions.
