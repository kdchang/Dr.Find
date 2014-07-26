'use strict';

describe('Service: iiitoken', function () {

  // load the service's module
  beforeEach(module('drfindApp'));

  // instantiate service
  var iiitoken;
  beforeEach(inject(function (_iiitoken_) {
    iiitoken = _iiitoken_;
  }));

  it('should do something', function () {
    expect(!!iiitoken).toBe(true);
  });

});
