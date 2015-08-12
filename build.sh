#!/bin/bash

# If the config hasn't been copied to its final location, do that.
if [[ ! -e ./src/config.js ]]; then
  cp ./src/config.js{.template,}
fi

# Typechecks and tests the bot.

(cd src; flow check --all)
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi

jstransform --strip-types --harmony src/ build/
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi

mocha `find build -name *_test.js`
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi
