'use strict';

/**
 * @ngdoc function
 * @name drfindApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the drfindApp
 */
angular.module('drfindApp')
  .controller('MainCtrl', function ($scope, $q, $http) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    $scope.map = {
      center: {
          latitude: 25,
          longitude: 121
      },
      zoom: 8
    };

    $scope.token = "";
    $scope.getToken = function(){
      var q = $scope.q = $q.defer();
      var p = $scope.q.promise;

      var xsrf = $.param({
        id: "d93f4a40f62804f081c3c53a22a1c4d3",
        secret_key: "518ccaebd250af3e223739b216c4cac8"
        });
      var request = $http({
        method: "POST",
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        url: "http://api.ser.ideas.iii.org.tw/api/user/get_token",
        data: xsrf
      });

      request.success(function(data, status, headers, config) {
        q.resolve(data.result.token);
      });

      p.then(function(token){
        console.log(token);
        $scope.token = token;
      });
    };

    $scope.getToken();

  });
