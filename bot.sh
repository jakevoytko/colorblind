#!/bin/bash

# Performs all the steps necessary to run the bot.
# - Performs typechecking, runs tests.
# - Converts the project source from Facebook's Flow syntax to regular JS.

(cd src; flow check --all)

rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi

jstransform --strip-types --harmony src/ build/

mocha `find build -name *_test.js`
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi

jstransform --strip-types --watch --harmony src/ build/

# TODO(jake): Run bot when there is something to run.
# TODO(jake): Drop down to 1 jstransform call, run with &