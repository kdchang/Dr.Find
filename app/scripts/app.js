'use strict';

/**
 * @ngdoc overview
 * @name drfindApp
 * @description
 * # drfindApp
 *
 * Main module of the application.
 */
angular
  .module('drfindApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'google-maps',
    'ui.bootstrap'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .when('/visualize', {
        templateUrl: 'views/visualize.html',
        controller: 'VisualizeCtrl'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
