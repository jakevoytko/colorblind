#!/bin/bash

# Typechecks and tests the bot.

(cd src; flow check --all)
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi

jstransform --strip-types --harmony src/ build/
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi

mocha `find build -name *_test.js`
rc=$?; if [[ $rc != 0 ]]; then exit $rc; fi
