'use strict';

/**
 * @ngdoc function
 * @name drfindApp.controller:VisualizeCtrl
 * @description
 * # VisualizeCtrl
 * Controller of the drfindApp
 */
angular.module('drfindApp')
  .controller('VisualizeCtrl', function ($scope) {
    // $scope.awesomeThings = [
    //   'HTML5 Boilerplate',
    //   'AngularJS',
    //   'Karma'
    // ];
    $scope.map = {
    	center: {
    		latitude: 25,
    		longitude: 121
    	},
    	zoom: 10
    };
  });
