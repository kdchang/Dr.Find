'use strict';

/**
 * @ngdoc function
 * @name drfindApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the drfindApp
 */
angular.module('drfindApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    $scope.map = {
      center: {
          latitude: 25,
          longitude: 121.4
      },
      zoom: 14
    };
  });
