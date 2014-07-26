'use strict';

/**
 * @ngdoc function
 * @name drfindApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the drfindApp
 */
angular.module('drfindApp')
  .controller('MainCtrl', function ($scope, $firebase, $q) {
  	// http://af1a74.swagger.5fpro.com/#!/133
  	// org-code: 依機關種類 (https://drfind.firebaseio.com/org-code.json) 
    // country-code: 依縣分區 (https://drfind.firebaseio.com/country-code.json) 
    // jquery .ajax
  	var ref = new Firebase('https://drfind.firebaseio.com/L');
  	$scope.makers = $firebase(ref);
  	// $scope.fakeMap = 
  	// // {
  	// // 	'0': 
  	// [{'0' : [{
  	// 			'id': '12345',
  	// 			'content': '好呦',
  	// 			'coords': {'latitude': 25.058856, 'longitude' :121.554862},
  	// 			'link': 'http://xd'

  	// 		}, {
  	// 			'id' : '12346',
  	// 			'content': '推推',  				
  	// 			'coords': {'latitude': 25.258856, 'longitude' :121.554862},
  	// 			'link': 'http://xd'

  	// 		}]},
  	// 		{'0' : [{
  	// 			'id': '12347',
  	// 			'coords': {'latitude': 23.358856, 'longitude' :121.554862},
  	// 			'link': 'http://xd'

  	// 		}, {
  	// 			'id' : '12348',
  	// 			'coords': {'latitude': 25.458856, 'longitude' :121.554862},
  	// 			'click': 'callDoc',
  	// 			'link': 'http://xd'
  	// 		}]
  	// 	}]; 

    $scope.map = {
      center: {
          latitude: 25.058856, 
          longitude: 121.554862
      },
      zoom: 15
      // coords:
    };    
    $scope.callDetailInfo = function(clinicId){
    	// alert('xd')
		$scope.items = [];  
	    var q1 = $q.defer();
	    // q2 = $scope.q2 = $q.defer(),
	    var p1 = q1.promise; 
	    // p2 = $scope.q2.promise;

		p1.then(function(data){
						  	$scope.info = data;
						  });
    	$.getJSON( "https://clinic.firebaseio.com/clinic/3701010061.json", function( data ) {
	  // $.each( data, function( key, val ) {
	  //   items.push( "<li id='" + key + "'>" + val + "</li>" );
	  // });
		}).done(function(data) {
    		console.log(data );
    		// cfpLoadingBar.start();
    		q1.resolve(data);
		})
		.fail(function() {
			console.log( "error" );
		})
		.always(function() {
			console.log( "complete" );
		}).complete(function() {
  			console.log( "second complete" );
		});	       
    }
  });
