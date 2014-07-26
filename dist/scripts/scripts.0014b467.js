"use strict";angular.module("drfindApp",["ngAnimate","ngCookies","ngResource","ngRoute","ngSanitize","ngTouch","ui.bootstrap","ui.select2","firebase","angular-loading-bar","ngMap"]).config(["$routeProvider",function(a){a.when("/",{templateUrl:"views/main.html",controller:"MainCtrl"}).when("/visualize",{templateUrl:"views/visualize.html",controller:"VisualizeCtrl"}).when("/about",{templateUrl:"views/about.html",controller:"AboutCtrl"}).otherwise({redirectTo:"/"})}]),angular.module("drfindApp").controller("MainCtrl",["$scope","$q","$http",function(a,b,c){var d=function(b){a.geLatitude=b.coords.latitude,a.geLongitude=b.coords.longitude};navigator.geolocation?navigator.geolocation.getCurrentPosition(d):alert("Sorry, your browser dont support geolocation :("),a.fakeMap=[{id:"12348",name:"宏國牙醫診所",coords:[25.058856,121.554862],address:"台北市民生東路五段15號",phone:"02-27601715",click:"callDoc",link:"https://clinic.firebaseio.com/clinic/3701010061.json"},{id:"12348",name:"元榜牙醫診所",coords:[25.058258,121.553322],address:"台北市松山區民生東路四段119號",phone:"02-27162512",click:"callDoc",link:"https://clinic.firebaseio.com/clinic/0101090019.json"}],a.callDetailInfo=function(c,d){var e=b.defer(),f=e.promise;f.then(function(b){a.info=b}),$.getJSON(d,function(){}).done(function(a){console.log(a),e.resolve(a)}).fail(function(){console.log("error")}).always(function(){console.log("complete")}).complete(function(){console.log("second complete")})},a.searchDoctor=function(){var b=a.countrySelect+"/"+a.departSelect,d=c({method:"GET",headers:{"Content-Type":"application/x-www-form-urlencoded"},url:"https://doctors.firebaseio.com/clinic/"+b+".json"});d.success(function(b){null!==typeof b&&(a.searchResults=b)})},a.token="",a.getToken=function(){var d=a.q=b.defer(),e=a.q.promise,f=$.param({id:"d93f4a40f62804f081c3c53a22a1c4d3",secret_key:"518ccaebd250af3e223739b216c4cac8"}),g=c({method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},url:"http://api.ser.ideas.iii.org.tw/api/user/get_token",data:f});g.success(function(a){d.resolve(a.result.token)}),e.then(function(b){console.log(b),a.token=b,a.keywordSearch("糖尿病","http://api.ser.ideas.iii.org.tw:80/api/keyword_search/forum/title"),a.keywordSearch("糖尿病","http://api.ser.ideas.iii.org.tw:80/api/keyword_search/news/title"),a.keywordSearch("糖尿病","http://api.ser.ideas.iii.org.tw:80/api/keyword_search/ptt/title")})},a.keywordSearch=function(d,e){var f=a.q=b.defer(),g=a.q.promise,h=$.param({token:a.token,keyword:d}),i=c({method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},url:e,data:h});i.success(function(a){f.resolve(a)}),g.then(function(a){console.log(a)})},a.getToken()}]),angular.module("drfindApp").controller("VisualizeCtrl",["$scope",function(a){a.map={center:{latitude:25,longitude:121},zoom:10}}]),angular.module("drfindApp").controller("AboutCtrl",["$scope",function(){}]),angular.module("drfindApp").controller("NavCtrl",["$scope","$location",function(a,b){a.getNavClass=function(a){return a===b.path()?"active":""}}]);