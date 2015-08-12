#!/bin/bash

# Performs all the steps necessary to run the bot.
# - Performs typechecking, runs tests.
# - Converts the project source from Facebook's Flow syntax to regular JS.
# - Runs the bot.

. ./build.sh
(cd build; node ./twitterbot.js)
