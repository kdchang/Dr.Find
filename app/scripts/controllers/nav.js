'use strict';

/**
 * @ngdoc function
 * @name drfindApp.controller:NavCtrl
 * @description
 * # NavCtrl
 * Controller of the drfindApp
 */
angular.module('drfindApp').controller('NavCtrl', function ($scope, $location) {
  $scope.getNavClass = function (page) {
    return page === $location.path() ? 'active' : '';
  };
});
