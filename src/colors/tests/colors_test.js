var assert = require('assert');
var colors = require('../colors.js');

describe('colors', function() {
  describe('colors.Xyz()', function() {
    it('should succeed when Y is in bounds', function() {
      new colors.Xyz(.5, .5, .5);
      new colors.Xyz(1, 1, 1);
      new colors.Xyz(0, 0, 0);
    });
  });
});
