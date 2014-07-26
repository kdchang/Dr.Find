'use strict';

/**
 * @ngdoc function
 * @name drfindApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the drfindApp
 */
angular.module('drfindApp')
	.controller('MainCtrl', function($scope, $q, $http) {
		// http://af1a74.swagger.5fpro.com/#!/133
		// org-code: 依機關種類 (https://drfind.firebaseio.com/org-code.json)
		// country-code: 依縣分區 (https://drfind.firebaseio.com/country-code.json)
		// jquery .ajax

		// geo-location detection
		var gotPosition = function(position) {
			$scope.geLatitude = position.coords.latitude;
			$scope.geLongitude = position.coords.longitude;
		}

		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(gotPosition);
		} else {
			alert('Sorry, your browser dont support geolocation :(');
		}

		// map clinic info
		$scope.fakeMap = [{
			'id': '12348',
			'name': '宏國牙醫診所',
			'coords': [25.058856, 121.554862],
			'address': '台北市民生東路五段15號',
			'phone': '02-27601715',
			'click': 'callDoc',
			'link': 'https://clinic.firebaseio.com/clinic/3701010061.json'
		}, {
			'id': '12348',
			'name': '元榜牙醫診所',
			'coords': [25.058258, 121.553322],
			'address': '台北市松山區民生東路四段119號',
			'phone': '02-27162512',
			'click': 'callDoc',
			'link': 'https://clinic.firebaseio.com/clinic/0101090019.json'
		}];

		// show the clinic info to the sidebar
		$scope.callDetailInfo = function(event, link) {
			var q1 = $q.defer();
			var p1 = q1.promise;

			p1.then(function(data) {
				$scope.info = data;
			});
			$.getJSON(link, function(data) {

			}).done(function(data) {
				console.log(data);
				q1.resolve(data);
			})
				.fail(function() {
					console.log("error");
				})
				.always(function() {
					console.log("complete");
				}).complete(function() {
					console.log("second complete");
				});
		};

    $scope.ptts = []
    $scope.searchPtt = function(){
      $scope.ptts = []
      var request = $http({
        method: "GET",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        url: "https://doctors.firebaseio.com/ptt-drinfo/"+$scope.departSelect+".json"
      });

      request.success(function(data, status, headers, config) {
        if(typeof data !== null) {

          // angular.forEach(data, function(value) {
          for (var i = 0; i < 10; i++){
            var value = data[i];

            var request = $http({
              method: "GET",
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              url: "https://ptt-doctor-info.firebaseio.com/list/"+value+".json"
            });

            request.success(function(data, status, headers, config) {
              if(typeof data !== null) {
                console.log(data);
                $scope.ptts.push(data);
              }
            });
          }
        }
      });

    };

		$scope.searchDoctor = function() {
			//alert($scope.docName);

			var par = $scope.countrySelect + '/' + $scope.departSelect; 
			var choice;

			if($scope.docClinicSelect == 0) {
				choice = 'doctor';
			} else if ($scope.docClinicSelect == 1) {
				choice = 'clinic';	
			}

			var request = $http({
				method: "GET",
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				url: "https://doctors.firebaseio.com/" + choice + "/" + par + '.json'
				// data: xsrf
			});

			request.success(function(data, status, headers, config) {
				if(typeof data !== null) {
          $scope.searchResults = data;
          $scope.searchPtt();
          // $scope.markers.setMap(null);
					for (var i = 0; i < data.length; i++){
					  // look for the entry with a matching `code` value
					  if (data[i].doctor == $scope.docName){
					    // we found it
					    $scope.searchResults = data;
					    //alert($scope.docName);	
					    // obj[i].name is the matched result
					  }
					}
				} else {

          // var centre = $scope.map.getCenter(); 
          // console.log(centre);
          // var latlng = new google.maps.LatLng(centre["k"], centre["B"]);
          // console.log(latlng);
          // $scope.map.setCenter(latlng);
          
          // console.log($scope.markers[0]);
    //       $scope.$on('markersInitialized', function(event, map) {
    //         console.log("mapInitialized");
    //       });
				}
			});

		};

		// use the iii API
		$scope.token = "";

		$scope.getToken = function() {
			var q = $scope.q = $q.defer();
			var p = $scope.q.promise;

			var xsrf = $.param({
				id: "d93f4a40f62804f081c3c53a22a1c4d3",
				secret_key: "518ccaebd250af3e223739b216c4cac8"
			});
			var request = $http({
				method: "POST",
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				url: "http://api.ser.ideas.iii.org.tw/api/user/get_token",
				data: xsrf
			});

			request.success(function(data, status, headers, config) {
				q.resolve(data.result.token);
			});

			p.then(function(token) {
				console.log(token);
				$scope.token = token;
				$scope.keywordSearch("糖尿病", "http://api.ser.ideas.iii.org.tw:80/api/keyword_search/forum/title");
				$scope.keywordSearch("糖尿病", "http://api.ser.ideas.iii.org.tw:80/api/keyword_search/news/title");
				$scope.keywordSearch("糖尿病", "http://api.ser.ideas.iii.org.tw:80/api/keyword_search/ptt/title");
			});
		};

		$scope.keywordSearch = function(keyword, url) {
			var q = $scope.q = $q.defer();
			var p = $scope.q.promise;
			var xsrf = $.param({
				token: $scope.token,
				keyword: keyword
			});
			var request = $http({
				method: "POST",
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				url: url,
				data: xsrf
			});

			request.success(function(data, status, headers, config) {
				q.resolve(data);
			});
			p.then(function(data) {
				console.log(data);
			});
		};
		$scope.getToken();
	});