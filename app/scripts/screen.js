/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.11.0 - 2014-05-01
 * License: MIT
 */
angular.module("ui.bootstrap", ["ui.bootstrap.tpls", "ui.bootstrap.transition","ui.bootstrap.collapse","ui.bootstrap.accordion","ui.bootstrap.alert","ui.bootstrap.bindHtml","ui.bootstrap.buttons","ui.bootstrap.carousel","ui.bootstrap.dateparser","ui.bootstrap.position","ui.bootstrap.datepicker","ui.bootstrap.dropdown","ui.bootstrap.modal","ui.bootstrap.pagination","ui.bootstrap.tooltip","ui.bootstrap.popover","ui.bootstrap.progressbar","ui.bootstrap.rating","ui.bootstrap.tabs","ui.bootstrap.timepicker","ui.bootstrap.typeahead"]);
angular.module("ui.bootstrap.tpls", ["template/accordion/accordion-group.html","template/accordion/accordion.html","template/alert/alert.html","template/carousel/carousel.html","template/carousel/slide.html","template/datepicker/datepicker.html","template/datepicker/day.html","template/datepicker/month.html","template/datepicker/popup.html","template/datepicker/year.html","template/modal/backdrop.html","template/modal/window.html","template/pagination/pager.html","template/pagination/pagination.html","template/tooltip/tooltip-html-unsafe-popup.html","template/tooltip/tooltip-popup.html","template/popover/popover.html","template/progressbar/bar.html","template/progressbar/progress.html","template/progressbar/progressbar.html","template/rating/rating.html","template/tabs/tab.html","template/tabs/tabset.html","template/timepicker/timepicker.html","template/typeahead/typeahead-match.html","template/typeahead/typeahead-popup.html"]);
angular.module('ui.bootstrap.transition', [])

/**
 * $transition service provides a consistent interface to trigger CSS 3 transitions and to be informed when they complete.
 * @param  {DOMElement} element  The DOMElement that will be animated.
 * @param  {string|object|function} trigger  The thing that will cause the transition to start:
 *   - As a string, it represents the css class to be added to the element.
 *   - As an object, it represents a hash of style attributes to be applied to the element.
 *   - As a function, it represents a function to be called that will cause the transition to occur.
 * @return {Promise}  A promise that is resolved when the transition finishes.
 */
.factory('$transition', ['$q', '$timeout', '$rootScope', function($q, $timeout, $rootScope) {

  var $transition = function(element, trigger, options) {
    options = options || {};
    var deferred = $q.defer();
    var endEventName = $transition[options.animation ? 'animationEndEventName' : 'transitionEndEventName'];

    var transitionEndHandler = function(event) {
      $rootScope.$apply(function() {
        element.unbind(endEventName, transitionEndHandler);
        deferred.resolve(element);
      });
    };

    if (endEventName) {
      element.bind(endEventName, transitionEndHandler);
    }

    // Wrap in a timeout to allow the browser time to update the DOM before the transition is to occur
    $timeout(function() {
      if ( angular.isString(trigger) ) {
        element.addClass(trigger);
      } else if ( angular.isFunction(trigger) ) {
        trigger(element);
      } else if ( angular.isObject(trigger) ) {
        element.css(trigger);
      }
      //If browser does not support transitions, instantly resolve
      if ( !endEventName ) {
        deferred.resolve(element);
      }
    });

    // Add our custom cancel function to the promise that is returned
    // We can call this if we are about to run a new transition, which we know will prevent this transition from ending,
    // i.e. it will therefore never raise a transitionEnd event for that transition
    deferred.promise.cancel = function() {
      if ( endEventName ) {
        element.unbind(endEventName, transitionEndHandler);
      }
      deferred.reject('Transition cancelled');
    };

    return deferred.promise;
  };

  // Work out the name of the transitionEnd event
  var transElement = document.createElement('trans');
  var transitionEndEventNames = {
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'oTransitionEnd',
    'transition': 'transitionend'
  };
  var animationEndEventNames = {
    'WebkitTransition': 'webkitAnimationEnd',
    'MozTransition': 'animationend',
    'OTransition': 'oAnimationEnd',
    'transition': 'animationend'
  };
  function findEndEventName(endEventNames) {
    for (var name in endEventNames){
      if (transElement.style[name] !== undefined) {
        return endEventNames[name];
      }
    }
  }
  $transition.transitionEndEventName = findEndEventName(transitionEndEventNames);
  $transition.animationEndEventName = findEndEventName(animationEndEventNames);
  return $transition;
}]);

angular.module('ui.bootstrap.collapse', ['ui.bootstrap.transition'])

  .directive('collapse', ['$transition', function ($transition) {

    return {
      link: function (scope, element, attrs) {

        var initialAnimSkip = true;
        var currentTransition;

        function doTransition(change) {
          var newTransition = $transition(element, change);
          if (currentTransition) {
            currentTransition.cancel();
          }
          currentTransition = newTransition;
          newTransition.then(newTransitionDone, newTransitionDone);
          return newTransition;

          function newTransitionDone() {
            // Make sure it's this transition, otherwise, leave it alone.
            if (currentTransition === newTransition) {
              currentTransition = undefined;
            }
          }
        }

        function expand() {
          if (initialAnimSkip) {
            initialAnimSkip = false;
            expandDone();
          } else {
            element.removeClass('collapse').addClass('collapsing');
            doTransition({ height: element[0].scrollHeight + 'px' }).then(expandDone);
          }
        }

        function expandDone() {
          element.removeClass('collapsing');
          element.addClass('collapse in');
          element.css({height: 'auto'});
        }

        function collapse() {
          if (initialAnimSkip) {
            initialAnimSkip = false;
            collapseDone();
            element.css({height: 0});
          } else {
            // CSS transitions don't work with height: auto, so we have to manually change the height to a specific value
            element.css({ height: element[0].scrollHeight + 'px' });
            //trigger reflow so a browser realizes that height was updated from auto to a specific value
            var x = element[0].offsetWidth;

            element.removeClass('collapse in').addClass('collapsing');

            doTransition({ height: 0 }).then(collapseDone);
          }
        }

        function collapseDone() {
          element.removeClass('collapsing');
          element.addClass('collapse');
        }

        scope.$watch(attrs.collapse, function (shouldCollapse) {
          if (shouldCollapse) {
            collapse();
          } else {
            expand();
          }
        });
      }
    };
  }]);

angular.module('ui.bootstrap.accordion', ['ui.bootstrap.collapse'])

.constant('accordionConfig', {
  closeOthers: true
})

.controller('AccordionController', ['$scope', '$attrs', 'accordionConfig', function ($scope, $attrs, accordionConfig) {

  // This array keeps track of the accordion groups
  this.groups = [];

  // Ensure that all the groups in this accordion are closed, unless close-others explicitly says not to
  this.closeOthers = function(openGroup) {
    var closeOthers = angular.isDefined($attrs.closeOthers) ? $scope.$eval($attrs.closeOthers) : accordionConfig.closeOthers;
    if ( closeOthers ) {
      angular.forEach(this.groups, function (group) {
        if ( group !== openGroup ) {
          group.isOpen = false;
        }
      });
    }
  };

  // This is called from the accordion-group directive to add itself to the accordion
  this.addGroup = function(groupScope) {
    var that = this;
    this.groups.push(groupScope);

    groupScope.$on('$destroy', function (event) {
      that.removeGroup(groupScope);
    });
  };

  // This is called from the accordion-group directive when to remove itself
  this.removeGroup = function(group) {
    var index = this.groups.indexOf(group);
    if ( index !== -1 ) {
      this.groups.splice(index, 1);
    }
  };

}])

// The accordion directive simply sets up the directive controller
// and adds an accordion CSS class to itself element.
.directive('accordion', function () {
  return {
    restrict:'EA',
    controller:'AccordionController',
    transclude: true,
    replace: false,
    templateUrl: 'template/accordion/accordion.html'
  };
})

// The accordion-group directive indicates a block of html that will expand and collapse in an accordion
.directive('accordionGroup', function() {
  return {
    require:'^accordion',         // We need this directive to be inside an accordion
    restrict:'EA',
    transclude:true,              // It transcludes the contents of the directive into the template
    replace: true,                // The element containing the directive will be replaced with the template
    templateUrl:'template/accordion/accordion-group.html',
    scope: {
      heading: '@',               // Interpolate the heading attribute onto this scope
      isOpen: '=?',
      isDisabled: '=?'
    },
    controller: function() {
      this.setHeading = function(element) {
        this.heading = element;
      };
    },
    link: function(scope, element, attrs, accordionCtrl) {
      accordionCtrl.addGroup(scope);

      scope.$watch('isOpen', function(value) {
        if ( value ) {
          accordionCtrl.closeOthers(scope);
        }
      });

      scope.toggleOpen = function() {
        if ( !scope.isDisabled ) {
          scope.isOpen = !scope.isOpen;
        }
      };
    }
  };
})

// Use accordion-heading below an accordion-group to provide a heading containing HTML
// <accordion-group>
//   <accordion-heading>Heading containing HTML - <img src="..."></accordion-heading>
// </accordion-group>
.directive('accordionHeading', function() {
  return {
    restrict: 'EA',
    transclude: true,   // Grab the contents to be used as the heading
    template: '',       // In effect remove this element!
    replace: true,
    require: '^accordionGroup',
    link: function(scope, element, attr, accordionGroupCtrl, transclude) {
      // Pass the heading to the accordion-group controller
      // so that it can be transcluded into the right place in the template
      // [The second parameter to transclude causes the elements to be cloned so that they work in ng-repeat]
      accordionGroupCtrl.setHeading(transclude(scope, function() {}));
    }
  };
})

// Use in the accordion-group template to indicate where you want the heading to be transcluded
// You must provide the property on the accordion-group controller that will hold the transcluded element
// <div class="accordion-group">
//   <div class="accordion-heading" ><a ... accordion-transclude="heading">...</a></div>
//   ...
// </div>
.directive('accordionTransclude', function() {
  return {
    require: '^accordionGroup',
    link: function(scope, element, attr, controller) {
      scope.$watch(function() { return controller[attr.accordionTransclude]; }, function(heading) {
        if ( heading ) {
          element.html('');
          element.append(heading);
        }
      });
    }
  };
});

angular.module('ui.bootstrap.alert', [])

.controller('AlertController', ['$scope', '$attrs', function ($scope, $attrs) {
  $scope.closeable = 'close' in $attrs;
}])

.directive('alert', function () {
  return {
    restrict:'EA',
    controller:'AlertController',
    templateUrl:'template/alert/alert.html',
    transclude:true,
    replace:true,
    scope: {
      type: '@',
      close: '&'
    }
  };
});

angular.module('ui.bootstrap.bindHtml', [])

  .directive('bindHtmlUnsafe', function () {
    return function (scope, element, attr) {
      element.addClass('ng-binding').data('$binding', attr.bindHtmlUnsafe);
      scope.$watch(attr.bindHtmlUnsafe, function bindHtmlUnsafeWatchAction(value) {
        element.html(value || '');
      });
    };
  });
angular.module('ui.bootstrap.buttons', [])

.constant('buttonConfig', {
  activeClass: 'active',
  toggleEvent: 'click'
})

.controller('ButtonsController', ['buttonConfig', function(buttonConfig) {
  this.activeClass = buttonConfig.activeClass || 'active';
  this.toggleEvent = buttonConfig.toggleEvent || 'click';
}])

.directive('btnRadio', function () {
  return {
    require: ['btnRadio', 'ngModel'],
    controller: 'ButtonsController',
    link: function (scope, element, attrs, ctrls) {
      var buttonsCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      //model -> UI
      ngModelCtrl.$render = function () {
        element.toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, scope.$eval(attrs.btnRadio)));
      };

      //ui->model
      element.bind(buttonsCtrl.toggleEvent, function () {
        var isActive = element.hasClass(buttonsCtrl.activeClass);

        if (!isActive || angular.isDefined(attrs.uncheckable)) {
          scope.$apply(function () {
            ngModelCtrl.$setViewValue(isActive ? null : scope.$eval(attrs.btnRadio));
            ngModelCtrl.$render();
          });
        }
      });
    }
  };
})

.directive('btnCheckbox', function () {
  return {
    require: ['btnCheckbox', 'ngModel'],
    controller: 'ButtonsController',
    link: function (scope, element, attrs, ctrls) {
      var buttonsCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      function getTrueValue() {
        return getCheckboxValue(attrs.btnCheckboxTrue, true);
      }

      function getFalseValue() {
        return getCheckboxValue(attrs.btnCheckboxFalse, false);
      }

      function getCheckboxValue(attributeValue, defaultValue) {
        var val = scope.$eval(attributeValue);
        return angular.isDefined(val) ? val : defaultValue;
      }

      //model -> UI
      ngModelCtrl.$render = function () {
        element.toggleClass(buttonsCtrl.activeClass, angular.equals(ngModelCtrl.$modelValue, getTrueValue()));
      };

      //ui->model
      element.bind(buttonsCtrl.toggleEvent, function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(element.hasClass(buttonsCtrl.activeClass) ? getFalseValue() : getTrueValue());
          ngModelCtrl.$render();
        });
      });
    }
  };
});

/**
* @ngdoc overview
* @name ui.bootstrap.carousel
*
* @description
* AngularJS version of an image carousel.
*
*/
angular.module('ui.bootstrap.carousel', ['ui.bootstrap.transition'])
.controller('CarouselController', ['$scope', '$timeout', '$transition', function ($scope, $timeout, $transition) {
  var self = this,
    slides = self.slides = $scope.slides = [],
    currentIndex = -1,
    currentTimeout, isPlaying;
  self.currentSlide = null;

  var destroyed = false;
  /* direction: "prev" or "next" */
  self.select = $scope.select = function(nextSlide, direction) {
    var nextIndex = slides.indexOf(nextSlide);
    //Decide direction if it's not given
    if (direction === undefined) {
      direction = nextIndex > currentIndex ? 'next' : 'prev';
    }
    if (nextSlide && nextSlide !== self.currentSlide) {
      if ($scope.$currentTransition) {
        $scope.$currentTransition.cancel();
        //Timeout so ng-class in template has time to fix classes for finished slide
        $timeout(goNext);
      } else {
        goNext();
      }
    }
    function goNext() {
      // Scope has been destroyed, stop here.
      if (destroyed) { return; }
      //If we have a slide to transition from and we have a transition type and we're allowed, go
      if (self.currentSlide && angular.isString(direction) && !$scope.noTransition && nextSlide.$element) {
        //We shouldn't do class manip in here, but it's the same weird thing bootstrap does. need to fix sometime
        nextSlide.$element.addClass(direction);
        var reflow = nextSlide.$element[0].offsetWidth; //force reflow

        //Set all other slides to stop doing their stuff for the new transition
        angular.forEach(slides, function(slide) {
          angular.extend(slide, {direction: '', entering: false, leaving: false, active: false});
        });
        angular.extend(nextSlide, {direction: direction, active: true, entering: true});
        angular.extend(self.currentSlide||{}, {direction: direction, leaving: true});

        $scope.$currentTransition = $transition(nextSlide.$element, {});
        //We have to create new pointers inside a closure since next & current will change
        (function(next,current) {
          $scope.$currentTransition.then(
            function(){ transitionDone(next, current); },
            function(){ transitionDone(next, current); }
          );
        }(nextSlide, self.currentSlide));
      } else {
        transitionDone(nextSlide, self.currentSlide);
      }
      self.currentSlide = nextSlide;
      currentIndex = nextIndex;
      //every time you change slides, reset the timer
      restartTimer();
    }
    function transitionDone(next, current) {
      angular.extend(next, {direction: '', active: true, leaving: false, entering: false});
      angular.extend(current||{}, {direction: '', active: false, leaving: false, entering: false});
      $scope.$currentTransition = null;
    }
  };
  $scope.$on('$destroy', function () {
    destroyed = true;
  });

  /* Allow outside people to call indexOf on slides array */
  self.indexOfSlide = function(slide) {
    return slides.indexOf(slide);
  };

  $scope.next = function() {
    var newIndex = (currentIndex + 1) % slides.length;

    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (!$scope.$currentTransition) {
      return self.select(slides[newIndex], 'next');
    }
  };

  $scope.prev = function() {
    var newIndex = currentIndex - 1 < 0 ? slides.length - 1 : currentIndex - 1;

    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (!$scope.$currentTransition) {
      return self.select(slides[newIndex], 'prev');
    }
  };

  $scope.isActive = function(slide) {
     return self.currentSlide === slide;
  };

  $scope.$watch('interval', restartTimer);
  $scope.$on('$destroy', resetTimer);

  function restartTimer() {
    resetTimer();
    var interval = +$scope.interval;
    if (!isNaN(interval) && interval>=0) {
      currentTimeout = $timeout(timerFn, interval);
    }
  }

  function resetTimer() {
    if (currentTimeout) {
      $timeout.cancel(currentTimeout);
      currentTimeout = null;
    }
  }

  function timerFn() {
    if (isPlaying) {
      $scope.next();
      restartTimer();
    } else {
      $scope.pause();
    }
  }

  $scope.play = function() {
    if (!isPlaying) {
      isPlaying = true;
      restartTimer();
    }
  };
  $scope.pause = function() {
    if (!$scope.noPause) {
      isPlaying = false;
      resetTimer();
    }
  };

  self.addSlide = function(slide, element) {
    slide.$element = element;
    slides.push(slide);
    //if this is the first slide or the slide is set to active, select it
    if(slides.length === 1 || slide.active) {
      self.select(slides[slides.length-1]);
      if (slides.length == 1) {
        $scope.play();
      }
    } else {
      slide.active = false;
    }
  };

  self.removeSlide = function(slide) {
    //get the index of the slide inside the carousel
    var index = slides.indexOf(slide);
    slides.splice(index, 1);
    if (slides.length > 0 && slide.active) {
      if (index >= slides.length) {
        self.select(slides[index-1]);
      } else {
        self.select(slides[index]);
      }
    } else if (currentIndex > index) {
      currentIndex--;
    }
  };

}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:carousel
 * @restrict EA
 *
 * @description
 * Carousel is the outer container for a set of image 'slides' to showcase.
 *
 * @param {number=} interval The time, in milliseconds, that it will take the carousel to go to the next slide.
 * @param {boolean=} noTransition Whether to disable transitions on the carousel.
 * @param {boolean=} noPause Whether to disable pausing on the carousel (by default, the carousel interval pauses on hover).
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <carousel>
      <slide>
        <img src="http://placekitten.com/150/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>Beautiful!</p>
        </div>
      </slide>
      <slide>
        <img src="http://placekitten.com/100/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>D'aww!</p>
        </div>
      </slide>
    </carousel>
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
 */
.directive('carousel', [function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    controller: 'CarouselController',
    require: 'carousel',
    templateUrl: 'template/carousel/carousel.html',
    scope: {
      interval: '=',
      noTransition: '=',
      noPause: '='
    }
  };
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:slide
 * @restrict EA
 *
 * @description
 * Creates a slide inside a {@link ui.bootstrap.carousel.directive:carousel carousel}.  Must be placed as a child of a carousel element.
 *
 * @param {boolean=} active Model binding, whether or not this slide is currently active.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
<div ng-controller="CarouselDemoCtrl">
  <carousel>
    <slide ng-repeat="slide in slides" active="slide.active">
      <img ng-src="{{slide.image}}" style="margin:auto;">
      <div class="carousel-caption">
        <h4>Slide {{$index}}</h4>
        <p>{{slide.text}}</p>
      </div>
    </slide>
  </carousel>
  Interval, in milliseconds: <input type="number" ng-model="myInterval">
  <br />Enter a negative number to stop the interval.
</div>
  </file>
  <file name="script.js">
function CarouselDemoCtrl($scope) {
  $scope.myInterval = 5000;
}
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
*/

.directive('slide', function() {
  return {
    require: '^carousel',
    restrict: 'EA',
    transclude: true,
    replace: true,
    templateUrl: 'template/carousel/slide.html',
    scope: {
      active: '=?'
    },
    link: function (scope, element, attrs, carouselCtrl) {
      carouselCtrl.addSlide(scope, element);
      //when the scope is destroyed then remove the slide from the current slides array
      scope.$on('$destroy', function() {
        carouselCtrl.removeSlide(scope);
      });

      scope.$watch('active', function(active) {
        if (active) {
          carouselCtrl.select(scope);
        }
      });
    }
  };
});

angular.module('ui.bootstrap.dateparser', [])

.service('dateParser', ['$locale', 'orderByFilter', function($locale, orderByFilter) {

  this.parsers = {};

  var formatCodeToRegex = {
    'yyyy': {
      regex: '\\d{4}',
      apply: function(value) { this.year = +value; }
    },
    'yy': {
      regex: '\\d{2}',
      apply: function(value) { this.year = +value + 2000; }
    },
    'y': {
      regex: '\\d{1,4}',
      apply: function(value) { this.year = +value; }
    },
    'MMMM': {
      regex: $locale.DATETIME_FORMATS.MONTH.join('|'),
      apply: function(value) { this.month = $locale.DATETIME_FORMATS.MONTH.indexOf(value); }
    },
    'MMM': {
      regex: $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
      apply: function(value) { this.month = $locale.DATETIME_FORMATS.SHORTMONTH.indexOf(value); }
    },
    'MM': {
      regex: '0[1-9]|1[0-2]',
      apply: function(value) { this.month = value - 1; }
    },
    'M': {
      regex: '[1-9]|1[0-2]',
      apply: function(value) { this.month = value - 1; }
    },
    'dd': {
      regex: '[0-2][0-9]{1}|3[0-1]{1}',
      apply: function(value) { this.date = +value; }
    },
    'd': {
      regex: '[1-2]?[0-9]{1}|3[0-1]{1}',
      apply: function(value) { this.date = +value; }
    },
    'EEEE': {
      regex: $locale.DATETIME_FORMATS.DAY.join('|')
    },
    'EEE': {
      regex: $locale.DATETIME_FORMATS.SHORTDAY.join('|')
    }
  };

  this.createParser = function(format) {
    var map = [], regex = format.split('');

    angular.forEach(formatCodeToRegex, function(data, code) {
      var index = format.indexOf(code);

      if (index > -1) {
        format = format.split('');

        regex[index] = '(' + data.regex + ')';
        format[index] = '$'; // Custom symbol to define consumed part of format
        for (var i = index + 1, n = index + code.length; i < n; i++) {
          regex[i] = '';
          format[i] = '$';
        }
        format = format.join('');

        map.push({ index: index, apply: data.apply });
      }
    });

    return {
      regex: new RegExp('^' + regex.join('') + '$'),
      map: orderByFilter(map, 'index')
    };
  };

  this.parse = function(input, format) {
    if ( !angular.isString(input) ) {
      return input;
    }

    format = $locale.DATETIME_FORMATS[format] || format;

    if ( !this.parsers[format] ) {
      this.parsers[format] = this.createParser(format);
    }

    var parser = this.parsers[format],
        regex = parser.regex,
        map = parser.map,
        results = input.match(regex);

    if ( results && results.length ) {
      var fields = { year: 1900, month: 0, date: 1, hours: 0 }, dt;

      for( var i = 1, n = results.length; i < n; i++ ) {
        var mapper = map[i-1];
        if ( mapper.apply ) {
          mapper.apply.call(fields, results[i]);
        }
      }

      if ( isValid(fields.year, fields.month, fields.date) ) {
        dt = new Date( fields.year, fields.month, fields.date, fields.hours);
      }

      return dt;
    }
  };

  // Check if date is valid for specific month (and year for February).
  // Month: 0 = Jan, 1 = Feb, etc
  function isValid(year, month, date) {
    if ( month === 1 && date > 28) {
        return date === 29 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
    }

    if ( month === 3 || month === 5 || month === 8 || month === 10) {
        return date < 31;
    }

    return true;
  }
}]);

angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
  .factory('$position', ['$document', '$window', function ($document, $window) {

    function getStyle(el, cssprop) {
      if (el.currentStyle) { //IE
        return el.currentStyle[cssprop];
      } else if ($window.getComputedStyle) {
        return $window.getComputedStyle(el)[cssprop];
      }
      // finally try and get inline style
      return el.style[cssprop];
    }

    /**
     * Checks if a given element is statically positioned
     * @param element - raw DOM element
     */
    function isStaticPositioned(element) {
      return (getStyle(element, 'position') || 'static' ) === 'static';
    }

    /**
     * returns the closest, non-statically positioned parentOffset of a given element
     * @param element
     */
    var parentOffsetEl = function (element) {
      var docDomEl = $document[0];
      var offsetParent = element.offsetParent || docDomEl;
      while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
        offsetParent = offsetParent.offsetParent;
      }
      return offsetParent || docDomEl;
    };

    return {
      /**
       * Provides read-only equivalent of jQuery's position function:
       * http://api.jquery.com/position/
       */
      position: function (element) {
        var elBCR = this.offset(element);
        var offsetParentBCR = { top: 0, left: 0 };
        var offsetParentEl = parentOffsetEl(element[0]);
        if (offsetParentEl != $document[0]) {
          offsetParentBCR = this.offset(angular.element(offsetParentEl));
          offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
          offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
        }

        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: elBCR.top - offsetParentBCR.top,
          left: elBCR.left - offsetParentBCR.left
        };
      },

      /**
       * Provides read-only equivalent of jQuery's offset function:
       * http://api.jquery.com/offset/
       */
      offset: function (element) {
        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
          left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
        };
      },

      /**
       * Provides coordinates for the targetEl in relation to hostEl
       */
      positionElements: function (hostEl, targetEl, positionStr, appendToBody) {

        var positionStrParts = positionStr.split('-');
        var pos0 = positionStrParts[0], pos1 = positionStrParts[1] || 'center';

        var hostElPos,
          targetElWidth,
          targetElHeight,
          targetElPos;

        hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

        targetElWidth = targetEl.prop('offsetWidth');
        targetElHeight = targetEl.prop('offsetHeight');

        var shiftWidth = {
          center: function () {
            return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
          },
          left: function () {
            return hostElPos.left;
          },
          right: function () {
            return hostElPos.left + hostElPos.width;
          }
        };

        var shiftHeight = {
          center: function () {
            return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
          },
          top: function () {
            return hostElPos.top;
          },
          bottom: function () {
            return hostElPos.top + hostElPos.height;
          }
        };

        switch (pos0) {
          case 'right':
            targetElPos = {
              top: shiftHeight[pos1](),
              left: shiftWidth[pos0]()
            };
            break;
          case 'left':
            targetElPos = {
              top: shiftHeight[pos1](),
              left: hostElPos.left - targetElWidth
            };
            break;
          case 'bottom':
            targetElPos = {
              top: shiftHeight[pos0](),
              left: shiftWidth[pos1]()
            };
            break;
          default:
            targetElPos = {
              top: hostElPos.top - targetElHeight,
              left: shiftWidth[pos1]()
            };
            break;
        }

        return targetElPos;
      }
    };
  }]);

angular.module('ui.bootstrap.datepicker', ['ui.bootstrap.dateparser', 'ui.bootstrap.position'])

.constant('datepickerConfig', {
  formatDay: 'dd',
  formatMonth: 'MMMM',
  formatYear: 'yyyy',
  formatDayHeader: 'EEE',
  formatDayTitle: 'MMMM yyyy',
  formatMonthTitle: 'yyyy',
  datepickerMode: 'day',
  minMode: 'day',
  maxMode: 'year',
  showWeeks: true,
  startingDay: 0,
  yearRange: 20,
  minDate: null,
  maxDate: null
})

.controller('DatepickerController', ['$scope', '$attrs', '$parse', '$interpolate', '$timeout', '$log', 'dateFilter', 'datepickerConfig', function($scope, $attrs, $parse, $interpolate, $timeout, $log, dateFilter, datepickerConfig) {
  var self = this,
      ngModelCtrl = { $setViewValue: angular.noop }; // nullModelCtrl;

  // Modes chain
  this.modes = ['day', 'month', 'year'];

  // Configuration attributes
  angular.forEach(['formatDay', 'formatMonth', 'formatYear', 'formatDayHeader', 'formatDayTitle', 'formatMonthTitle',
                   'minMode', 'maxMode', 'showWeeks', 'startingDay', 'yearRange'], function( key, index ) {
    self[key] = angular.isDefined($attrs[key]) ? (index < 8 ? $interpolate($attrs[key])($scope.$parent) : $scope.$parent.$eval($attrs[key])) : datepickerConfig[key];
  });

  // Watchable attributes
  angular.forEach(['minDate', 'maxDate'], function( key ) {
    if ( $attrs[key] ) {
      $scope.$parent.$watch($parse($attrs[key]), function(value) {
        self[key] = value ? new Date(value) : null;
        self.refreshView();
      });
    } else {
      self[key] = datepickerConfig[key] ? new Date(datepickerConfig[key]) : null;
    }
  });

  $scope.datepickerMode = $scope.datepickerMode || datepickerConfig.datepickerMode;
  $scope.uniqueId = 'datepicker-' + $scope.$id + '-' + Math.floor(Math.random() * 10000);
  this.activeDate = angular.isDefined($attrs.initDate) ? $scope.$parent.$eval($attrs.initDate) : new Date();

  $scope.isActive = function(dateObject) {
    if (self.compare(dateObject.date, self.activeDate) === 0) {
      $scope.activeDateId = dateObject.uid;
      return true;
    }
    return false;
  };

  this.init = function( ngModelCtrl_ ) {
    ngModelCtrl = ngModelCtrl_;

    ngModelCtrl.$render = function() {
      self.render();
    };
  };

  this.render = function() {
    if ( ngModelCtrl.$modelValue ) {
      var date = new Date( ngModelCtrl.$modelValue ),
          isValid = !isNaN(date);

      if ( isValid ) {
        this.activeDate = date;
      } else {
        $log.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
      }
      ngModelCtrl.$setValidity('date', isValid);
    }
    this.refreshView();
  };

  this.refreshView = function() {
    if ( this.element ) {
      this._refreshView();

      var date = ngModelCtrl.$modelValue ? new Date(ngModelCtrl.$modelValue) : null;
      ngModelCtrl.$setValidity('date-disabled', !date || (this.element && !this.isDisabled(date)));
    }
  };

  this.createDateObject = function(date, format) {
    var model = ngModelCtrl.$modelValue ? new Date(ngModelCtrl.$modelValue) : null;
    return {
      date: date,
      label: dateFilter(date, format),
      selected: model && this.compare(date, model) === 0,
      disabled: this.isDisabled(date),
      current: this.compare(date, new Date()) === 0
    };
  };

  this.isDisabled = function( date ) {
    return ((this.minDate && this.compare(date, this.minDate) < 0) || (this.maxDate && this.compare(date, this.maxDate) > 0) || ($attrs.dateDisabled && $scope.dateDisabled({date: date, mode: $scope.datepickerMode})));
  };

  // Split array into smaller arrays
  this.split = function(arr, size) {
    var arrays = [];
    while (arr.length > 0) {
      arrays.push(arr.splice(0, size));
    }
    return arrays;
  };

  $scope.select = function( date ) {
    if ( $scope.datepickerMode === self.minMode ) {
      var dt = ngModelCtrl.$modelValue ? new Date( ngModelCtrl.$modelValue ) : new Date(0, 0, 0, 0, 0, 0, 0);
      dt.setFullYear( date.getFullYear(), date.getMonth(), date.getDate() );
      ngModelCtrl.$setViewValue( dt );
      ngModelCtrl.$render();
    } else {
      self.activeDate = date;
      $scope.datepickerMode = self.modes[ self.modes.indexOf( $scope.datepickerMode ) - 1 ];
    }
  };

  $scope.move = function( direction ) {
    var year = self.activeDate.getFullYear() + direction * (self.step.years || 0),
        month = self.activeDate.getMonth() + direction * (self.step.months || 0);
    self.activeDate.setFullYear(year, month, 1);
    self.refreshView();
  };

  $scope.toggleMode = function( direction ) {
    direction = direction || 1;

    if (($scope.datepickerMode === self.maxMode && direction === 1) || ($scope.datepickerMode === self.minMode && direction === -1)) {
      return;
    }

    $scope.datepickerMode = self.modes[ self.modes.indexOf( $scope.datepickerMode ) + direction ];
  };

  // Key event mapper
  $scope.keys = { 13:'enter', 32:'space', 33:'pageup', 34:'pagedown', 35:'end', 36:'home', 37:'left', 38:'up', 39:'right', 40:'down' };

  var focusElement = function() {
    $timeout(function() {
      self.element[0].focus();
    }, 0 , false);
  };

  // Listen for focus requests from popup directive
  $scope.$on('datepicker.focus', focusElement);

  $scope.keydown = function( evt ) {
    var key = $scope.keys[evt.which];

    if ( !key || evt.shiftKey || evt.altKey ) {
      return;
    }

    evt.preventDefault();
    evt.stopPropagation();

    if (key === 'enter' || key === 'space') {
      if ( self.isDisabled(self.activeDate)) {
        return; // do nothing
      }
      $scope.select(self.activeDate);
      focusElement();
    } else if (evt.ctrlKey && (key === 'up' || key === 'down')) {
      $scope.toggleMode(key === 'up' ? 1 : -1);
      focusElement();
    } else {
      self.handleKeyDown(key, evt);
      self.refreshView();
    }
  };
}])

.directive( 'datepicker', function () {
  return {
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/datepicker/datepicker.html',
    scope: {
      datepickerMode: '=?',
      dateDisabled: '&'
    },
    require: ['datepicker', '?^ngModel'],
    controller: 'DatepickerController',
    link: function(scope, element, attrs, ctrls) {
      var datepickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if ( ngModelCtrl ) {
        datepickerCtrl.init( ngModelCtrl );
      }
    }
  };
})

.directive('daypicker', ['dateFilter', function (dateFilter) {
  return {
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/datepicker/day.html',
    require: '^datepicker',
    link: function(scope, element, attrs, ctrl) {
      scope.showWeeks = ctrl.showWeeks;

      ctrl.step = { months: 1 };
      ctrl.element = element;

      var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      function getDaysInMonth( year, month ) {
        return ((month === 1) && (year % 4 === 0) && ((year % 100 !== 0) || (year % 400 === 0))) ? 29 : DAYS_IN_MONTH[month];
      }

      function getDates(startDate, n) {
        var dates = new Array(n), current = new Date(startDate), i = 0;
        current.setHours(12); // Prevent repeated dates because of timezone bug
        while ( i < n ) {
          dates[i++] = new Date(current);
          current.setDate( current.getDate() + 1 );
        }
        return dates;
      }

      ctrl._refreshView = function() {
        var year = ctrl.activeDate.getFullYear(),
          month = ctrl.activeDate.getMonth(),
          firstDayOfMonth = new Date(year, month, 1),
          difference = ctrl.startingDay - firstDayOfMonth.getDay(),
          numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : - difference,
          firstDate = new Date(firstDayOfMonth);

        if ( numDisplayedFromPreviousMonth > 0 ) {
          firstDate.setDate( - numDisplayedFromPreviousMonth + 1 );
        }

        // 42 is the number of days on a six-month calendar
        var days = getDates(firstDate, 42);
        for (var i = 0; i < 42; i ++) {
          days[i] = angular.extend(ctrl.createDateObject(days[i], ctrl.formatDay), {
            secondary: days[i].getMonth() !== month,
            uid: scope.uniqueId + '-' + i
          });
        }

        scope.labels = new Array(7);
        for (var j = 0; j < 7; j++) {
          scope.labels[j] = {
            abbr: dateFilter(days[j].date, ctrl.formatDayHeader),
            full: dateFilter(days[j].date, 'EEEE')
          };
        }

        scope.title = dateFilter(ctrl.activeDate, ctrl.formatDayTitle);
        scope.rows = ctrl.split(days, 7);

        if ( scope.showWeeks ) {
          scope.weekNumbers = [];
          var weekNumber = getISO8601WeekNumber( scope.rows[0][0].date ),
              numWeeks = scope.rows.length;
          while( scope.weekNumbers.push(weekNumber++) < numWeeks ) {}
        }
      };

      ctrl.compare = function(date1, date2) {
        return (new Date( date1.getFullYear(), date1.getMonth(), date1.getDate() ) - new Date( date2.getFullYear(), date2.getMonth(), date2.getDate() ) );
      };

      function getISO8601WeekNumber(date) {
        var checkDate = new Date(date);
        checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
        var time = checkDate.getTime();
        checkDate.setMonth(0); // Compare with Jan 1
        checkDate.setDate(1);
        return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
      }

      ctrl.handleKeyDown = function( key, evt ) {
        var date = ctrl.activeDate.getDate();

        if (key === 'left') {
          date = date - 1;   // up
        } else if (key === 'up') {
          date = date - 7;   // down
        } else if (key === 'right') {
          date = date + 1;   // down
        } else if (key === 'down') {
          date = date + 7;
        } else if (key === 'pageup' || key === 'pagedown') {
          var month = ctrl.activeDate.getMonth() + (key === 'pageup' ? - 1 : 1);
          ctrl.activeDate.setMonth(month, 1);
          date = Math.min(getDaysInMonth(ctrl.activeDate.getFullYear(), ctrl.activeDate.getMonth()), date);
        } else if (key === 'home') {
          date = 1;
        } else if (key === 'end') {
          date = getDaysInMonth(ctrl.activeDate.getFullYear(), ctrl.activeDate.getMonth());
        }
        ctrl.activeDate.setDate(date);
      };

      ctrl.refreshView();
    }
  };
}])

.directive('monthpicker', ['dateFilter', function (dateFilter) {
  return {
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/datepicker/month.html',
    require: '^datepicker',
    link: function(scope, element, attrs, ctrl) {
      ctrl.step = { years: 1 };
      ctrl.element = element;

      ctrl._refreshView = function() {
        var months = new Array(12),
            year = ctrl.activeDate.getFullYear();

        for ( var i = 0; i < 12; i++ ) {
          months[i] = angular.extend(ctrl.createDateObject(new Date(year, i, 1), ctrl.formatMonth), {
            uid: scope.uniqueId + '-' + i
          });
        }

        scope.title = dateFilter(ctrl.activeDate, ctrl.formatMonthTitle);
        scope.rows = ctrl.split(months, 3);
      };

      ctrl.compare = function(date1, date2) {
        return new Date( date1.getFullYear(), date1.getMonth() ) - new Date( date2.getFullYear(), date2.getMonth() );
      };

      ctrl.handleKeyDown = function( key, evt ) {
        var date = ctrl.activeDate.getMonth();

        if (key === 'left') {
          date = date - 1;   // up
        } else if (key === 'up') {
          date = date - 3;   // down
        } else if (key === 'right') {
          date = date + 1;   // down
        } else if (key === 'down') {
          date = date + 3;
        } else if (key === 'pageup' || key === 'pagedown') {
          var year = ctrl.activeDate.getFullYear() + (key === 'pageup' ? - 1 : 1);
          ctrl.activeDate.setFullYear(year);
        } else if (key === 'home') {
          date = 0;
        } else if (key === 'end') {
          date = 11;
        }
        ctrl.activeDate.setMonth(date);
      };

      ctrl.refreshView();
    }
  };
}])

.directive('yearpicker', ['dateFilter', function (dateFilter) {
  return {
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/datepicker/year.html',
    require: '^datepicker',
    link: function(scope, element, attrs, ctrl) {
      var range = ctrl.yearRange;

      ctrl.step = { years: range };
      ctrl.element = element;

      function getStartingYear( year ) {
        return parseInt((year - 1) / range, 10) * range + 1;
      }

      ctrl._refreshView = function() {
        var years = new Array(range);

        for ( var i = 0, start = getStartingYear(ctrl.activeDate.getFullYear()); i < range; i++ ) {
          years[i] = angular.extend(ctrl.createDateObject(new Date(start + i, 0, 1), ctrl.formatYear), {
            uid: scope.uniqueId + '-' + i
          });
        }

        scope.title = [years[0].label, years[range - 1].label].join(' - ');
        scope.rows = ctrl.split(years, 5);
      };

      ctrl.compare = function(date1, date2) {
        return date1.getFullYear() - date2.getFullYear();
      };

      ctrl.handleKeyDown = function( key, evt ) {
        var date = ctrl.activeDate.getFullYear();

        if (key === 'left') {
          date = date - 1;   // up
        } else if (key === 'up') {
          date = date - 5;   // down
        } else if (key === 'right') {
          date = date + 1;   // down
        } else if (key === 'down') {
          date = date + 5;
        } else if (key === 'pageup' || key === 'pagedown') {
          date += (key === 'pageup' ? - 1 : 1) * ctrl.step.years;
        } else if (key === 'home') {
          date = getStartingYear( ctrl.activeDate.getFullYear() );
        } else if (key === 'end') {
          date = getStartingYear( ctrl.activeDate.getFullYear() ) + range - 1;
        }
        ctrl.activeDate.setFullYear(date);
      };

      ctrl.refreshView();
    }
  };
}])

.constant('datepickerPopupConfig', {
  datepickerPopup: 'yyyy-MM-dd',
  currentText: 'Today',
  clearText: 'Clear',
  closeText: 'Done',
  closeOnDateSelection: true,
  appendToBody: false,
  showButtonBar: true
})

.directive('datepickerPopup', ['$compile', '$parse', '$document', '$position', 'dateFilter', 'dateParser', 'datepickerPopupConfig',
function ($compile, $parse, $document, $position, dateFilter, dateParser, datepickerPopupConfig) {
  return {
    restrict: 'EA',
    require: 'ngModel',
    scope: {
      isOpen: '=?',
      currentText: '@',
      clearText: '@',
      closeText: '@',
      dateDisabled: '&'
    },
    link: function(scope, element, attrs, ngModel) {
      var dateFormat,
          closeOnDateSelection = angular.isDefined(attrs.closeOnDateSelection) ? scope.$parent.$eval(attrs.closeOnDateSelection) : datepickerPopupConfig.closeOnDateSelection,
          appendToBody = angular.isDefined(attrs.datepickerAppendToBody) ? scope.$parent.$eval(attrs.datepickerAppendToBody) : datepickerPopupConfig.appendToBody;

      scope.showButtonBar = angular.isDefined(attrs.showButtonBar) ? scope.$parent.$eval(attrs.showButtonBar) : datepickerPopupConfig.showButtonBar;

      scope.getText = function( key ) {
        return scope[key + 'Text'] || datepickerPopupConfig[key + 'Text'];
      };

      attrs.$observe('datepickerPopup', function(value) {
          dateFormat = value || datepickerPopupConfig.datepickerPopup;
          ngModel.$render();
      });

      // popup element used to display calendar
      var popupEl = angular.element('<div datepicker-popup-wrap><div datepicker></div></div>');
      popupEl.attr({
        'ng-model': 'date',
        'ng-change': 'dateSelection()'
      });

      function cameltoDash( string ){
        return string.replace(/([A-Z])/g, function($1) { return '-' + $1.toLowerCase(); });
      }

      // datepicker element
      var datepickerEl = angular.element(popupEl.children()[0]);
      if ( attrs.datepickerOptions ) {
        angular.forEach(scope.$parent.$eval(attrs.datepickerOptions), function( value, option ) {
          datepickerEl.attr( cameltoDash(option), value );
        });
      }

      angular.forEach(['minDate', 'maxDate'], function( key ) {
        if ( attrs[key] ) {
          scope.$parent.$watch($parse(attrs[key]), function(value){
            scope[key] = value;
          });
          datepickerEl.attr(cameltoDash(key), key);
        }
      });
      if (attrs.dateDisabled) {
        datepickerEl.attr('date-disabled', 'dateDisabled({ date: date, mode: mode })');
      }

      function parseDate(viewValue) {
        if (!viewValue) {
          ngModel.$setValidity('date', true);
          return null;
        } else if (angular.isDate(viewValue) && !isNaN(viewValue)) {
          ngModel.$setValidity('date', true);
          return viewValue;
        } else if (angular.isString(viewValue)) {
          var date = dateParser.parse(viewValue, dateFormat) || new Date(viewValue);
          if (isNaN(date)) {
            ngModel.$setValidity('date', false);
            return undefined;
          } else {
            ngModel.$setValidity('date', true);
            return date;
          }
        } else {
          ngModel.$setValidity('date', false);
          return undefined;
        }
      }
      ngModel.$parsers.unshift(parseDate);

      // Inner change
      scope.dateSelection = function(dt) {
        if (angular.isDefined(dt)) {
          scope.date = dt;
        }
        ngModel.$setViewValue(scope.date);
        ngModel.$render();

        if ( closeOnDateSelection ) {
          scope.isOpen = false;
          element[0].focus();
        }
      };

      element.bind('input change keyup', function() {
        scope.$apply(function() {
          scope.date = ngModel.$modelValue;
        });
      });

      // Outter change
      ngModel.$render = function() {
        var date = ngModel.$viewValue ? dateFilter(ngModel.$viewValue, dateFormat) : '';
        element.val(date);
        scope.date = parseDate( ngModel.$modelValue );
      };

      var documentClickBind = function(event) {
        if (scope.isOpen && event.target !== element[0]) {
          scope.$apply(function() {
            scope.isOpen = false;
          });
        }
      };

      var keydown = function(evt, noApply) {
        scope.keydown(evt);
      };
      element.bind('keydown', keydown);

      scope.keydown = function(evt) {
        if (evt.which === 27) {
          evt.preventDefault();
          evt.stopPropagation();
          scope.close();
        } else if (evt.which === 40 && !scope.isOpen) {
          scope.isOpen = true;
        }
      };

      scope.$watch('isOpen', function(value) {
        if (value) {
          scope.$broadcast('datepicker.focus');
          scope.position = appendToBody ? $position.offset(element) : $position.position(element);
          scope.position.top = scope.position.top + element.prop('offsetHeight');

          $document.bind('click', documentClickBind);
        } else {
          $document.unbind('click', documentClickBind);
        }
      });

      scope.select = function( date ) {
        if (date === 'today') {
          var today = new Date();
          if (angular.isDate(ngModel.$modelValue)) {
            date = new Date(ngModel.$modelValue);
            date.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
          } else {
            date = new Date(today.setHours(0, 0, 0, 0));
          }
        }
        scope.dateSelection( date );
      };

      scope.close = function() {
        scope.isOpen = false;
        element[0].focus();
      };

      var $popup = $compile(popupEl)(scope);
      if ( appendToBody ) {
        $document.find('body').append($popup);
      } else {
        element.after($popup);
      }

      scope.$on('$destroy', function() {
        $popup.remove();
        element.unbind('keydown', keydown);
        $document.unbind('click', documentClickBind);
      });
    }
  };
}])

.directive('datepickerPopupWrap', function() {
  return {
    restrict:'EA',
    replace: true,
    transclude: true,
    templateUrl: 'template/datepicker/popup.html',
    link:function (scope, element, attrs) {
      element.bind('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
      });
    }
  };
});

angular.module('ui.bootstrap.dropdown', [])

.constant('dropdownConfig', {
  openClass: 'open'
})

.service('dropdownService', ['$document', function($document) {
  var openScope = null;

  this.open = function( dropdownScope ) {
    if ( !openScope ) {
      $document.bind('click', closeDropdown);
      $document.bind('keydown', escapeKeyBind);
    }

    if ( openScope && openScope !== dropdownScope ) {
        openScope.isOpen = false;
    }

    openScope = dropdownScope;
  };

  this.close = function( dropdownScope ) {
    if ( openScope === dropdownScope ) {
      openScope = null;
      $document.unbind('click', closeDropdown);
      $document.unbind('keydown', escapeKeyBind);
    }
  };

  var closeDropdown = function( evt ) {
    if (evt && evt.isDefaultPrevented()) {
        return;
    }

    openScope.$apply(function() {
      openScope.isOpen = false;
    });
  };

  var escapeKeyBind = function( evt ) {
    if ( evt.which === 27 ) {
      openScope.focusToggleElement();
      closeDropdown();
    }
  };
}])

.controller('DropdownController', ['$scope', '$attrs', '$parse', 'dropdownConfig', 'dropdownService', '$animate', function($scope, $attrs, $parse, dropdownConfig, dropdownService, $animate) {
  var self = this,
      scope = $scope.$new(), // create a child scope so we are not polluting original one
      openClass = dropdownConfig.openClass,
      getIsOpen,
      setIsOpen = angular.noop,
      toggleInvoker = $attrs.onToggle ? $parse($attrs.onToggle) : angular.noop;

  this.init = function( element ) {
    self.$element = element;

    if ( $attrs.isOpen ) {
      getIsOpen = $parse($attrs.isOpen);
      setIsOpen = getIsOpen.assign;

      $scope.$watch(getIsOpen, function(value) {
        scope.isOpen = !!value;
      });
    }
  };

  this.toggle = function( open ) {
    return scope.isOpen = arguments.length ? !!open : !scope.isOpen;
  };

  // Allow other directives to watch status
  this.isOpen = function() {
    return scope.isOpen;
  };

  scope.focusToggleElement = function() {
    if ( self.toggleElement ) {
      self.toggleElement[0].focus();
    }
  };

  scope.$watch('isOpen', function( isOpen, wasOpen ) {
    $animate[isOpen ? 'addClass' : 'removeClass'](self.$element, openClass);

    if ( isOpen ) {
      scope.focusToggleElement();
      dropdownService.open( scope );
    } else {
      dropdownService.close( scope );
    }

    setIsOpen($scope, isOpen);
    if (angular.isDefined(isOpen) && isOpen !== wasOpen) {
      toggleInvoker($scope, { open: !!isOpen });
    }
  });

  $scope.$on('$locationChangeSuccess', function() {
    scope.isOpen = false;
  });

  $scope.$on('$destroy', function() {
    scope.$destroy();
  });
}])

.directive('dropdown', function() {
  return {
    restrict: 'CA',
    controller: 'DropdownController',
    link: function(scope, element, attrs, dropdownCtrl) {
      dropdownCtrl.init( element );
    }
  };
})

.directive('dropdownToggle', function() {
  return {
    restrict: 'CA',
    require: '?^dropdown',
    link: function(scope, element, attrs, dropdownCtrl) {
      if ( !dropdownCtrl ) {
        return;
      }

      dropdownCtrl.toggleElement = element;

      var toggleDropdown = function(event) {
        event.preventDefault();

        if ( !element.hasClass('disabled') && !attrs.disabled ) {
          scope.$apply(function() {
            dropdownCtrl.toggle();
          });
        }
      };

      element.bind('click', toggleDropdown);

      // WAI-ARIA
      element.attr({ 'aria-haspopup': true, 'aria-expanded': false });
      scope.$watch(dropdownCtrl.isOpen, function( isOpen ) {
        element.attr('aria-expanded', !!isOpen);
      });

      scope.$on('$destroy', function() {
        element.unbind('click', toggleDropdown);
      });
    }
  };
});

angular.module('ui.bootstrap.modal', ['ui.bootstrap.transition'])

/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
 * elements in the LIFO order
 */
  .factory('$$stackedMap', function () {
    return {
      createNew: function () {
        var stack = [];

        return {
          add: function (key, value) {
            stack.push({
              key: key,
              value: value
            });
          },
          get: function (key) {
            for (var i = 0; i < stack.length; i++) {
              if (key == stack[i].key) {
                return stack[i];
              }
            }
          },
          keys: function() {
            var keys = [];
            for (var i = 0; i < stack.length; i++) {
              keys.push(stack[i].key);
            }
            return keys;
          },
          top: function () {
            return stack[stack.length - 1];
          },
          remove: function (key) {
            var idx = -1;
            for (var i = 0; i < stack.length; i++) {
              if (key == stack[i].key) {
                idx = i;
                break;
              }
            }
            return stack.splice(idx, 1)[0];
          },
          removeTop: function () {
            return stack.splice(stack.length - 1, 1)[0];
          },
          length: function () {
            return stack.length;
          }
        };
      }
    };
  })

/**
 * A helper directive for the $modal service. It creates a backdrop element.
 */
  .directive('modalBackdrop', ['$timeout', function ($timeout) {
    return {
      restrict: 'EA',
      replace: true,
      templateUrl: 'template/modal/backdrop.html',
      link: function (scope) {

        scope.animate = false;

        //trigger CSS transitions
        $timeout(function () {
          scope.animate = true;
        });
      }
    };
  }])

  .directive('modalWindow', ['$modalStack', '$timeout', function ($modalStack, $timeout) {
    return {
      restrict: 'EA',
      scope: {
        index: '@',
        animate: '='
      },
      replace: true,
      transclude: true,
      templateUrl: function(tElement, tAttrs) {
        return tAttrs.templateUrl || 'template/modal/window.html';
      },
      link: function (scope, element, attrs) {
        element.addClass(attrs.windowClass || '');
        scope.size = attrs.size;

        $timeout(function () {
          // trigger CSS transitions
          scope.animate = true;
          // focus a freshly-opened modal
          element[0].focus();
        });

        scope.close = function (evt) {
          var modal = $modalStack.getTop();
          if (modal && modal.value.backdrop && modal.value.backdrop != 'static' && (evt.target === evt.currentTarget)) {
            evt.preventDefault();
            evt.stopPropagation();
            $modalStack.dismiss(modal.key, 'backdrop click');
          }
        };
      }
    };
  }])

  .factory('$modalStack', ['$transition', '$timeout', '$document', '$compile', '$rootScope', '$$stackedMap',
    function ($transition, $timeout, $document, $compile, $rootScope, $$stackedMap) {

      var OPENED_MODAL_CLASS = 'modal-open';

      var backdropDomEl, backdropScope;
      var openedWindows = $$stackedMap.createNew();
      var $modalStack = {};

      function backdropIndex() {
        var topBackdropIndex = -1;
        var opened = openedWindows.keys();
        for (var i = 0; i < opened.length; i++) {
          if (openedWindows.get(opened[i]).value.backdrop) {
            topBackdropIndex = i;
          }
        }
        return topBackdropIndex;
      }

      $rootScope.$watch(backdropIndex, function(newBackdropIndex){
        if (backdropScope) {
          backdropScope.index = newBackdropIndex;
        }
      });

      function removeModalWindow(modalInstance) {

        var body = $document.find('body').eq(0);
        var modalWindow = openedWindows.get(modalInstance).value;

        //clean up the stack
        openedWindows.remove(modalInstance);

        //remove window DOM element
        removeAfterAnimate(modalWindow.modalDomEl, modalWindow.modalScope, 300, function() {
          modalWindow.modalScope.$destroy();
          body.toggleClass(OPENED_MODAL_CLASS, openedWindows.length() > 0);
          checkRemoveBackdrop();
        });
      }

      function checkRemoveBackdrop() {
          //remove backdrop if no longer needed
          if (backdropDomEl && backdropIndex() == -1) {
            var backdropScopeRef = backdropScope;
            removeAfterAnimate(backdropDomEl, backdropScope, 150, function () {
              backdropScopeRef.$destroy();
              backdropScopeRef = null;
            });
            backdropDomEl = undefined;
            backdropScope = undefined;
          }
      }

      function removeAfterAnimate(domEl, scope, emulateTime, done) {
        // Closing animation
        scope.animate = false;

        var transitionEndEventName = $transition.transitionEndEventName;
        if (transitionEndEventName) {
          // transition out
          var timeout = $timeout(afterAnimating, emulateTime);

          domEl.bind(transitionEndEventName, function () {
            $timeout.cancel(timeout);
            afterAnimating();
            scope.$apply();
          });
        } else {
          // Ensure this call is async
          $timeout(afterAnimating, 0);
        }

        function afterAnimating() {
          if (afterAnimating.done) {
            return;
          }
          afterAnimating.done = true;

          domEl.remove();
          if (done) {
            done();
          }
        }
      }

      $document.bind('keydown', function (evt) {
        var modal;

        if (evt.which === 27) {
          modal = openedWindows.top();
          if (modal && modal.value.keyboard) {
            evt.preventDefault();
            $rootScope.$apply(function () {
              $modalStack.dismiss(modal.key, 'escape key press');
            });
          }
        }
      });

      $modalStack.open = function (modalInstance, modal) {

        openedWindows.add(modalInstance, {
          deferred: modal.deferred,
          modalScope: modal.scope,
          backdrop: modal.backdrop,
          keyboard: modal.keyboard
        });

        var body = $document.find('body').eq(0),
            currBackdropIndex = backdropIndex();

        if (currBackdropIndex >= 0 && !backdropDomEl) {
          backdropScope = $rootScope.$new(true);
          backdropScope.index = currBackdropIndex;
          backdropDomEl = $compile('<div modal-backdrop></div>')(backdropScope);
          body.append(backdropDomEl);
        }

        var angularDomEl = angular.element('<div modal-window></div>');
        angularDomEl.attr({
          'template-url': modal.windowTemplateUrl,
          'window-class': modal.windowClass,
          'size': modal.size,
          'index': openedWindows.length() - 1,
          'animate': 'animate'
        }).html(modal.content);

        var modalDomEl = $compile(angularDomEl)(modal.scope);
        openedWindows.top().value.modalDomEl = modalDomEl;
        body.append(modalDomEl);
        body.addClass(OPENED_MODAL_CLASS);
      };

      $modalStack.close = function (modalInstance, result) {
        var modalWindow = openedWindows.get(modalInstance).value;
        if (modalWindow) {
          modalWindow.deferred.resolve(result);
          removeModalWindow(modalInstance);
        }
      };

      $modalStack.dismiss = function (modalInstance, reason) {
        var modalWindow = openedWindows.get(modalInstance).value;
        if (modalWindow) {
          modalWindow.deferred.reject(reason);
          removeModalWindow(modalInstance);
        }
      };

      $modalStack.dismissAll = function (reason) {
        var topModal = this.getTop();
        while (topModal) {
          this.dismiss(topModal.key, reason);
          topModal = this.getTop();
        }
      };

      $modalStack.getTop = function () {
        return openedWindows.top();
      };

      return $modalStack;
    }])

  .provider('$modal', function () {

    var $modalProvider = {
      options: {
        backdrop: true, //can be also false or 'static'
        keyboard: true
      },
      $get: ['$injector', '$rootScope', '$q', '$http', '$templateCache', '$controller', '$modalStack',
        function ($injector, $rootScope, $q, $http, $templateCache, $controller, $modalStack) {

          var $modal = {};

          function getTemplatePromise(options) {
            return options.template ? $q.when(options.template) :
              $http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
                return result.data;
              });
          }

          function getResolvePromises(resolves) {
            var promisesArr = [];
            angular.forEach(resolves, function (value, key) {
              if (angular.isFunction(value) || angular.isArray(value)) {
                promisesArr.push($q.when($injector.invoke(value)));
              }
            });
            return promisesArr;
          }

          $modal.open = function (modalOptions) {

            var modalResultDeferred = $q.defer();
            var modalOpenedDeferred = $q.defer();

            //prepare an instance of a modal to be injected into controllers and returned to a caller
            var modalInstance = {
              result: modalResultDeferred.promise,
              opened: modalOpenedDeferred.promise,
              close: function (result) {
                $modalStack.close(modalInstance, result);
              },
              dismiss: function (reason) {
                $modalStack.dismiss(modalInstance, reason);
              }
            };

            //merge and clean up options
            modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
            modalOptions.resolve = modalOptions.resolve || {};

            //verify options
            if (!modalOptions.template && !modalOptions.templateUrl) {
              throw new Error('One of template or templateUrl options is required.');
            }

            var templateAndResolvePromise =
              $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));


            templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

              var modalScope = (modalOptions.scope || $rootScope).$new();
              modalScope.$close = modalInstance.close;
              modalScope.$dismiss = modalInstance.dismiss;

              var ctrlInstance, ctrlLocals = {};
              var resolveIter = 1;

              //controllers
              if (modalOptions.controller) {
                ctrlLocals.$scope = modalScope;
                ctrlLocals.$modalInstance = modalInstance;
                angular.forEach(modalOptions.resolve, function (value, key) {
                  ctrlLocals[key] = tplAndVars[resolveIter++];
                });

                ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
              }

              $modalStack.open(modalInstance, {
                scope: modalScope,
                deferred: modalResultDeferred,
                content: tplAndVars[0],
                backdrop: modalOptions.backdrop,
                keyboard: modalOptions.keyboard,
                windowClass: modalOptions.windowClass,
                windowTemplateUrl: modalOptions.windowTemplateUrl,
                size: modalOptions.size
              });

            }, function resolveError(reason) {
              modalResultDeferred.reject(reason);
            });

            templateAndResolvePromise.then(function () {
              modalOpenedDeferred.resolve(true);
            }, function () {
              modalOpenedDeferred.reject(false);
            });

            return modalInstance;
          };

          return $modal;
        }]
    };

    return $modalProvider;
  });

angular.module('ui.bootstrap.pagination', [])

.controller('PaginationController', ['$scope', '$attrs', '$parse', function ($scope, $attrs, $parse) {
  var self = this,
      ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
      setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;

  this.init = function(ngModelCtrl_, config) {
    ngModelCtrl = ngModelCtrl_;
    this.config = config;

    ngModelCtrl.$render = function() {
      self.render();
    };

    if ($attrs.itemsPerPage) {
      $scope.$parent.$watch($parse($attrs.itemsPerPage), function(value) {
        self.itemsPerPage = parseInt(value, 10);
        $scope.totalPages = self.calculateTotalPages();
      });
    } else {
      this.itemsPerPage = config.itemsPerPage;
    }
  };

  this.calculateTotalPages = function() {
    var totalPages = this.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / this.itemsPerPage);
    return Math.max(totalPages || 0, 1);
  };

  this.render = function() {
    $scope.page = parseInt(ngModelCtrl.$viewValue, 10) || 1;
  };

  $scope.selectPage = function(page) {
    if ( $scope.page !== page && page > 0 && page <= $scope.totalPages) {
      ngModelCtrl.$setViewValue(page);
      ngModelCtrl.$render();
    }
  };

  $scope.getText = function( key ) {
    return $scope[key + 'Text'] || self.config[key + 'Text'];
  };
  $scope.noPrevious = function() {
    return $scope.page === 1;
  };
  $scope.noNext = function() {
    return $scope.page === $scope.totalPages;
  };

  $scope.$watch('totalItems', function() {
    $scope.totalPages = self.calculateTotalPages();
  });

  $scope.$watch('totalPages', function(value) {
    setNumPages($scope.$parent, value); // Readonly variable

    if ( $scope.page > value ) {
      $scope.selectPage(value);
    } else {
      ngModelCtrl.$render();
    }
  });
}])

.constant('paginationConfig', {
  itemsPerPage: 10,
  boundaryLinks: false,
  directionLinks: true,
  firstText: 'First',
  previousText: 'Previous',
  nextText: 'Next',
  lastText: 'Last',
  rotate: true
})

.directive('pagination', ['$parse', 'paginationConfig', function($parse, paginationConfig) {
  return {
    restrict: 'EA',
    scope: {
      totalItems: '=',
      firstText: '@',
      previousText: '@',
      nextText: '@',
      lastText: '@'
    },
    require: ['pagination', '?ngModel'],
    controller: 'PaginationController',
    templateUrl: 'template/pagination/pagination.html',
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if (!ngModelCtrl) {
         return; // do nothing if no ng-model
      }

      // Setup configuration parameters
      var maxSize = angular.isDefined(attrs.maxSize) ? scope.$parent.$eval(attrs.maxSize) : paginationConfig.maxSize,
          rotate = angular.isDefined(attrs.rotate) ? scope.$parent.$eval(attrs.rotate) : paginationConfig.rotate;
      scope.boundaryLinks = angular.isDefined(attrs.boundaryLinks) ? scope.$parent.$eval(attrs.boundaryLinks) : paginationConfig.boundaryLinks;
      scope.directionLinks = angular.isDefined(attrs.directionLinks) ? scope.$parent.$eval(attrs.directionLinks) : paginationConfig.directionLinks;

      paginationCtrl.init(ngModelCtrl, paginationConfig);

      if (attrs.maxSize) {
        scope.$parent.$watch($parse(attrs.maxSize), function(value) {
          maxSize = parseInt(value, 10);
          paginationCtrl.render();
        });
      }

      // Create page object used in template
      function makePage(number, text, isActive) {
        return {
          number: number,
          text: text,
          active: isActive
        };
      }

      function getPages(currentPage, totalPages) {
        var pages = [];

        // Default page limits
        var startPage = 1, endPage = totalPages;
        var isMaxSized = ( angular.isDefined(maxSize) && maxSize < totalPages );

        // recompute if maxSize
        if ( isMaxSized ) {
          if ( rotate ) {
            // Current page is displayed in the middle of the visible ones
            startPage = Math.max(currentPage - Math.floor(maxSize/2), 1);
            endPage   = startPage + maxSize - 1;

            // Adjust if limit is exceeded
            if (endPage > totalPages) {
              endPage   = totalPages;
              startPage = endPage - maxSize + 1;
            }
          } else {
            // Visible pages are paginated with maxSize
            startPage = ((Math.ceil(currentPage / maxSize) - 1) * maxSize) + 1;

            // Adjust last page if limit is exceeded
            endPage = Math.min(startPage + maxSize - 1, totalPages);
          }
        }

        // Add page number links
        for (var number = startPage; number <= endPage; number++) {
          var page = makePage(number, number, number === currentPage);
          pages.push(page);
        }

        // Add links to move between page sets
        if ( isMaxSized && ! rotate ) {
          if ( startPage > 1 ) {
            var previousPageSet = makePage(startPage - 1, '...', false);
            pages.unshift(previousPageSet);
          }

          if ( endPage < totalPages ) {
            var nextPageSet = makePage(endPage + 1, '...', false);
            pages.push(nextPageSet);
          }
        }

        return pages;
      }

      var originalRender = paginationCtrl.render;
      paginationCtrl.render = function() {
        originalRender();
        if (scope.page > 0 && scope.page <= scope.totalPages) {
          scope.pages = getPages(scope.page, scope.totalPages);
        }
      };
    }
  };
}])

.constant('pagerConfig', {
  itemsPerPage: 10,
  previousText: '« Previous',
  nextText: 'Next »',
  align: true
})

.directive('pager', ['pagerConfig', function(pagerConfig) {
  return {
    restrict: 'EA',
    scope: {
      totalItems: '=',
      previousText: '@',
      nextText: '@'
    },
    require: ['pager', '?ngModel'],
    controller: 'PaginationController',
    templateUrl: 'template/pagination/pager.html',
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if (!ngModelCtrl) {
         return; // do nothing if no ng-model
      }

      scope.align = angular.isDefined(attrs.align) ? scope.$parent.$eval(attrs.align) : pagerConfig.align;
      paginationCtrl.init(ngModelCtrl, pagerConfig);
    }
  };
}]);

/**
 * The following features are still outstanding: animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html tooltips, and selector delegation.
 */
angular.module( 'ui.bootstrap.tooltip', [ 'ui.bootstrap.position', 'ui.bootstrap.bindHtml' ] )

/**
 * The $tooltip service creates tooltip- and popover-like directives as well as
 * houses global options for them.
 */
.provider( '$tooltip', function () {
  // The default options tooltip and popover.
  var defaultOptions = {
    placement: 'top',
    animation: true,
    popupDelay: 0
  };

  // Default hide triggers for each show trigger
  var triggerMap = {
    'mouseenter': 'mouseleave',
    'click': 'click',
    'focus': 'blur'
  };

  // The options specified to the provider globally.
  var globalOptions = {};

  /**
   * `options({})` allows global configuration of all tooltips in the
   * application.
   *
   *   var app = angular.module( 'App', ['ui.bootstrap.tooltip'], function( $tooltipProvider ) {
   *     // place tooltips left instead of top by default
   *     $tooltipProvider.options( { placement: 'left' } );
   *   });
   */
  this.options = function( value ) {
    angular.extend( globalOptions, value );
  };

  /**
   * This allows you to extend the set of trigger mappings available. E.g.:
   *
   *   $tooltipProvider.setTriggers( 'openTrigger': 'closeTrigger' );
   */
  this.setTriggers = function setTriggers ( triggers ) {
    angular.extend( triggerMap, triggers );
  };

  /**
   * This is a helper function for translating camel-case to snake-case.
   */
  function snake_case(name){
    var regexp = /[A-Z]/g;
    var separator = '-';
    return name.replace(regexp, function(letter, pos) {
      return (pos ? separator : '') + letter.toLowerCase();
    });
  }

  /**
   * Returns the actual instance of the $tooltip service.
   * TODO support multiple triggers
   */
  this.$get = [ '$window', '$compile', '$timeout', '$parse', '$document', '$position', '$interpolate', function ( $window, $compile, $timeout, $parse, $document, $position, $interpolate ) {
    return function $tooltip ( type, prefix, defaultTriggerShow ) {
      var options = angular.extend( {}, defaultOptions, globalOptions );

      /**
       * Returns an object of show and hide triggers.
       *
       * If a trigger is supplied,
       * it is used to show the tooltip; otherwise, it will use the `trigger`
       * option passed to the `$tooltipProvider.options` method; else it will
       * default to the trigger supplied to this directive factory.
       *
       * The hide trigger is based on the show trigger. If the `trigger` option
       * was passed to the `$tooltipProvider.options` method, it will use the
       * mapped trigger from `triggerMap` or the passed trigger if the map is
       * undefined; otherwise, it uses the `triggerMap` value of the show
       * trigger; else it will just use the show trigger.
       */
      function getTriggers ( trigger ) {
        var show = trigger || options.trigger || defaultTriggerShow;
        var hide = triggerMap[show] || show;
        return {
          show: show,
          hide: hide
        };
      }

      var directiveName = snake_case( type );

      var startSym = $interpolate.startSymbol();
      var endSym = $interpolate.endSymbol();
      var template =
        '<div '+ directiveName +'-popup '+
          'title="'+startSym+'tt_title'+endSym+'" '+
          'content="'+startSym+'tt_content'+endSym+'" '+
          'placement="'+startSym+'tt_placement'+endSym+'" '+
          'animation="tt_animation" '+
          'is-open="tt_isOpen"'+
          '>'+
        '</div>';

      return {
        restrict: 'EA',
        scope: true,
        compile: function (tElem, tAttrs) {
          var tooltipLinker = $compile( template );

          return function link ( scope, element, attrs ) {
            var tooltip;
            var transitionTimeout;
            var popupTimeout;
            var appendToBody = angular.isDefined( options.appendToBody ) ? options.appendToBody : false;
            var triggers = getTriggers( undefined );
            var hasEnableExp = angular.isDefined(attrs[prefix+'Enable']);

            var positionTooltip = function () {

              var ttPosition = $position.positionElements(element, tooltip, scope.tt_placement, appendToBody);
              ttPosition.top += 'px';
              ttPosition.left += 'px';

              // Now set the calculated positioning.
              tooltip.css( ttPosition );
            };

            // By default, the tooltip is not open.
            // TODO add ability to start tooltip opened
            scope.tt_isOpen = false;

            function toggleTooltipBind () {
              if ( ! scope.tt_isOpen ) {
                showTooltipBind();
              } else {
                hideTooltipBind();
              }
            }

            // Show the tooltip with delay if specified, otherwise show it immediately
            function showTooltipBind() {
              if(hasEnableExp && !scope.$eval(attrs[prefix+'Enable'])) {
                return;
              }
              if ( scope.tt_popupDelay ) {
                // Do nothing if the tooltip was already scheduled to pop-up.
                // This happens if show is triggered multiple times before any hide is triggered.
                if (!popupTimeout) {
                  popupTimeout = $timeout( show, scope.tt_popupDelay, false );
                  popupTimeout.then(function(reposition){reposition();});
                }
              } else {
                show()();
              }
            }

            function hideTooltipBind () {
              scope.$apply(function () {
                hide();
              });
            }

            // Show the tooltip popup element.
            function show() {

              popupTimeout = null;

              // If there is a pending remove transition, we must cancel it, lest the
              // tooltip be mysteriously removed.
              if ( transitionTimeout ) {
                $timeout.cancel( transitionTimeout );
                transitionTimeout = null;
              }

              // Don't show empty tooltips.
              if ( ! scope.tt_content ) {
                return angular.noop;
              }

              createTooltip();

              // Set the initial positioning.
              tooltip.css({ top: 0, left: 0, display: 'block' });

              // Now we add it to the DOM because need some info about it. But it's not
              // visible yet anyway.
              if ( appendToBody ) {
                  $document.find( 'body' ).append( tooltip );
              } else {
                element.after( tooltip );
              }

              positionTooltip();

              // And show the tooltip.
              scope.tt_isOpen = true;
              scope.$digest(); // digest required as $apply is not called

              // Return positioning function as promise callback for correct
              // positioning after draw.
              return positionTooltip;
            }

            // Hide the tooltip popup element.
            function hide() {
              // First things first: we don't show it anymore.
              scope.tt_isOpen = false;

              //if tooltip is going to be shown after delay, we must cancel this
              $timeout.cancel( popupTimeout );
              popupTimeout = null;

              // And now we remove it from the DOM. However, if we have animation, we
              // need to wait for it to expire beforehand.
              // FIXME: this is a placeholder for a port of the transitions library.
              if ( scope.tt_animation ) {
                if (!transitionTimeout) {
                  transitionTimeout = $timeout(removeTooltip, 500);
                }
              } else {
                removeTooltip();
              }
            }

            function createTooltip() {
              // There can only be one tooltip element per directive shown at once.
              if (tooltip) {
                removeTooltip();
              }
              tooltip = tooltipLinker(scope, function () {});

              // Get contents rendered into the tooltip
              scope.$digest();
            }

            function removeTooltip() {
              transitionTimeout = null;
              if (tooltip) {
                tooltip.remove();
                tooltip = null;
              }
            }

            /**
             * Observe the relevant attributes.
             */
            attrs.$observe( type, function ( val ) {
              scope.tt_content = val;

              if (!val && scope.tt_isOpen ) {
                hide();
              }
            });

            attrs.$observe( prefix+'Title', function ( val ) {
              scope.tt_title = val;
            });

            attrs.$observe( prefix+'Placement', function ( val ) {
              scope.tt_placement = angular.isDefined( val ) ? val : options.placement;
            });

            attrs.$observe( prefix+'PopupDelay', function ( val ) {
              var delay = parseInt( val, 10 );
              scope.tt_popupDelay = ! isNaN(delay) ? delay : options.popupDelay;
            });

            var unregisterTriggers = function () {
              element.unbind(triggers.show, showTooltipBind);
              element.unbind(triggers.hide, hideTooltipBind);
            };

            attrs.$observe( prefix+'Trigger', function ( val ) {
              unregisterTriggers();

              triggers = getTriggers( val );

              if ( triggers.show === triggers.hide ) {
                element.bind( triggers.show, toggleTooltipBind );
              } else {
                element.bind( triggers.show, showTooltipBind );
                element.bind( triggers.hide, hideTooltipBind );
              }
            });

            var animation = scope.$eval(attrs[prefix + 'Animation']);
            scope.tt_animation = angular.isDefined(animation) ? !!animation : options.animation;

            attrs.$observe( prefix+'AppendToBody', function ( val ) {
              appendToBody = angular.isDefined( val ) ? $parse( val )( scope ) : appendToBody;
            });

            // if a tooltip is attached to <body> we need to remove it on
            // location change as its parent scope will probably not be destroyed
            // by the change.
            if ( appendToBody ) {
              scope.$on('$locationChangeSuccess', function closeTooltipOnLocationChangeSuccess () {
              if ( scope.tt_isOpen ) {
                hide();
              }
            });
            }

            // Make sure tooltip is destroyed and removed.
            scope.$on('$destroy', function onDestroyTooltip() {
              $timeout.cancel( transitionTimeout );
              $timeout.cancel( popupTimeout );
              unregisterTriggers();
              removeTooltip();
            });
          };
        }
      };
    };
  }];
})

.directive( 'tooltipPopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { content: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/tooltip/tooltip-popup.html'
  };
})

.directive( 'tooltip', [ '$tooltip', function ( $tooltip ) {
  return $tooltip( 'tooltip', 'tooltip', 'mouseenter' );
}])

.directive( 'tooltipHtmlUnsafePopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { content: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/tooltip/tooltip-html-unsafe-popup.html'
  };
})

.directive( 'tooltipHtmlUnsafe', [ '$tooltip', function ( $tooltip ) {
  return $tooltip( 'tooltipHtmlUnsafe', 'tooltip', 'mouseenter' );
}]);

/**
 * The following features are still outstanding: popup delay, animation as a
 * function, placement as a function, inside, support for more triggers than
 * just mouse enter/leave, html popovers, and selector delegatation.
 */
angular.module( 'ui.bootstrap.popover', [ 'ui.bootstrap.tooltip' ] )

.directive( 'popoverPopup', function () {
  return {
    restrict: 'EA',
    replace: true,
    scope: { title: '@', content: '@', placement: '@', animation: '&', isOpen: '&' },
    templateUrl: 'template/popover/popover.html'
  };
})

.directive( 'popover', [ '$tooltip', function ( $tooltip ) {
  return $tooltip( 'popover', 'popover', 'click' );
}]);

angular.module('ui.bootstrap.progressbar', [])

.constant('progressConfig', {
  animate: true,
  max: 100
})

.controller('ProgressController', ['$scope', '$attrs', 'progressConfig', function($scope, $attrs, progressConfig) {
    var self = this,
        animate = angular.isDefined($attrs.animate) ? $scope.$parent.$eval($attrs.animate) : progressConfig.animate;

    this.bars = [];
    $scope.max = angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : progressConfig.max;

    this.addBar = function(bar, element) {
        if ( !animate ) {
            element.css({'transition': 'none'});
        }

        this.bars.push(bar);

        bar.$watch('value', function( value ) {
            bar.percent = +(100 * value / $scope.max).toFixed(2);
        });

        bar.$on('$destroy', function() {
            element = null;
            self.removeBar(bar);
        });
    };

    this.removeBar = function(bar) {
        this.bars.splice(this.bars.indexOf(bar), 1);
    };
}])

.directive('progress', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        controller: 'ProgressController',
        require: 'progress',
        scope: {},
        templateUrl: 'template/progressbar/progress.html'
    };
})

.directive('bar', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        require: '^progress',
        scope: {
            value: '=',
            type: '@'
        },
        templateUrl: 'template/progressbar/bar.html',
        link: function(scope, element, attrs, progressCtrl) {
            progressCtrl.addBar(scope, element);
        }
    };
})

.directive('progressbar', function() {
    return {
        restrict: 'EA',
        replace: true,
        transclude: true,
        controller: 'ProgressController',
        scope: {
            value: '=',
            type: '@'
        },
        templateUrl: 'template/progressbar/progressbar.html',
        link: function(scope, element, attrs, progressCtrl) {
            progressCtrl.addBar(scope, angular.element(element.children()[0]));
        }
    };
});
angular.module('ui.bootstrap.rating', [])

.constant('ratingConfig', {
  max: 5,
  stateOn: null,
  stateOff: null
})

.controller('RatingController', ['$scope', '$attrs', 'ratingConfig', function($scope, $attrs, ratingConfig) {
  var ngModelCtrl  = { $setViewValue: angular.noop };

  this.init = function(ngModelCtrl_) {
    ngModelCtrl = ngModelCtrl_;
    ngModelCtrl.$render = this.render;

    this.stateOn = angular.isDefined($attrs.stateOn) ? $scope.$parent.$eval($attrs.stateOn) : ratingConfig.stateOn;
    this.stateOff = angular.isDefined($attrs.stateOff) ? $scope.$parent.$eval($attrs.stateOff) : ratingConfig.stateOff;

    var ratingStates = angular.isDefined($attrs.ratingStates) ? $scope.$parent.$eval($attrs.ratingStates) :
                        new Array( angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : ratingConfig.max );
    $scope.range = this.buildTemplateObjects(ratingStates);
  };

  this.buildTemplateObjects = function(states) {
    for (var i = 0, n = states.length; i < n; i++) {
      states[i] = angular.extend({ index: i }, { stateOn: this.stateOn, stateOff: this.stateOff }, states[i]);
    }
    return states;
  };

  $scope.rate = function(value) {
    if ( !$scope.readonly && value >= 0 && value <= $scope.range.length ) {
      ngModelCtrl.$setViewValue(value);
      ngModelCtrl.$render();
    }
  };

  $scope.enter = function(value) {
    if ( !$scope.readonly ) {
      $scope.value = value;
    }
    $scope.onHover({value: value});
  };

  $scope.reset = function() {
    $scope.value = ngModelCtrl.$viewValue;
    $scope.onLeave();
  };

  $scope.onKeydown = function(evt) {
    if (/(37|38|39|40)/.test(evt.which)) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.rate( $scope.value + (evt.which === 38 || evt.which === 39 ? 1 : -1) );
    }
  };

  this.render = function() {
    $scope.value = ngModelCtrl.$viewValue;
  };
}])

.directive('rating', function() {
  return {
    restrict: 'EA',
    require: ['rating', 'ngModel'],
    scope: {
      readonly: '=?',
      onHover: '&',
      onLeave: '&'
    },
    controller: 'RatingController',
    templateUrl: 'template/rating/rating.html',
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var ratingCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if ( ngModelCtrl ) {
        ratingCtrl.init( ngModelCtrl );
      }
    }
  };
});

/**
 * @ngdoc overview
 * @name ui.bootstrap.tabs
 *
 * @description
 * AngularJS version of the tabs directive.
 */

angular.module('ui.bootstrap.tabs', [])

.controller('TabsetController', ['$scope', function TabsetCtrl($scope) {
  var ctrl = this,
      tabs = ctrl.tabs = $scope.tabs = [];

  ctrl.select = function(selectedTab) {
    angular.forEach(tabs, function(tab) {
      if (tab.active && tab !== selectedTab) {
        tab.active = false;
        tab.onDeselect();
      }
    });
    selectedTab.active = true;
    selectedTab.onSelect();
  };

  ctrl.addTab = function addTab(tab) {
    tabs.push(tab);
    // we can't run the select function on the first tab
    // since that would select it twice
    if (tabs.length === 1) {
      tab.active = true;
    } else if (tab.active) {
      ctrl.select(tab);
    }
  };

  ctrl.removeTab = function removeTab(tab) {
    var index = tabs.indexOf(tab);
    //Select a new tab if the tab to be removed is selected
    if (tab.active && tabs.length > 1) {
      //If this is the last tab, select the previous tab. else, the next tab.
      var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
      ctrl.select(tabs[newActiveIndex]);
    }
    tabs.splice(index, 1);
  };
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabset
 * @restrict EA
 *
 * @description
 * Tabset is the outer container for the tabs directive
 *
 * @param {boolean=} vertical Whether or not to use vertical styling for the tabs.
 * @param {boolean=} justified Whether or not to use justified styling for the tabs.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab heading="Tab 1"><b>First</b> Content!</tab>
      <tab heading="Tab 2"><i>Second</i> Content!</tab>
    </tabset>
    <hr />
    <tabset vertical="true">
      <tab heading="Vertical Tab 1"><b>First</b> Vertical Content!</tab>
      <tab heading="Vertical Tab 2"><i>Second</i> Vertical Content!</tab>
    </tabset>
    <tabset justified="true">
      <tab heading="Justified Tab 1"><b>First</b> Justified Content!</tab>
      <tab heading="Justified Tab 2"><i>Second</i> Justified Content!</tab>
    </tabset>
  </file>
</example>
 */
.directive('tabset', function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    scope: {
      type: '@'
    },
    controller: 'TabsetController',
    templateUrl: 'template/tabs/tabset.html',
    link: function(scope, element, attrs) {
      scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
      scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
    }
  };
})

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tab
 * @restrict EA
 *
 * @param {string=} heading The visible heading, or title, of the tab. Set HTML headings with {@link ui.bootstrap.tabs.directive:tabHeading tabHeading}.
 * @param {string=} select An expression to evaluate when the tab is selected.
 * @param {boolean=} active A binding, telling whether or not this tab is selected.
 * @param {boolean=} disabled A binding, telling whether or not this tab is disabled.
 *
 * @description
 * Creates a tab with a heading and content. Must be placed within a {@link ui.bootstrap.tabs.directive:tabset tabset}.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <div ng-controller="TabsDemoCtrl">
      <button class="btn btn-small" ng-click="items[0].active = true">
        Select item 1, using active binding
      </button>
      <button class="btn btn-small" ng-click="items[1].disabled = !items[1].disabled">
        Enable/disable item 2, using disabled binding
      </button>
      <br />
      <tabset>
        <tab heading="Tab 1">First Tab</tab>
        <tab select="alertMe()">
          <tab-heading><i class="icon-bell"></i> Alert me!</tab-heading>
          Second Tab, with alert callback and html heading!
        </tab>
        <tab ng-repeat="item in items"
          heading="{{item.title}}"
          disabled="item.disabled"
          active="item.active">
          {{item.content}}
        </tab>
      </tabset>
    </div>
  </file>
  <file name="script.js">
    function TabsDemoCtrl($scope) {
      $scope.items = [
        { title:"Dynamic Title 1", content:"Dynamic Item 0" },
        { title:"Dynamic Title 2", content:"Dynamic Item 1", disabled: true }
      ];

      $scope.alertMe = function() {
        setTimeout(function() {
          alert("You've selected the alert tab!");
        });
      };
    };
  </file>
</example>
 */

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabHeading
 * @restrict EA
 *
 * @description
 * Creates an HTML heading for a {@link ui.bootstrap.tabs.directive:tab tab}. Must be placed as a child of a tab element.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab>
        <tab-heading><b>HTML</b> in my titles?!</tab-heading>
        And some content, too!
      </tab>
      <tab>
        <tab-heading><i class="icon-heart"></i> Icon heading?!?</tab-heading>
        That's right.
      </tab>
    </tabset>
  </file>
</example>
 */
.directive('tab', ['$parse', function($parse) {
  return {
    require: '^tabset',
    restrict: 'EA',
    replace: true,
    templateUrl: 'template/tabs/tab.html',
    transclude: true,
    scope: {
      active: '=?',
      heading: '@',
      onSelect: '&select', //This callback is called in contentHeadingTransclude
                          //once it inserts the tab's content into the dom
      onDeselect: '&deselect'
    },
    controller: function() {
      //Empty controller so other directives can require being 'under' a tab
    },
    compile: function(elm, attrs, transclude) {
      return function postLink(scope, elm, attrs, tabsetCtrl) {
        scope.$watch('active', function(active) {
          if (active) {
            tabsetCtrl.select(scope);
          }
        });

        scope.disabled = false;
        if ( attrs.disabled ) {
          scope.$parent.$watch($parse(attrs.disabled), function(value) {
            scope.disabled = !! value;
          });
        }

        scope.select = function() {
          if ( !scope.disabled ) {
            scope.active = true;
          }
        };

        tabsetCtrl.addTab(scope);
        scope.$on('$destroy', function() {
          tabsetCtrl.removeTab(scope);
        });

        //We need to transclude later, once the content container is ready.
        //when this link happens, we're inside a tab heading.
        scope.$transcludeFn = transclude;
      };
    }
  };
}])

.directive('tabHeadingTransclude', [function() {
  return {
    restrict: 'A',
    require: '^tab',
    link: function(scope, elm, attrs, tabCtrl) {
      scope.$watch('headingElement', function updateHeadingElement(heading) {
        if (heading) {
          elm.html('');
          elm.append(heading);
        }
      });
    }
  };
}])

.directive('tabContentTransclude', function() {
  return {
    restrict: 'A',
    require: '^tabset',
    link: function(scope, elm, attrs) {
      var tab = scope.$eval(attrs.tabContentTransclude);

      //Now our tab is ready to be transcluded: both the tab heading area
      //and the tab content area are loaded.  Transclude 'em both.
      tab.$transcludeFn(tab.$parent, function(contents) {
        angular.forEach(contents, function(node) {
          if (isTabHeading(node)) {
            //Let tabHeadingTransclude know.
            tab.headingElement = node;
          } else {
            elm.append(node);
          }
        });
      });
    }
  };
  function isTabHeading(node) {
    return node.tagName &&  (
      node.hasAttribute('tab-heading') ||
      node.hasAttribute('data-tab-heading') ||
      node.tagName.toLowerCase() === 'tab-heading' ||
      node.tagName.toLowerCase() === 'data-tab-heading'
    );
  }
})

;

angular.module('ui.bootstrap.timepicker', [])

.constant('timepickerConfig', {
  hourStep: 1,
  minuteStep: 1,
  showMeridian: true,
  meridians: null,
  readonlyInput: false,
  mousewheel: true
})

.controller('TimepickerController', ['$scope', '$attrs', '$parse', '$log', '$locale', 'timepickerConfig', function($scope, $attrs, $parse, $log, $locale, timepickerConfig) {
  var selected = new Date(),
      ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
      meridians = angular.isDefined($attrs.meridians) ? $scope.$parent.$eval($attrs.meridians) : timepickerConfig.meridians || $locale.DATETIME_FORMATS.AMPMS;

  this.init = function( ngModelCtrl_, inputs ) {
    ngModelCtrl = ngModelCtrl_;
    ngModelCtrl.$render = this.render;

    var hoursInputEl = inputs.eq(0),
        minutesInputEl = inputs.eq(1);

    var mousewheel = angular.isDefined($attrs.mousewheel) ? $scope.$parent.$eval($attrs.mousewheel) : timepickerConfig.mousewheel;
    if ( mousewheel ) {
      this.setupMousewheelEvents( hoursInputEl, minutesInputEl );
    }

    $scope.readonlyInput = angular.isDefined($attrs.readonlyInput) ? $scope.$parent.$eval($attrs.readonlyInput) : timepickerConfig.readonlyInput;
    this.setupInputEvents( hoursInputEl, minutesInputEl );
  };

  var hourStep = timepickerConfig.hourStep;
  if ($attrs.hourStep) {
    $scope.$parent.$watch($parse($attrs.hourStep), function(value) {
      hourStep = parseInt(value, 10);
    });
  }

  var minuteStep = timepickerConfig.minuteStep;
  if ($attrs.minuteStep) {
    $scope.$parent.$watch($parse($attrs.minuteStep), function(value) {
      minuteStep = parseInt(value, 10);
    });
  }

  // 12H / 24H mode
  $scope.showMeridian = timepickerConfig.showMeridian;
  if ($attrs.showMeridian) {
    $scope.$parent.$watch($parse($attrs.showMeridian), function(value) {
      $scope.showMeridian = !!value;

      if ( ngModelCtrl.$error.time ) {
        // Evaluate from template
        var hours = getHoursFromTemplate(), minutes = getMinutesFromTemplate();
        if (angular.isDefined( hours ) && angular.isDefined( minutes )) {
          selected.setHours( hours );
          refresh();
        }
      } else {
        updateTemplate();
      }
    });
  }

  // Get $scope.hours in 24H mode if valid
  function getHoursFromTemplate ( ) {
    var hours = parseInt( $scope.hours, 10 );
    var valid = ( $scope.showMeridian ) ? (hours > 0 && hours < 13) : (hours >= 0 && hours < 24);
    if ( !valid ) {
      return undefined;
    }

    if ( $scope.showMeridian ) {
      if ( hours === 12 ) {
        hours = 0;
      }
      if ( $scope.meridian === meridians[1] ) {
        hours = hours + 12;
      }
    }
    return hours;
  }

  function getMinutesFromTemplate() {
    var minutes = parseInt($scope.minutes, 10);
    return ( minutes >= 0 && minutes < 60 ) ? minutes : undefined;
  }

  function pad( value ) {
    return ( angular.isDefined(value) && value.toString().length < 2 ) ? '0' + value : value;
  }

  // Respond on mousewheel spin
  this.setupMousewheelEvents = function( hoursInputEl, minutesInputEl ) {
    var isScrollingUp = function(e) {
      if (e.originalEvent) {
        e = e.originalEvent;
      }
      //pick correct delta variable depending on event
      var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
      return (e.detail || delta > 0);
    };

    hoursInputEl.bind('mousewheel wheel', function(e) {
      $scope.$apply( (isScrollingUp(e)) ? $scope.incrementHours() : $scope.decrementHours() );
      e.preventDefault();
    });

    minutesInputEl.bind('mousewheel wheel', function(e) {
      $scope.$apply( (isScrollingUp(e)) ? $scope.incrementMinutes() : $scope.decrementMinutes() );
      e.preventDefault();
    });

  };

  this.setupInputEvents = function( hoursInputEl, minutesInputEl ) {
    if ( $scope.readonlyInput ) {
      $scope.updateHours = angular.noop;
      $scope.updateMinutes = angular.noop;
      return;
    }

    var invalidate = function(invalidHours, invalidMinutes) {
      ngModelCtrl.$setViewValue( null );
      ngModelCtrl.$setValidity('time', false);
      if (angular.isDefined(invalidHours)) {
        $scope.invalidHours = invalidHours;
      }
      if (angular.isDefined(invalidMinutes)) {
        $scope.invalidMinutes = invalidMinutes;
      }
    };

    $scope.updateHours = function() {
      var hours = getHoursFromTemplate();

      if ( angular.isDefined(hours) ) {
        selected.setHours( hours );
        refresh( 'h' );
      } else {
        invalidate(true);
      }
    };

    hoursInputEl.bind('blur', function(e) {
      if ( !$scope.invalidHours && $scope.hours < 10) {
        $scope.$apply( function() {
          $scope.hours = pad( $scope.hours );
        });
      }
    });

    $scope.updateMinutes = function() {
      var minutes = getMinutesFromTemplate();

      if ( angular.isDefined(minutes) ) {
        selected.setMinutes( minutes );
        refresh( 'm' );
      } else {
        invalidate(undefined, true);
      }
    };

    minutesInputEl.bind('blur', function(e) {
      if ( !$scope.invalidMinutes && $scope.minutes < 10 ) {
        $scope.$apply( function() {
          $scope.minutes = pad( $scope.minutes );
        });
      }
    });

  };

  this.render = function() {
    var date = ngModelCtrl.$modelValue ? new Date( ngModelCtrl.$modelValue ) : null;

    if ( isNaN(date) ) {
      ngModelCtrl.$setValidity('time', false);
      $log.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
    } else {
      if ( date ) {
        selected = date;
      }
      makeValid();
      updateTemplate();
    }
  };

  // Call internally when we know that model is valid.
  function refresh( keyboardChange ) {
    makeValid();
    ngModelCtrl.$setViewValue( new Date(selected) );
    updateTemplate( keyboardChange );
  }

  function makeValid() {
    ngModelCtrl.$setValidity('time', true);
    $scope.invalidHours = false;
    $scope.invalidMinutes = false;
  }

  function updateTemplate( keyboardChange ) {
    var hours = selected.getHours(), minutes = selected.getMinutes();

    if ( $scope.showMeridian ) {
      hours = ( hours === 0 || hours === 12 ) ? 12 : hours % 12; // Convert 24 to 12 hour system
    }

    $scope.hours = keyboardChange === 'h' ? hours : pad(hours);
    $scope.minutes = keyboardChange === 'm' ? minutes : pad(minutes);
    $scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];
  }

  function addMinutes( minutes ) {
    var dt = new Date( selected.getTime() + minutes * 60000 );
    selected.setHours( dt.getHours(), dt.getMinutes() );
    refresh();
  }

  $scope.incrementHours = function() {
    addMinutes( hourStep * 60 );
  };
  $scope.decrementHours = function() {
    addMinutes( - hourStep * 60 );
  };
  $scope.incrementMinutes = function() {
    addMinutes( minuteStep );
  };
  $scope.decrementMinutes = function() {
    addMinutes( - minuteStep );
  };
  $scope.toggleMeridian = function() {
    addMinutes( 12 * 60 * (( selected.getHours() < 12 ) ? 1 : -1) );
  };
}])

.directive('timepicker', function () {
  return {
    restrict: 'EA',
    require: ['timepicker', '?^ngModel'],
    controller:'TimepickerController',
    replace: true,
    scope: {},
    templateUrl: 'template/timepicker/timepicker.html',
    link: function(scope, element, attrs, ctrls) {
      var timepickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if ( ngModelCtrl ) {
        timepickerCtrl.init( ngModelCtrl, element.find('input') );
      }
    }
  };
});

angular.module('ui.bootstrap.typeahead', ['ui.bootstrap.position', 'ui.bootstrap.bindHtml'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
  .factory('typeaheadParser', ['$parse', function ($parse) {

  //                      00000111000000000000022200000000000000003333333333333330000000000044000
  var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

  return {
    parse:function (input) {

      var match = input.match(TYPEAHEAD_REGEXP);
      if (!match) {
        throw new Error(
          'Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_"' +
            ' but got "' + input + '".');
      }

      return {
        itemName:match[3],
        source:$parse(match[4]),
        viewMapper:$parse(match[2] || match[1]),
        modelMapper:$parse(match[1])
      };
    }
  };
}])

  .directive('typeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$position', 'typeaheadParser',
    function ($compile, $parse, $q, $timeout, $document, $position, typeaheadParser) {

  var HOT_KEYS = [9, 13, 27, 38, 40];

  return {
    require:'ngModel',
    link:function (originalScope, element, attrs, modelCtrl) {

      //SUPPORTED ATTRIBUTES (OPTIONS)

      //minimal no of characters that needs to be entered before typeahead kicks-in
      var minSearch = originalScope.$eval(attrs.typeaheadMinLength) || 1;

      //minimal wait time after last character typed before typehead kicks-in
      var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;

      //should it restrict model values to the ones selected from the popup only?
      var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;

      //binding to a variable that indicates if matches are being retrieved asynchronously
      var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;

      //a callback executed when a match is selected
      var onSelectCallback = $parse(attrs.typeaheadOnSelect);

      var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

      var appendToBody =  attrs.typeaheadAppendToBody ? originalScope.$eval(attrs.typeaheadAppendToBody) : false;

      //INTERNAL VARIABLES

      //model setter executed upon match selection
      var $setModelValue = $parse(attrs.ngModel).assign;

      //expressions used by typeahead
      var parserResult = typeaheadParser.parse(attrs.typeahead);

      var hasFocus;

      //create a child scope for the typeahead directive so we are not polluting original scope
      //with typeahead-specific data (matches, query etc.)
      var scope = originalScope.$new();
      originalScope.$on('$destroy', function(){
        scope.$destroy();
      });

      // WAI-ARIA
      var popupId = 'typeahead-' + scope.$id + '-' + Math.floor(Math.random() * 10000);
      element.attr({
        'aria-autocomplete': 'list',
        'aria-expanded': false,
        'aria-owns': popupId
      });

      //pop-up element used to display matches
      var popUpEl = angular.element('<div typeahead-popup></div>');
      popUpEl.attr({
        id: popupId,
        matches: 'matches',
        active: 'activeIdx',
        select: 'select(activeIdx)',
        query: 'query',
        position: 'position'
      });
      //custom item template
      if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
        popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
      }

      var resetMatches = function() {
        scope.matches = [];
        scope.activeIdx = -1;
        element.attr('aria-expanded', false);
      };

      var getMatchId = function(index) {
        return popupId + '-option-' + index;
      };

      // Indicate that the specified match is the active (pre-selected) item in the list owned by this typeahead.
      // This attribute is added or removed automatically when the `activeIdx` changes.
      scope.$watch('activeIdx', function(index) {
        if (index < 0) {
          element.removeAttr('aria-activedescendant');
        } else {
          element.attr('aria-activedescendant', getMatchId(index));
        }
      });

      var getMatchesAsync = function(inputValue) {

        var locals = {$viewValue: inputValue};
        isLoadingSetter(originalScope, true);
        $q.when(parserResult.source(originalScope, locals)).then(function(matches) {

          //it might happen that several async queries were in progress if a user were typing fast
          //but we are interested only in responses that correspond to the current view value
          var onCurrentRequest = (inputValue === modelCtrl.$viewValue);
          if (onCurrentRequest && hasFocus) {
            if (matches.length > 0) {

              scope.activeIdx = 0;
              scope.matches.length = 0;

              //transform labels
              for(var i=0; i<matches.length; i++) {
                locals[parserResult.itemName] = matches[i];
                scope.matches.push({
                  id: getMatchId(i),
                  label: parserResult.viewMapper(scope, locals),
                  model: matches[i]
                });
              }

              scope.query = inputValue;
              //position pop-up with matches - we need to re-calculate its position each time we are opening a window
              //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
              //due to other elements being rendered
              scope.position = appendToBody ? $position.offset(element) : $position.position(element);
              scope.position.top = scope.position.top + element.prop('offsetHeight');

              element.attr('aria-expanded', true);
            } else {
              resetMatches();
            }
          }
          if (onCurrentRequest) {
            isLoadingSetter(originalScope, false);
          }
        }, function(){
          resetMatches();
          isLoadingSetter(originalScope, false);
        });
      };

      resetMatches();

      //we need to propagate user's query so we can higlight matches
      scope.query = undefined;

      //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
      var timeoutPromise;

      //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
      //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
      modelCtrl.$parsers.unshift(function (inputValue) {

        hasFocus = true;

        if (inputValue && inputValue.length >= minSearch) {
          if (waitTime > 0) {
            if (timeoutPromise) {
              $timeout.cancel(timeoutPromise);//cancel previous timeout
            }
            timeoutPromise = $timeout(function () {
              getMatchesAsync(inputValue);
            }, waitTime);
          } else {
            getMatchesAsync(inputValue);
          }
        } else {
          isLoadingSetter(originalScope, false);
          resetMatches();
        }

        if (isEditable) {
          return inputValue;
        } else {
          if (!inputValue) {
            // Reset in case user had typed something previously.
            modelCtrl.$setValidity('editable', true);
            return inputValue;
          } else {
            modelCtrl.$setValidity('editable', false);
            return undefined;
          }
        }
      });

      modelCtrl.$formatters.push(function (modelValue) {

        var candidateViewValue, emptyViewValue;
        var locals = {};

        if (inputFormatter) {

          locals['$model'] = modelValue;
          return inputFormatter(originalScope, locals);

        } else {

          //it might happen that we don't have enough info to properly render input value
          //we need to check for this situation and simply return model value if we can't apply custom formatting
          locals[parserResult.itemName] = modelValue;
          candidateViewValue = parserResult.viewMapper(originalScope, locals);
          locals[parserResult.itemName] = undefined;
          emptyViewValue = parserResult.viewMapper(originalScope, locals);

          return candidateViewValue!== emptyViewValue ? candidateViewValue : modelValue;
        }
      });

      scope.select = function (activeIdx) {
        //called from within the $digest() cycle
        var locals = {};
        var model, item;

        locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
        model = parserResult.modelMapper(originalScope, locals);
        $setModelValue(originalScope, model);
        modelCtrl.$setValidity('editable', true);

        onSelectCallback(originalScope, {
          $item: item,
          $model: model,
          $label: parserResult.viewMapper(originalScope, locals)
        });

        resetMatches();

        //return focus to the input element if a match was selected via a mouse click event
        // use timeout to avoid $rootScope:inprog error
        $timeout(function() { element[0].focus(); }, 0, false);
      };

      //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
      element.bind('keydown', function (evt) {

        //typeahead is open and an "interesting" key was pressed
        if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
          return;
        }

        evt.preventDefault();

        if (evt.which === 40) {
          scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
          scope.$digest();

        } else if (evt.which === 38) {
          scope.activeIdx = (scope.activeIdx ? scope.activeIdx : scope.matches.length) - 1;
          scope.$digest();

        } else if (evt.which === 13 || evt.which === 9) {
          scope.$apply(function () {
            scope.select(scope.activeIdx);
          });

        } else if (evt.which === 27) {
          evt.stopPropagation();

          resetMatches();
          scope.$digest();
        }
      });

      element.bind('blur', function (evt) {
        hasFocus = false;
      });

      // Keep reference to click handler to unbind it.
      var dismissClickHandler = function (evt) {
        if (element[0] !== evt.target) {
          resetMatches();
          scope.$digest();
        }
      };

      $document.bind('click', dismissClickHandler);

      originalScope.$on('$destroy', function(){
        $document.unbind('click', dismissClickHandler);
      });

      var $popup = $compile(popUpEl)(scope);
      if ( appendToBody ) {
        $document.find('body').append($popup);
      } else {
        element.after($popup);
      }
    }
  };

}])

  .directive('typeaheadPopup', function () {
    return {
      restrict:'EA',
      scope:{
        matches:'=',
        query:'=',
        active:'=',
        position:'=',
        select:'&'
      },
      replace:true,
      templateUrl:'template/typeahead/typeahead-popup.html',
      link:function (scope, element, attrs) {

        scope.templateUrl = attrs.templateUrl;

        scope.isOpen = function () {
          return scope.matches.length > 0;
        };

        scope.isActive = function (matchIdx) {
          return scope.active == matchIdx;
        };

        scope.selectActive = function (matchIdx) {
          scope.active = matchIdx;
        };

        scope.selectMatch = function (activeIdx) {
          scope.select({activeIdx:activeIdx});
        };
      }
    };
  })

  .directive('typeaheadMatch', ['$http', '$templateCache', '$compile', '$parse', function ($http, $templateCache, $compile, $parse) {
    return {
      restrict:'EA',
      scope:{
        index:'=',
        match:'=',
        query:'='
      },
      link:function (scope, element, attrs) {
        var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'template/typeahead/typeahead-match.html';
        $http.get(tplUrl, {cache: $templateCache}).success(function(tplContent){
           element.replaceWith($compile(tplContent.trim())(scope));
        });
      }
    };
  }])

  .filter('typeaheadHighlight', function() {

    function escapeRegexp(queryToEscape) {
      return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
    }

    return function(matchItem, query) {
      return query ? ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem;
    };
  });

angular.module("template/accordion/accordion-group.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/accordion/accordion-group.html",
    "<div class=\"panel panel-default\">\n" +
    "  <div class=\"panel-heading\">\n" +
    "    <h4 class=\"panel-title\">\n" +
    "      <a class=\"accordion-toggle\" ng-click=\"toggleOpen()\" accordion-transclude=\"heading\"><span ng-class=\"{'text-muted': isDisabled}\">{{heading}}</span></a>\n" +
    "    </h4>\n" +
    "  </div>\n" +
    "  <div class=\"panel-collapse\" collapse=\"!isOpen\">\n" +
    "   <div class=\"panel-body\" ng-transclude></div>\n" +
    "  </div>\n" +
    "</div>");
}]);

angular.module("template/accordion/accordion.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/accordion/accordion.html",
    "<div class=\"panel-group\" ng-transclude></div>");
}]);

angular.module("template/alert/alert.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/alert/alert.html",
    "<div class=\"alert\" ng-class=\"{'alert-{{type || 'warning'}}': true, 'alert-dismissable': closeable}\" role=\"alert\">\n" +
    "    <button ng-show=\"closeable\" type=\"button\" class=\"close\" ng-click=\"close()\">\n" +
    "        <span aria-hidden=\"true\">&times;</span>\n" +
    "        <span class=\"sr-only\">Close</span>\n" +
    "    </button>\n" +
    "    <div ng-transclude></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/carousel/carousel.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/carousel/carousel.html",
    "<div ng-mouseenter=\"pause()\" ng-mouseleave=\"play()\" class=\"carousel\" ng-swipe-right=\"prev()\" ng-swipe-left=\"next()\">\n" +
    "    <ol class=\"carousel-indicators\" ng-show=\"slides.length > 1\">\n" +
    "        <li ng-repeat=\"slide in slides track by $index\" ng-class=\"{active: isActive(slide)}\" ng-click=\"select(slide)\"></li>\n" +
    "    </ol>\n" +
    "    <div class=\"carousel-inner\" ng-transclude></div>\n" +
    "    <a class=\"left carousel-control\" ng-click=\"prev()\" ng-show=\"slides.length > 1\"><span class=\"glyphicon glyphicon-chevron-left\"></span></a>\n" +
    "    <a class=\"right carousel-control\" ng-click=\"next()\" ng-show=\"slides.length > 1\"><span class=\"glyphicon glyphicon-chevron-right\"></span></a>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/carousel/slide.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/carousel/slide.html",
    "<div ng-class=\"{\n" +
    "    'active': leaving || (active && !entering),\n" +
    "    'prev': (next || active) && direction=='prev',\n" +
    "    'next': (next || active) && direction=='next',\n" +
    "    'right': direction=='prev',\n" +
    "    'left': direction=='next'\n" +
    "  }\" class=\"item text-center\" ng-transclude></div>\n" +
    "");
}]);

angular.module("template/datepicker/datepicker.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datepicker/datepicker.html",
    "<div ng-switch=\"datepickerMode\" role=\"application\" ng-keydown=\"keydown($event)\">\n" +
    "  <daypicker ng-switch-when=\"day\" tabindex=\"0\"></daypicker>\n" +
    "  <monthpicker ng-switch-when=\"month\" tabindex=\"0\"></monthpicker>\n" +
    "  <yearpicker ng-switch-when=\"year\" tabindex=\"0\"></yearpicker>\n" +
    "</div>");
}]);

angular.module("template/datepicker/day.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datepicker/day.html",
    "<table role=\"grid\" aria-labelledby=\"{{uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"{{5 + showWeeks}}\"><button id=\"{{uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm\" ng-click=\"toggleMode()\" tabindex=\"-1\" style=\"width:100%;\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "    <tr>\n" +
    "      <th ng-show=\"showWeeks\" class=\"text-center\"></th>\n" +
    "      <th ng-repeat=\"label in labels track by $index\" class=\"text-center\"><small aria-label=\"{{label.full}}\">{{label.abbr}}</small></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr ng-repeat=\"row in rows track by $index\">\n" +
    "      <td ng-show=\"showWeeks\" class=\"text-center h6\"><em>{{ weekNumbers[$index] }}</em></td>\n" +
    "      <td ng-repeat=\"dt in row track by dt.date\" class=\"text-center\" role=\"gridcell\" id=\"{{dt.uid}}\" aria-disabled=\"{{!!dt.disabled}}\">\n" +
    "        <button type=\"button\" style=\"width:100%;\" class=\"btn btn-default btn-sm\" ng-class=\"{'btn-info': dt.selected, active: isActive(dt)}\" ng-click=\"select(dt.date)\" ng-disabled=\"dt.disabled\" tabindex=\"-1\"><span ng-class=\"{'text-muted': dt.secondary, 'text-info': dt.current}\">{{dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("template/datepicker/month.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datepicker/month.html",
    "<table role=\"grid\" aria-labelledby=\"{{uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th><button id=\"{{uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm\" ng-click=\"toggleMode()\" tabindex=\"-1\" style=\"width:100%;\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr ng-repeat=\"row in rows track by $index\">\n" +
    "      <td ng-repeat=\"dt in row track by dt.date\" class=\"text-center\" role=\"gridcell\" id=\"{{dt.uid}}\" aria-disabled=\"{{!!dt.disabled}}\">\n" +
    "        <button type=\"button\" style=\"width:100%;\" class=\"btn btn-default\" ng-class=\"{'btn-info': dt.selected, active: isActive(dt)}\" ng-click=\"select(dt.date)\" ng-disabled=\"dt.disabled\" tabindex=\"-1\"><span ng-class=\"{'text-info': dt.current}\">{{dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("template/datepicker/popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datepicker/popup.html",
    "<ul class=\"dropdown-menu\" ng-style=\"{display: (isOpen && 'block') || 'none', top: position.top+'px', left: position.left+'px'}\" ng-keydown=\"keydown($event)\">\n" +
    " <li ng-transclude></li>\n" +
    " <li ng-if=\"showButtonBar\" style=\"padding:10px 9px 2px\">\n" +
    "   <span class=\"btn-group\">\n" +
    "     <button type=\"button\" class=\"btn btn-sm btn-info\" ng-click=\"select('today')\">{{ getText('current') }}</button>\n" +
    "     <button type=\"button\" class=\"btn btn-sm btn-danger\" ng-click=\"select(null)\">{{ getText('clear') }}</button>\n" +
    "   </span>\n" +
    "   <button type=\"button\" class=\"btn btn-sm btn-success pull-right\" ng-click=\"close()\">{{ getText('close') }}</button>\n" +
    " </li>\n" +
    "</ul>\n" +
    "");
}]);

angular.module("template/datepicker/year.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/datepicker/year.html",
    "<table role=\"grid\" aria-labelledby=\"{{uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
    "  <thead>\n" +
    "    <tr>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
    "      <th colspan=\"3\"><button id=\"{{uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm\" ng-click=\"toggleMode()\" tabindex=\"-1\" style=\"width:100%;\"><strong>{{title}}</strong></button></th>\n" +
    "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
    "    </tr>\n" +
    "  </thead>\n" +
    "  <tbody>\n" +
    "    <tr ng-repeat=\"row in rows track by $index\">\n" +
    "      <td ng-repeat=\"dt in row track by dt.date\" class=\"text-center\" role=\"gridcell\" id=\"{{dt.uid}}\" aria-disabled=\"{{!!dt.disabled}}\">\n" +
    "        <button type=\"button\" style=\"width:100%;\" class=\"btn btn-default\" ng-class=\"{'btn-info': dt.selected, active: isActive(dt)}\" ng-click=\"select(dt.date)\" ng-disabled=\"dt.disabled\" tabindex=\"-1\"><span ng-class=\"{'text-info': dt.current}\">{{dt.label}}</span></button>\n" +
    "      </td>\n" +
    "    </tr>\n" +
    "  </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("template/modal/backdrop.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/modal/backdrop.html",
    "<div class=\"modal-backdrop fade\"\n" +
    "     ng-class=\"{in: animate}\"\n" +
    "     ng-style=\"{'z-index': 1040 + (index && 1 || 0) + index*10}\"\n" +
    "></div>\n" +
    "");
}]);

angular.module("template/modal/window.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/modal/window.html",
    "<div tabindex=\"-1\" role=\"dialog\" class=\"modal fade\" ng-class=\"{in: animate}\" ng-style=\"{'z-index': 1050 + index*10, display: 'block'}\" ng-click=\"close($event)\">\n" +
    "    <div class=\"modal-dialog\" ng-class=\"{'modal-sm': size == 'sm', 'modal-lg': size == 'lg'}\"><div class=\"modal-content\" ng-transclude></div></div>\n" +
    "</div>");
}]);

angular.module("template/pagination/pager.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/pagination/pager.html",
    "<ul class=\"pager\">\n" +
    "  <li ng-class=\"{disabled: noPrevious(), previous: align}\"><a href ng-click=\"selectPage(page - 1)\">{{getText('previous')}}</a></li>\n" +
    "  <li ng-class=\"{disabled: noNext(), next: align}\"><a href ng-click=\"selectPage(page + 1)\">{{getText('next')}}</a></li>\n" +
    "</ul>");
}]);

angular.module("template/pagination/pagination.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/pagination/pagination.html",
    "<ul class=\"pagination\">\n" +
    "  <li ng-if=\"boundaryLinks\" ng-class=\"{disabled: noPrevious()}\"><a href ng-click=\"selectPage(1)\">{{getText('first')}}</a></li>\n" +
    "  <li ng-if=\"directionLinks\" ng-class=\"{disabled: noPrevious()}\"><a href ng-click=\"selectPage(page - 1)\">{{getText('previous')}}</a></li>\n" +
    "  <li ng-repeat=\"page in pages track by $index\" ng-class=\"{active: page.active}\"><a href ng-click=\"selectPage(page.number)\">{{page.text}}</a></li>\n" +
    "  <li ng-if=\"directionLinks\" ng-class=\"{disabled: noNext()}\"><a href ng-click=\"selectPage(page + 1)\">{{getText('next')}}</a></li>\n" +
    "  <li ng-if=\"boundaryLinks\" ng-class=\"{disabled: noNext()}\"><a href ng-click=\"selectPage(totalPages)\">{{getText('last')}}</a></li>\n" +
    "</ul>");
}]);

angular.module("template/tooltip/tooltip-html-unsafe-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tooltip/tooltip-html-unsafe-popup.html",
    "<div class=\"tooltip {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
    "  <div class=\"tooltip-arrow\"></div>\n" +
    "  <div class=\"tooltip-inner\" bind-html-unsafe=\"content\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/tooltip/tooltip-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tooltip/tooltip-popup.html",
    "<div class=\"tooltip {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
    "  <div class=\"tooltip-arrow\"></div>\n" +
    "  <div class=\"tooltip-inner\" ng-bind=\"content\"></div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/popover/popover.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/popover/popover.html",
    "<div class=\"popover {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
    "  <div class=\"arrow\"></div>\n" +
    "\n" +
    "  <div class=\"popover-inner\">\n" +
    "      <h3 class=\"popover-title\" ng-bind=\"title\" ng-show=\"title\"></h3>\n" +
    "      <div class=\"popover-content\" ng-bind=\"content\"></div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/progressbar/bar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/progressbar/bar.html",
    "<div class=\"progress-bar\" ng-class=\"type && 'progress-bar-' + type\" role=\"progressbar\" aria-valuenow=\"{{value}}\" aria-valuemin=\"0\" aria-valuemax=\"{{max}}\" ng-style=\"{width: percent + '%'}\" aria-valuetext=\"{{percent | number:0}}%\" ng-transclude></div>");
}]);

angular.module("template/progressbar/progress.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/progressbar/progress.html",
    "<div class=\"progress\" ng-transclude></div>");
}]);

angular.module("template/progressbar/progressbar.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/progressbar/progressbar.html",
    "<div class=\"progress\">\n" +
    "  <div class=\"progress-bar\" ng-class=\"type && 'progress-bar-' + type\" role=\"progressbar\" aria-valuenow=\"{{value}}\" aria-valuemin=\"0\" aria-valuemax=\"{{max}}\" ng-style=\"{width: percent + '%'}\" aria-valuetext=\"{{percent | number:0}}%\" ng-transclude></div>\n" +
    "</div>");
}]);

angular.module("template/rating/rating.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/rating/rating.html",
    "<span ng-mouseleave=\"reset()\" ng-keydown=\"onKeydown($event)\" tabindex=\"0\" role=\"slider\" aria-valuemin=\"0\" aria-valuemax=\"{{range.length}}\" aria-valuenow=\"{{value}}\">\n" +
    "    <i ng-repeat=\"r in range track by $index\" ng-mouseenter=\"enter($index + 1)\" ng-click=\"rate($index + 1)\" class=\"glyphicon\" ng-class=\"$index < value && (r.stateOn || 'glyphicon-star') || (r.stateOff || 'glyphicon-star-empty')\">\n" +
    "        <span class=\"sr-only\">({{ $index < value ? '*' : ' ' }})</span>\n" +
    "    </i>\n" +
    "</span>");
}]);

angular.module("template/tabs/tab.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tabs/tab.html",
    "<li ng-class=\"{active: active, disabled: disabled}\">\n" +
    "  <a ng-click=\"select()\" tab-heading-transclude>{{heading}}</a>\n" +
    "</li>\n" +
    "");
}]);

angular.module("template/tabs/tabset-titles.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tabs/tabset-titles.html",
    "<ul class=\"nav {{type && 'nav-' + type}}\" ng-class=\"{'nav-stacked': vertical}\">\n" +
    "</ul>\n" +
    "");
}]);

angular.module("template/tabs/tabset.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/tabs/tabset.html",
    "\n" +
    "<div>\n" +
    "  <ul class=\"nav nav-{{type || 'tabs'}}\" ng-class=\"{'nav-stacked': vertical, 'nav-justified': justified}\" ng-transclude></ul>\n" +
    "  <div class=\"tab-content\">\n" +
    "    <div class=\"tab-pane\" \n" +
    "         ng-repeat=\"tab in tabs\" \n" +
    "         ng-class=\"{active: tab.active}\"\n" +
    "         tab-content-transclude=\"tab\">\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("template/timepicker/timepicker.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/timepicker/timepicker.html",
    "<table>\n" +
    " <tbody>\n" +
    "   <tr class=\"text-center\">\n" +
    "     <td><a ng-click=\"incrementHours()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "     <td>&nbsp;</td>\n" +
    "     <td><a ng-click=\"incrementMinutes()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-up\"></span></a></td>\n" +
    "     <td ng-show=\"showMeridian\"></td>\n" +
    "   </tr>\n" +
    "   <tr>\n" +
    "     <td style=\"width:50px;\" class=\"form-group\" ng-class=\"{'has-error': invalidHours}\">\n" +
    "       <input type=\"text\" ng-model=\"hours\" ng-change=\"updateHours()\" class=\"form-control text-center\" ng-mousewheel=\"incrementHours()\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
    "     </td>\n" +
    "     <td>:</td>\n" +
    "     <td style=\"width:50px;\" class=\"form-group\" ng-class=\"{'has-error': invalidMinutes}\">\n" +
    "       <input type=\"text\" ng-model=\"minutes\" ng-change=\"updateMinutes()\" class=\"form-control text-center\" ng-readonly=\"readonlyInput\" maxlength=\"2\">\n" +
    "     </td>\n" +
    "     <td ng-show=\"showMeridian\"><button type=\"button\" class=\"btn btn-default text-center\" ng-click=\"toggleMeridian()\">{{meridian}}</button></td>\n" +
    "   </tr>\n" +
    "   <tr class=\"text-center\">\n" +
    "     <td><a ng-click=\"decrementHours()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "     <td>&nbsp;</td>\n" +
    "     <td><a ng-click=\"decrementMinutes()\" class=\"btn btn-link\"><span class=\"glyphicon glyphicon-chevron-down\"></span></a></td>\n" +
    "     <td ng-show=\"showMeridian\"></td>\n" +
    "   </tr>\n" +
    " </tbody>\n" +
    "</table>\n" +
    "");
}]);

angular.module("template/typeahead/typeahead-match.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/typeahead/typeahead-match.html",
    "<a tabindex=\"-1\" bind-html-unsafe=\"match.label | typeaheadHighlight:query\"></a>");
}]);

angular.module("template/typeahead/typeahead-popup.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("template/typeahead/typeahead-popup.html",
    "<ul class=\"dropdown-menu\" ng-if=\"isOpen()\" ng-style=\"{top: position.top+'px', left: position.left+'px'}\" style=\"display: block;\" role=\"listbox\" aria-hidden=\"{{!isOpen()}}\">\n" +
    "    <li ng-repeat=\"match in matches track by $index\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index)\" ng-click=\"selectMatch($index)\" role=\"option\" id=\"{{match.id}}\">\n" +
    "        <div typeahead-match index=\"$index\" match=\"match\" query=\"query\" template-url=\"templateUrl\"></div>\n" +
    "    </li>\n" +
    "</ul>");
}]);

/**
 * Enhanced Select2 Dropmenus
 *
 * @AJAX Mode - When in this mode, your value will be an object (or array of objects) of the data used by Select2
 *     This change is so that you do not have to do an additional query yourself on top of Select2's own query
 * @params [options] {object} The configuration options passed to $.fn.select2(). Refer to the documentation
 */
angular.module('ui.select2', []).value('uiSelect2Config', {}).directive('uiSelect2', ['uiSelect2Config', '$timeout', function (uiSelect2Config, $timeout) {
  var options = {};
  if (uiSelect2Config) {
    angular.extend(options, uiSelect2Config);
  }
  return {
    require: 'ngModel',
    priority: 1,
    compile: function (tElm, tAttrs) {
      var watch,
        repeatOption,
        repeatAttr,
        isSelect = tElm.is('select'),
        isMultiple = angular.isDefined(tAttrs.multiple);

      // Enable watching of the options dataset if in use
      if (tElm.is('select')) {
        repeatOption = tElm.find('option[ng-repeat], option[data-ng-repeat]');

        if (repeatOption.length) {
          repeatAttr = repeatOption.attr('ng-repeat') || repeatOption.attr('data-ng-repeat');
          watch = jQuery.trim(repeatAttr.split('|')[0]).split(' ').pop();
        }
      }

      return function (scope, elm, attrs, controller) {
        // instance-specific options
        var opts = angular.extend({}, options, scope.$eval(attrs.uiSelect2));

        /*
        Convert from Select2 view-model to Angular view-model.
        */
        var convertToAngularModel = function(select2_data) {
          var model;
          if (opts.simple_tags) {
            model = [];
            angular.forEach(select2_data, function(value, index) {
              model.push(value.id);
            });
          } else {
            model = select2_data;
          }
          return model;
        };

        /*
        Convert from Angular view-model to Select2 view-model.
        */
        var convertToSelect2Model = function(angular_data) {
          var model = [];
          if (!angular_data) {
            return model;
          }

          if (opts.simple_tags) {
            model = [];
            angular.forEach(
              angular_data,
              function(value, index) {
                model.push({'id': value, 'text': value});
              });
          } else {
            model = angular_data;
          }
          return model;
        };

        if (isSelect) {
          // Use <select multiple> instead
          delete opts.multiple;
          delete opts.initSelection;
        } else if (isMultiple) {
          opts.multiple = true;
        }

        if (controller) {
          // Watch the model for programmatic changes
           scope.$watch(tAttrs.ngModel, function(current, old) {
            if (!current) {
              return;
            }
            if (current === old) {
              return;
            }
            controller.$render();
          }, true);
          controller.$render = function () {
            if (isSelect) {
              elm.select2('val', controller.$viewValue);
            } else {
              if (opts.multiple) {
                var viewValue = controller.$viewValue;
                if (angular.isString(viewValue)) {
                  viewValue = viewValue.split(',');
                }
                elm.select2(
                  'data', convertToSelect2Model(viewValue));
              } else {
                if (angular.isObject(controller.$viewValue)) {
                  elm.select2('data', controller.$viewValue);
                } else if (!controller.$viewValue) {
                  elm.select2('data', null);
                } else {
                  elm.select2('val', controller.$viewValue);
                }
              }
            }
          };

          // Watch the options dataset for changes
          if (watch) {
            scope.$watch(watch, function (newVal, oldVal, scope) {
              if (angular.equals(newVal, oldVal)) {
                return;
              }
              // Delayed so that the options have time to be rendered
              $timeout(function () {
                elm.select2('val', controller.$viewValue);
                // Refresh angular to remove the superfluous option
                elm.trigger('change');
                if(newVal && !oldVal && controller.$setPristine) {
                  controller.$setPristine(true);
                }
              });
            });
          }

          // Update valid and dirty statuses
          controller.$parsers.push(function (value) {
            var div = elm.prev();
            div
              .toggleClass('ng-invalid', !controller.$valid)
              .toggleClass('ng-valid', controller.$valid)
              .toggleClass('ng-invalid-required', !controller.$valid)
              .toggleClass('ng-valid-required', controller.$valid)
              .toggleClass('ng-dirty', controller.$dirty)
              .toggleClass('ng-pristine', controller.$pristine);
            return value;
          });

          if (!isSelect) {
            // Set the view and model value and update the angular template manually for the ajax/multiple select2.
            elm.bind("change", function (e) {
              e.stopImmediatePropagation();

              if (scope.$$phase || scope.$root.$$phase) {
                return;
              }
              scope.$apply(function () {
                controller.$setViewValue(
                  convertToAngularModel(elm.select2('data')));
              });
            });

            if (opts.initSelection) {
              var initSelection = opts.initSelection;
              opts.initSelection = function (element, callback) {
                initSelection(element, function (value) {
                  controller.$setViewValue(convertToAngularModel(value));
                  callback(value);
                });
              };
            }
          }
        }

        elm.bind("$destroy", function() {
          elm.select2("destroy");
        });

        attrs.$observe('disabled', function (value) {
          elm.select2('enable', !value);
        });

        attrs.$observe('readonly', function (value) {
          elm.select2('readonly', !!value);
        });

        if (attrs.ngMultiple) {
          scope.$watch(attrs.ngMultiple, function(newVal) {
            attrs.$set('multiple', !!newVal);
            elm.select2(opts);
          });
        }

        // Initialize the plugin late so that the injected DOM does not disrupt the template compiler
        $timeout(function () {
          elm.select2(opts);

          // Set initial value - I'm not sure about this but it seems to need to be there
          elm.val(controller.$viewValue);
          // important!
          controller.$render();

          // Not sure if I should just check for !isSelect OR if I should check for 'tags' key
          if (!opts.initSelection && !isSelect) {
            controller.$setViewValue(
              convertToAngularModel(elm.select2('data'))
            );
          }
        });
      };
    }
  };
}]);
/* Firebase v1.0.18 */ (function() {var h,aa=this;function n(a){return void 0!==a}function ba(){}function ca(a){a.tb=function(){return a.od?a.od:a.od=new a}}
function da(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b}function ea(a){return"array"==da(a)}function fa(a){var b=da(a);return"array"==b||"object"==b&&"number"==typeof a.length}function q(a){return"string"==typeof a}function ga(a){return"number"==typeof a}function ha(a){var b=typeof a;return"object"==b&&null!=a||"function"==b}function ia(a,b,c){return a.call.apply(a.bind,arguments)}
function ja(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}}function r(a,b,c){r=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?ia:ja;return r.apply(null,arguments)}
function ka(a,b){function c(){}c.prototype=b.prototype;a.ne=b.prototype;a.prototype=new c;a.le=function(a,c,f){return b.prototype[c].apply(a,Array.prototype.slice.call(arguments,2))}};function la(a){a=String(a);if(/^\s*$/.test(a)?0:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,"")))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);}function ma(){this.qc=void 0}
function na(a,b,c){switch(typeof b){case "string":oa(b,c);break;case "number":c.push(isFinite(b)&&!isNaN(b)?b:"null");break;case "boolean":c.push(b);break;case "undefined":c.push("null");break;case "object":if(null==b){c.push("null");break}if(ea(b)){var d=b.length;c.push("[");for(var e="",f=0;f<d;f++)c.push(e),e=b[f],na(a,a.qc?a.qc.call(b,String(f),e):e,c),e=",";c.push("]");break}c.push("{");d="";for(f in b)Object.prototype.hasOwnProperty.call(b,f)&&(e=b[f],"function"!=typeof e&&(c.push(d),oa(f,c),
c.push(":"),na(a,a.qc?a.qc.call(b,f,e):e,c),d=","));c.push("}");break;case "function":break;default:throw Error("Unknown type: "+typeof b);}}var pa={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\u000b"},qa=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g;
function oa(a,b){b.push('"',a.replace(qa,function(a){if(a in pa)return pa[a];var b=a.charCodeAt(0),e="\\u";16>b?e+="000":256>b?e+="00":4096>b&&(e+="0");return pa[a]=e+b.toString(16)}),'"')};function ra(a){return"undefined"!==typeof JSON&&n(JSON.parse)?JSON.parse(a):la(a)}function u(a){if("undefined"!==typeof JSON&&n(JSON.stringify))a=JSON.stringify(a);else{var b=[];na(new ma,a,b);a=b.join("")}return a};function sa(a){for(var b=[],c=0,d=0;d<a.length;d++){var e=a.charCodeAt(d);55296<=e&&56319>=e&&(e-=55296,d++,v(d<a.length,"Surrogate pair missing trail surrogate."),e=65536+(e<<10)+(a.charCodeAt(d)-56320));128>e?b[c++]=e:(2048>e?b[c++]=e>>6|192:(65536>e?b[c++]=e>>12|224:(b[c++]=e>>18|240,b[c++]=e>>12&63|128),b[c++]=e>>6&63|128),b[c++]=e&63|128)}return b};var ta={};function x(a,b,c,d){var e;d<b?e="at least "+b:d>c&&(e=0===c?"none":"no more than "+c);if(e)throw Error(a+" failed: Was called with "+d+(1===d?" argument.":" arguments.")+" Expects "+e+".");}
function y(a,b,c){var d="";switch(b){case 1:d=c?"first":"First";break;case 2:d=c?"second":"Second";break;case 3:d=c?"third":"Third";break;case 4:d=c?"fourth":"Fourth";break;default:ua.assert(!1,"errorPrefix_ called with argumentNumber > 4.  Need to update it?")}return a=a+" failed: "+(d+" argument ")}function z(a,b,c,d){if((!d||n(c))&&"function"!=da(c))throw Error(y(a,b,d)+"must be a valid function.");}
function va(a,b,c){if(n(c)&&(!ha(c)||null===c))throw Error(y(a,b,!0)+"must be a valid context object.");};function A(a,b){return Object.prototype.hasOwnProperty.call(a,b)}function wa(a,b){if(Object.prototype.hasOwnProperty.call(a,b))return a[b]};var ua={},xa=/[\[\].#$\/\u0000-\u001F\u007F]/,ya=/[\[\].#$\u0000-\u001F\u007F]/;function za(a){return q(a)&&0!==a.length&&!xa.test(a)}function Aa(a,b,c){c&&!n(b)||Ba(y(a,1,c),b)}
function Ba(a,b,c,d){c||(c=0);d=d||[];if(!n(b))throw Error(a+"contains undefined"+Ca(d));if("function"==da(b))throw Error(a+"contains a function"+Ca(d)+" with contents: "+b.toString());if(Da(b))throw Error(a+"contains "+b.toString()+Ca(d));if(1E3<c)throw new TypeError(a+"contains a cyclic object value ("+d.slice(0,100).join(".")+"...)");if(q(b)&&b.length>10485760/3&&10485760<sa(b).length)throw Error(a+"contains a string greater than 10485760 utf8 bytes"+Ca(d)+" ('"+b.substring(0,50)+"...')");if(ha(b))for(var e in b)if(A(b,
e)){var f=b[e];if(".priority"!==e&&".value"!==e&&".sv"!==e&&!za(e))throw Error(a+" contains an invalid key ("+e+")"+Ca(d)+'.  Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');d.push(e);Ba(a,f,c+1,d);d.pop()}}function Ca(a){return 0==a.length?"":" in property '"+a.join(".")+"'"}function Ea(a,b){if(!ha(b)||ea(b))throw Error(y(a,1,!1)+" must be an Object containing the children to replace.");Aa(a,b,!1)}
function Fa(a,b,c,d){if(!(d&&!n(c)||null===c||ga(c)||q(c)||ha(c)&&A(c,".sv")))throw Error(y(a,b,d)+"must be a valid firebase priority (a string, number, or null).");}function Ga(a,b,c){if(!c||n(b))switch(b){case "value":case "child_added":case "child_removed":case "child_changed":case "child_moved":break;default:throw Error(y(a,1,c)+'must be a valid event type: "value", "child_added", "child_removed", "child_changed", or "child_moved".');}}
function Ha(a,b){if(n(b)&&!za(b))throw Error(y(a,2,!0)+'was an invalid key: "'+b+'".  Firebase keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]").');}function Ia(a,b){if(!q(b)||0===b.length||ya.test(b))throw Error(y(a,1,!1)+'was an invalid path: "'+b+'". Paths must be non-empty strings and can\'t contain ".", "#", "$", "[", or "]"');}function B(a,b){if(".info"===C(b))throw Error(a+" failed: Can't modify data under /.info/");};function D(a,b,c,d,e,f,g){this.m=a;this.path=b;this.Ea=c;this.ea=d;this.ya=e;this.Ca=f;this.Za=g;if(n(this.ea)&&n(this.Ca)&&n(this.Ea))throw"Query: Can't combine startAt(), endAt(), and limit().";}D.prototype.Wc=function(){x("Query.ref",0,0,arguments.length);return new E(this.m,this.path)};D.prototype.ref=D.prototype.Wc;
D.prototype.hb=function(a,b){x("Query.on",2,4,arguments.length);Ga("Query.on",a,!1);z("Query.on",2,b,!1);var c=Ja("Query.on",arguments[2],arguments[3]);this.m.Tb(this,a,b,c.cancel,c.Z);return b};D.prototype.on=D.prototype.hb;D.prototype.Ab=function(a,b,c){x("Query.off",0,3,arguments.length);Ga("Query.off",a,!0);z("Query.off",2,b,!0);va("Query.off",3,c);this.m.pc(this,a,b,c)};D.prototype.off=D.prototype.Ab;
D.prototype.$d=function(a,b){function c(g){f&&(f=!1,e.Ab(a,c),b.call(d.Z,g))}x("Query.once",2,4,arguments.length);Ga("Query.once",a,!1);z("Query.once",2,b,!1);var d=Ja("Query.once",arguments[2],arguments[3]),e=this,f=!0;this.hb(a,c,function(b){e.Ab(a,c);d.cancel&&d.cancel.call(d.Z,b)})};D.prototype.once=D.prototype.$d;
D.prototype.Td=function(a){x("Query.limit",1,1,arguments.length);if(!ga(a)||Math.floor(a)!==a||0>=a)throw"Query.limit: First argument must be a positive integer.";return new D(this.m,this.path,a,this.ea,this.ya,this.Ca,this.Za)};D.prototype.limit=D.prototype.Td;D.prototype.Cd=function(a,b){x("Query.startAt",0,2,arguments.length);Fa("Query.startAt",1,a,!0);Ha("Query.startAt",b);n(a)||(b=a=null);return new D(this.m,this.path,this.Ea,a,b,this.Ca,this.Za)};D.prototype.startAt=D.prototype.Cd;
D.prototype.jd=function(a,b){x("Query.endAt",0,2,arguments.length);Fa("Query.endAt",1,a,!0);Ha("Query.endAt",b);return new D(this.m,this.path,this.Ea,this.ea,this.ya,a,b)};D.prototype.endAt=D.prototype.jd;D.prototype.Nd=function(a,b){x("Query.equalTo",1,2,arguments.length);Fa("Query.equalTo",1,a,!1);Ha("Query.equalTo",b);return this.Cd(a,b).jd(a,b)};D.prototype.equalTo=D.prototype.Nd;
function Ka(a){var b={};n(a.ea)&&(b.sp=a.ea);n(a.ya)&&(b.sn=a.ya);n(a.Ca)&&(b.ep=a.Ca);n(a.Za)&&(b.en=a.Za);n(a.Ea)&&(b.l=a.Ea);n(a.ea)&&n(a.ya)&&null===a.ea&&null===a.ya&&(b.vf="l");return b}D.prototype.Sa=function(){var a=La(Ka(this));return"{}"===a?"default":a};
function Ja(a,b,c){var d={};if(b&&c)d.cancel=b,z(a,3,d.cancel,!0),d.Z=c,va(a,4,d.Z);else if(b)if("object"===typeof b&&null!==b)d.Z=b;else if("function"===typeof b)d.cancel=b;else throw Error(ta.me(a,3,!0)+"must either be a cancel callback or a context object.");return d};function F(a,b){if(1==arguments.length){this.o=a.split("/");for(var c=0,d=0;d<this.o.length;d++)0<this.o[d].length&&(this.o[c]=this.o[d],c++);this.o.length=c;this.V=0}else this.o=a,this.V=b}function C(a){return a.V>=a.o.length?null:a.o[a.V]}function Ma(a){var b=a.V;b<a.o.length&&b++;return new F(a.o,b)}function Na(a){return a.V<a.o.length?a.o[a.o.length-1]:null}h=F.prototype;h.toString=function(){for(var a="",b=this.V;b<this.o.length;b++)""!==this.o[b]&&(a+="/"+this.o[b]);return a||"/"};
h.parent=function(){if(this.V>=this.o.length)return null;for(var a=[],b=this.V;b<this.o.length-1;b++)a.push(this.o[b]);return new F(a,0)};h.H=function(a){for(var b=[],c=this.V;c<this.o.length;c++)b.push(this.o[c]);if(a instanceof F)for(c=a.V;c<a.o.length;c++)b.push(a.o[c]);else for(a=a.split("/"),c=0;c<a.length;c++)0<a[c].length&&b.push(a[c]);return new F(b,0)};h.f=function(){return this.V>=this.o.length};h.length=function(){return this.o.length-this.V};
function Oa(a,b){var c=C(a);if(null===c)return b;if(c===C(b))return Oa(Ma(a),Ma(b));throw"INTERNAL ERROR: innerPath ("+b+") is not within outerPath ("+a+")";}h.contains=function(a){var b=this.V,c=a.V;if(this.length()>a.length())return!1;for(;b<this.o.length;){if(this.o[b]!==a.o[c])return!1;++b;++c}return!0};function Pa(){this.children={};this.Cc=0;this.value=null}function Qa(a,b,c){this.Fa=a?a:"";this.Gb=b?b:null;this.C=c?c:new Pa}function I(a,b){for(var c=b instanceof F?b:new F(b),d=a,e;null!==(e=C(c));)d=new Qa(e,d,wa(d.C.children,e)||new Pa),c=Ma(c);return d}h=Qa.prototype;h.j=function(){return this.C.value};function J(a,b){v("undefined"!==typeof b,"Cannot set value to undefined");a.C.value=b;Ra(a)}h.ub=function(){return 0<this.C.Cc};h.f=function(){return null===this.j()&&!this.ub()};
h.A=function(a){for(var b in this.C.children)a(new Qa(b,this,this.C.children[b]))};function Sa(a,b,c,d){c&&!d&&b(a);a.A(function(a){Sa(a,b,!0,d)});c&&d&&b(a)}function Ta(a,b,c){for(a=c?a:a.parent();null!==a;){if(b(a))return!0;a=a.parent()}return!1}h.path=function(){return new F(null===this.Gb?this.Fa:this.Gb.path()+"/"+this.Fa)};h.name=function(){return this.Fa};h.parent=function(){return this.Gb};
function Ra(a){if(null!==a.Gb){var b=a.Gb,c=a.Fa,d=a.f(),e=A(b.C.children,c);d&&e?(delete b.C.children[c],b.C.Cc--,Ra(b)):d||e||(b.C.children[c]=a.C,b.C.Cc++,Ra(b))}};function Ua(a,b){this.Wa=a?a:Va;this.da=b?b:Wa}function Va(a,b){return a<b?-1:a>b?1:0}h=Ua.prototype;h.sa=function(a,b){return new Ua(this.Wa,this.da.sa(a,b,this.Wa).K(null,null,!1,null,null))};h.remove=function(a){return new Ua(this.Wa,this.da.remove(a,this.Wa).K(null,null,!1,null,null))};h.get=function(a){for(var b,c=this.da;!c.f();){b=this.Wa(a,c.key);if(0===b)return c.value;0>b?c=c.left:0<b&&(c=c.right)}return null};
function Xa(a,b){for(var c,d=a.da,e=null;!d.f();){c=a.Wa(b,d.key);if(0===c){if(d.left.f())return e?e.key:null;for(d=d.left;!d.right.f();)d=d.right;return d.key}0>c?d=d.left:0<c&&(e=d,d=d.right)}throw Error("Attempted to find predecessor key for a nonexistent key.  What gives?");}h.f=function(){return this.da.f()};h.count=function(){return this.da.count()};h.zb=function(){return this.da.zb()};h.fb=function(){return this.da.fb()};h.Da=function(a){return this.da.Da(a)};h.Ta=function(a){return this.da.Ta(a)};
h.bb=function(a){return new Ya(this.da,a)};function Ya(a,b){this.xd=b;for(this.cc=[];!a.f();)this.cc.push(a),a=a.left}function Za(a){if(0===a.cc.length)return null;var b=a.cc.pop(),c;c=a.xd?a.xd(b.key,b.value):{key:b.key,value:b.value};for(b=b.right;!b.f();)a.cc.push(b),b=b.left;return c}function $a(a,b,c,d,e){this.key=a;this.value=b;this.color=null!=c?c:!0;this.left=null!=d?d:Wa;this.right=null!=e?e:Wa}h=$a.prototype;
h.K=function(a,b,c,d,e){return new $a(null!=a?a:this.key,null!=b?b:this.value,null!=c?c:this.color,null!=d?d:this.left,null!=e?e:this.right)};h.count=function(){return this.left.count()+1+this.right.count()};h.f=function(){return!1};h.Da=function(a){return this.left.Da(a)||a(this.key,this.value)||this.right.Da(a)};h.Ta=function(a){return this.right.Ta(a)||a(this.key,this.value)||this.left.Ta(a)};function cb(a){return a.left.f()?a:cb(a.left)}h.zb=function(){return cb(this).key};
h.fb=function(){return this.right.f()?this.key:this.right.fb()};h.sa=function(a,b,c){var d,e;e=this;d=c(a,e.key);e=0>d?e.K(null,null,null,e.left.sa(a,b,c),null):0===d?e.K(null,b,null,null,null):e.K(null,null,null,null,e.right.sa(a,b,c));return db(e)};function eb(a){if(a.left.f())return Wa;a.left.Q()||a.left.left.Q()||(a=fb(a));a=a.K(null,null,null,eb(a.left),null);return db(a)}
h.remove=function(a,b){var c,d;c=this;if(0>b(a,c.key))c.left.f()||c.left.Q()||c.left.left.Q()||(c=fb(c)),c=c.K(null,null,null,c.left.remove(a,b),null);else{c.left.Q()&&(c=gb(c));c.right.f()||c.right.Q()||c.right.left.Q()||(c=hb(c),c.left.left.Q()&&(c=gb(c),c=hb(c)));if(0===b(a,c.key)){if(c.right.f())return Wa;d=cb(c.right);c=c.K(d.key,d.value,null,null,eb(c.right))}c=c.K(null,null,null,null,c.right.remove(a,b))}return db(c)};h.Q=function(){return this.color};
function db(a){a.right.Q()&&!a.left.Q()&&(a=ib(a));a.left.Q()&&a.left.left.Q()&&(a=gb(a));a.left.Q()&&a.right.Q()&&(a=hb(a));return a}function fb(a){a=hb(a);a.right.left.Q()&&(a=a.K(null,null,null,null,gb(a.right)),a=ib(a),a=hb(a));return a}function ib(a){return a.right.K(null,null,a.color,a.K(null,null,!0,null,a.right.left),null)}function gb(a){return a.left.K(null,null,a.color,null,a.K(null,null,!0,a.left.right,null))}
function hb(a){return a.K(null,null,!a.color,a.left.K(null,null,!a.left.color,null,null),a.right.K(null,null,!a.right.color,null,null))}function jb(){}h=jb.prototype;h.K=function(){return this};h.sa=function(a,b){return new $a(a,b,null)};h.remove=function(){return this};h.count=function(){return 0};h.f=function(){return!0};h.Da=function(){return!1};h.Ta=function(){return!1};h.zb=function(){return null};h.fb=function(){return null};h.Q=function(){return!1};var Wa=new jb;function kb(a){this.Xb=a;this.lc="firebase:"}kb.prototype.set=function(a,b){null==b?this.Xb.removeItem(this.lc+a):this.Xb.setItem(this.lc+a,u(b))};kb.prototype.get=function(a){a=this.Xb.getItem(this.lc+a);return null==a?null:ra(a)};kb.prototype.remove=function(a){this.Xb.removeItem(this.lc+a)};kb.prototype.qd=!1;function lb(){this.pb={}}lb.prototype.set=function(a,b){null==b?delete this.pb[a]:this.pb[a]=b};lb.prototype.get=function(a){return A(this.pb,a)?this.pb[a]:null};lb.prototype.remove=function(a){delete this.pb[a]};lb.prototype.qd=!0;function mb(a){try{if("undefined"!==typeof window&&"undefined"!==typeof window[a]){var b=window[a];b.setItem("firebase:sentinel","cache");b.removeItem("firebase:sentinel");return new kb(b)}}catch(c){}return new lb}var nb=mb("localStorage"),ob=mb("sessionStorage");function pb(a,b,c,d){this.host=a.toLowerCase();this.domain=this.host.substr(this.host.indexOf(".")+1);this.rc=b;this.bc=c;this.je=d;this.ha=nb.get("host:"+a)||this.host}function qb(a,b){b!==a.ha&&(a.ha=b,"s-"===a.ha.substr(0,2)&&nb.set("host:"+a.host,a.ha))}pb.prototype.toString=function(){return(this.rc?"https://":"http://")+this.host};function rb(){this.qa=-1};function sb(){this.qa=-1;this.qa=64;this.D=[];this.Bc=[];this.Id=[];this.ic=[];this.ic[0]=128;for(var a=1;a<this.qa;++a)this.ic[a]=0;this.vc=this.eb=0;this.reset()}ka(sb,rb);sb.prototype.reset=function(){this.D[0]=1732584193;this.D[1]=4023233417;this.D[2]=2562383102;this.D[3]=271733878;this.D[4]=3285377520;this.vc=this.eb=0};
function tb(a,b,c){c||(c=0);var d=a.Id;if(q(b))for(var e=0;16>e;e++)d[e]=b.charCodeAt(c)<<24|b.charCodeAt(c+1)<<16|b.charCodeAt(c+2)<<8|b.charCodeAt(c+3),c+=4;else for(e=0;16>e;e++)d[e]=b[c]<<24|b[c+1]<<16|b[c+2]<<8|b[c+3],c+=4;for(e=16;80>e;e++){var f=d[e-3]^d[e-8]^d[e-14]^d[e-16];d[e]=(f<<1|f>>>31)&4294967295}b=a.D[0];c=a.D[1];for(var g=a.D[2],k=a.D[3],l=a.D[4],m,e=0;80>e;e++)40>e?20>e?(f=k^c&(g^k),m=1518500249):(f=c^g^k,m=1859775393):60>e?(f=c&g|k&(c|g),m=2400959708):(f=c^g^k,m=3395469782),f=(b<<
5|b>>>27)+f+l+m+d[e]&4294967295,l=k,k=g,g=(c<<30|c>>>2)&4294967295,c=b,b=f;a.D[0]=a.D[0]+b&4294967295;a.D[1]=a.D[1]+c&4294967295;a.D[2]=a.D[2]+g&4294967295;a.D[3]=a.D[3]+k&4294967295;a.D[4]=a.D[4]+l&4294967295}
sb.prototype.update=function(a,b){n(b)||(b=a.length);for(var c=b-this.qa,d=0,e=this.Bc,f=this.eb;d<b;){if(0==f)for(;d<=c;)tb(this,a,d),d+=this.qa;if(q(a))for(;d<b;){if(e[f]=a.charCodeAt(d),++f,++d,f==this.qa){tb(this,e);f=0;break}}else for(;d<b;)if(e[f]=a[d],++f,++d,f==this.qa){tb(this,e);f=0;break}}this.eb=f;this.vc+=b};var ub=Array.prototype,vb=ub.forEach?function(a,b,c){ub.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=q(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)},wb=ub.map?function(a,b,c){return ub.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=q(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e},xb=ub.reduce?function(a,b,c,d){d&&(b=r(b,d));return ub.reduce.call(a,b,c)}:function(a,b,c,d){var e=c;vb(a,function(c,g){e=b.call(d,e,c,g,a)});return e},
yb=ub.every?function(a,b,c){return ub.every.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=q(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&!b.call(c,e[f],f,a))return!1;return!0};function zb(a,b){var c;a:{c=a.length;for(var d=q(a)?a.split(""):a,e=0;e<c;e++)if(e in d&&b.call(void 0,d[e],e,a)){c=e;break a}c=-1}return 0>c?null:q(a)?a.charAt(c):a[c]};var Ab;a:{var Bb=aa.navigator;if(Bb){var Cb=Bb.userAgent;if(Cb){Ab=Cb;break a}}Ab=""}function Db(a){return-1!=Ab.indexOf(a)};var Eb=Db("Opera")||Db("OPR"),Fb=Db("Trident")||Db("MSIE"),Gb=Db("Gecko")&&-1==Ab.toLowerCase().indexOf("webkit")&&!(Db("Trident")||Db("MSIE")),Hb=-1!=Ab.toLowerCase().indexOf("webkit");(function(){var a="",b;if(Eb&&aa.opera)return a=aa.opera.version,"function"==da(a)?a():a;Gb?b=/rv\:([^\);]+)(\)|;)/:Fb?b=/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/:Hb&&(b=/WebKit\/(\S+)/);b&&(a=(a=b.exec(Ab))?a[1]:"");return Fb&&(b=(b=aa.document)?b.documentMode:void 0,b>parseFloat(a))?String(b):a})();var Ib=null,Jb=null;
function Kb(a,b){if(!fa(a))throw Error("encodeByteArray takes an array as a parameter");if(!Ib){Ib={};Jb={};for(var c=0;65>c;c++)Ib[c]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(c),Jb[c]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.".charAt(c)}for(var c=b?Jb:Ib,d=[],e=0;e<a.length;e+=3){var f=a[e],g=e+1<a.length,k=g?a[e+1]:0,l=e+2<a.length,m=l?a[e+2]:0,p=f>>2,f=(f&3)<<4|k>>4,k=(k&15)<<2|m>>6,m=m&63;l||(m=64,g||(k=64));d.push(c[p],c[f],c[k],c[m])}return d.join("")}
;var Lb=function(){var a=1;return function(){return a++}}();function v(a,b){if(!a)throw Error("Firebase INTERNAL ASSERT FAILED:"+b);}function Mb(a){var b=sa(a);a=new sb;a.update(b);var b=[],c=8*a.vc;56>a.eb?a.update(a.ic,56-a.eb):a.update(a.ic,a.qa-(a.eb-56));for(var d=a.qa-1;56<=d;d--)a.Bc[d]=c&255,c/=256;tb(a,a.Bc);for(d=c=0;5>d;d++)for(var e=24;0<=e;e-=8)b[c]=a.D[d]>>e&255,++c;return Kb(b)}
function Nb(a){for(var b="",c=0;c<arguments.length;c++)b=fa(arguments[c])?b+Nb.apply(null,arguments[c]):"object"===typeof arguments[c]?b+u(arguments[c]):b+arguments[c],b+=" ";return b}var Ob=null,Pb=!0;function K(a){!0===Pb&&(Pb=!1,null===Ob&&!0===ob.get("logging_enabled")&&Qb(!0));if(Ob){var b=Nb.apply(null,arguments);Ob(b)}}function Rb(a){return function(){K(a,arguments)}}
function Sb(a){if("undefined"!==typeof console){var b="FIREBASE INTERNAL ERROR: "+Nb.apply(null,arguments);"undefined"!==typeof console.error?console.error(b):console.log(b)}}function Tb(a){var b=Nb.apply(null,arguments);throw Error("FIREBASE FATAL ERROR: "+b);}function L(a){if("undefined"!==typeof console){var b="FIREBASE WARNING: "+Nb.apply(null,arguments);"undefined"!==typeof console.warn?console.warn(b):console.log(b)}}
function Da(a){return ga(a)&&(a!=a||a==Number.POSITIVE_INFINITY||a==Number.NEGATIVE_INFINITY)}function Ub(a){if("complete"===document.readyState)a();else{var b=!1,c=function(){document.body?b||(b=!0,a()):setTimeout(c,10)};document.addEventListener?(document.addEventListener("DOMContentLoaded",c,!1),window.addEventListener("load",c,!1)):document.attachEvent&&(document.attachEvent("onreadystatechange",function(){"complete"===document.readyState&&c()}),window.attachEvent("onload",c))}}
function Vb(a,b){return a!==b?null===a?-1:null===b?1:typeof a!==typeof b?"number"===typeof a?-1:1:a>b?1:-1:0}function Wb(a,b){if(a===b)return 0;var c=Xb(a),d=Xb(b);return null!==c?null!==d?0==c-d?a.length-b.length:c-d:-1:null!==d?1:a<b?-1:1}function Yb(a,b){if(b&&a in b)return b[a];throw Error("Missing required key ("+a+") in object: "+u(b));}
function La(a){if("object"!==typeof a||null===a)return u(a);var b=[],c;for(c in a)b.push(c);b.sort();c="{";for(var d=0;d<b.length;d++)0!==d&&(c+=","),c+=u(b[d]),c+=":",c+=La(a[b[d]]);return c+"}"}function Zb(a,b){if(a.length<=b)return[a];for(var c=[],d=0;d<a.length;d+=b)d+b>a?c.push(a.substring(d,a.length)):c.push(a.substring(d,d+b));return c}function $b(a,b){if(ea(a))for(var c=0;c<a.length;++c)b(c,a[c]);else ac(a,b)}function bc(a,b){return b?r(a,b):a}
function cc(a){v(!Da(a),"Invalid JSON number");var b,c,d,e;0===a?(d=c=0,b=-Infinity===1/a?1:0):(b=0>a,a=Math.abs(a),a>=Math.pow(2,-1022)?(d=Math.min(Math.floor(Math.log(a)/Math.LN2),1023),c=d+1023,d=Math.round(a*Math.pow(2,52-d)-Math.pow(2,52))):(c=0,d=Math.round(a/Math.pow(2,-1074))));e=[];for(a=52;a;a-=1)e.push(d%2?1:0),d=Math.floor(d/2);for(a=11;a;a-=1)e.push(c%2?1:0),c=Math.floor(c/2);e.push(b?1:0);e.reverse();b=e.join("");c="";for(a=0;64>a;a+=8)d=parseInt(b.substr(a,8),2).toString(16),1===d.length&&
(d="0"+d),c+=d;return c.toLowerCase()}function dc(a){var b="Unknown Error";"too_big"===a?b="The data requested exceeds the maximum size that can be accessed with a single request.":"permission_denied"==a?b="Client doesn't have permission to access the desired data.":"unavailable"==a&&(b="The service is unavailable");b=Error(a+": "+b);b.code=a.toUpperCase();return b}var ec=/^-?\d{1,10}$/;function Xb(a){return ec.test(a)&&(a=Number(a),-2147483648<=a&&2147483647>=a)?a:null}
function fc(a){try{a()}catch(b){setTimeout(function(){throw b;},0)}};function gc(a,b){this.G=a;v(null!==this.G,"LeafNode shouldn't be created with null value.");this.ib="undefined"!==typeof b?b:null}h=gc.prototype;h.P=function(){return!0};h.k=function(){return this.ib};h.Ia=function(a){return new gc(this.G,a)};h.O=function(){return M};h.L=function(a){return null===C(a)?this:M};h.ga=function(){return null};h.I=function(a,b){return(new N).I(a,b).Ia(this.ib)};h.Aa=function(a,b){var c=C(a);return null===c?b:this.I(c,M.Aa(Ma(a),b))};h.f=function(){return!1};h.dc=function(){return 0};
h.W=function(a){return a&&null!==this.k()?{".value":this.j(),".priority":this.k()}:this.j()};h.hash=function(){var a="";null!==this.k()&&(a+="priority:"+hc(this.k())+":");var b=typeof this.G,a=a+(b+":"),a="number"===b?a+cc(this.G):a+this.G;return Mb(a)};h.j=function(){return this.G};h.toString=function(){return"string"===typeof this.G?this.G:'"'+this.G+'"'};function ic(a,b){return Vb(a.ka,b.ka)||Wb(a.name,b.name)}function kc(a,b){return Wb(a.name,b.name)}function lc(a,b){return Wb(a,b)};function N(a,b){this.n=a||new Ua(lc);this.ib="undefined"!==typeof b?b:null}h=N.prototype;h.P=function(){return!1};h.k=function(){return this.ib};h.Ia=function(a){return new N(this.n,a)};h.I=function(a,b){var c=this.n.remove(a);b&&b.f()&&(b=null);null!==b&&(c=c.sa(a,b));return b&&null!==b.k()?new mc(c,null,this.ib):new N(c,this.ib)};h.Aa=function(a,b){var c=C(a);if(null===c)return b;var d=this.O(c).Aa(Ma(a),b);return this.I(c,d)};h.f=function(){return this.n.f()};h.dc=function(){return this.n.count()};
var nc=/^\d+$/;h=N.prototype;h.W=function(a){if(this.f())return null;var b={},c=0,d=0,e=!0;this.A(function(f,g){b[f]=g.W(a);c++;e&&nc.test(f)?d=Math.max(d,Number(f)):e=!1});if(!a&&e&&d<2*c){var f=[],g;for(g in b)f[g]=b[g];return f}a&&null!==this.k()&&(b[".priority"]=this.k());return b};h.hash=function(){var a="";null!==this.k()&&(a+="priority:"+hc(this.k())+":");this.A(function(b,c){var d=c.hash();""!==d&&(a+=":"+b+":"+d)});return""===a?"":Mb(a)};
h.O=function(a){a=this.n.get(a);return null===a?M:a};h.L=function(a){var b=C(a);return null===b?this:this.O(b).L(Ma(a))};h.ga=function(a){return Xa(this.n,a)};h.ld=function(){return this.n.zb()};h.nd=function(){return this.n.fb()};h.A=function(a){return this.n.Da(a)};h.Hc=function(a){return this.n.Ta(a)};h.bb=function(){return this.n.bb()};h.toString=function(){var a="{",b=!0;this.A(function(c,d){b?b=!1:a+=", ";a+='"'+c+'" : '+d.toString()});return a+="}"};var M=new N;function mc(a,b,c){N.call(this,a,c);null===b&&(b=new Ua(ic),a.Da(function(a,c){b=b.sa({name:a,ka:c.k()},c)}));this.xa=b}ka(mc,N);h=mc.prototype;h.I=function(a,b){var c=this.O(a),d=this.n,e=this.xa;null!==c&&(d=d.remove(a),e=e.remove({name:a,ka:c.k()}));b&&b.f()&&(b=null);null!==b&&(d=d.sa(a,b),e=e.sa({name:a,ka:b.k()},b));return new mc(d,e,this.k())};h.ga=function(a,b){var c=Xa(this.xa,{name:a,ka:b.k()});return c?c.name:null};h.A=function(a){return this.xa.Da(function(b,c){return a(b.name,c)})};
h.Hc=function(a){return this.xa.Ta(function(b,c){return a(b.name,c)})};h.bb=function(){return this.xa.bb(function(a,b){return{key:a.name,value:b}})};h.ld=function(){return this.xa.f()?null:this.xa.zb().name};h.nd=function(){return this.xa.f()?null:this.xa.fb().name};function O(a,b){if(null===a)return M;var c=null;"object"===typeof a&&".priority"in a?c=a[".priority"]:"undefined"!==typeof b&&(c=b);v(null===c||"string"===typeof c||"number"===typeof c||"object"===typeof c&&".sv"in c,"Invalid priority type found: "+typeof c);"object"===typeof a&&".value"in a&&null!==a[".value"]&&(a=a[".value"]);if("object"!==typeof a||".sv"in a)return new gc(a,c);if(a instanceof Array){var d=M,e=a;ac(e,function(a,b){if(A(e,b)&&"."!==b.substring(0,1)){var c=O(a);if(c.P()||!c.f())d=
d.I(b,c)}});return d.Ia(c)}var f=[],g={},k=!1,l=a;$b(l,function(a,b){if("string"!==typeof b||"."!==b.substring(0,1)){var c=O(l[b]);c.f()||(k=k||null!==c.k(),f.push({name:b,ka:c.k()}),g[b]=c)}});var m=oc(f,g,!1);if(k){var p=oc(f,g,!0);return new mc(m,p,c)}return new N(m,c)}var pc=Math.log(2);function qc(a){this.count=parseInt(Math.log(a+1)/pc,10);this.gd=this.count-1;this.Kd=a+1&parseInt(Array(this.count+1).join("1"),2)}function rc(a){var b=!(a.Kd&1<<a.gd);a.gd--;return b}
function oc(a,b,c){function d(e,f){var l=f-e;if(0==l)return null;if(1==l){var l=a[e].name,m=c?a[e]:l;return new $a(m,b[l],!1,null,null)}var m=parseInt(l/2,10)+e,p=d(e,m),t=d(m+1,f),l=a[m].name,m=c?a[m]:l;return new $a(m,b[l],!1,p,t)}var e=c?ic:kc;a.sort(e);var f=function(e){function f(e,g){var k=p-e,t=p;p-=e;var s=a[k].name,k=new $a(c?a[k]:s,b[s],g,null,d(k+1,t));l?l.left=k:m=k;l=k}for(var l=null,m=null,p=a.length,t=0;t<e.count;++t){var s=rc(e),w=Math.pow(2,e.count-(t+1));s?f(w,!1):(f(w,!1),f(w,!0))}return m}(new qc(a.length)),
e=c?ic:lc;return null!==f?new Ua(e,f):new Ua(e)}function hc(a){return"number"===typeof a?"number:"+cc(a):"string:"+a};function P(a,b){this.C=a;this.oc=b}P.prototype.W=function(){x("Firebase.DataSnapshot.val",0,0,arguments.length);return this.C.W()};P.prototype.val=P.prototype.W;P.prototype.Od=function(){x("Firebase.DataSnapshot.exportVal",0,0,arguments.length);return this.C.W(!0)};P.prototype.exportVal=P.prototype.Od;P.prototype.H=function(a){x("Firebase.DataSnapshot.child",0,1,arguments.length);ga(a)&&(a=String(a));Ia("Firebase.DataSnapshot.child",a);var b=new F(a),c=this.oc.H(b);return new P(this.C.L(b),c)};
P.prototype.child=P.prototype.H;P.prototype.Kc=function(a){x("Firebase.DataSnapshot.hasChild",1,1,arguments.length);Ia("Firebase.DataSnapshot.hasChild",a);var b=new F(a);return!this.C.L(b).f()};P.prototype.hasChild=P.prototype.Kc;P.prototype.k=function(){x("Firebase.DataSnapshot.getPriority",0,0,arguments.length);return this.C.k()};P.prototype.getPriority=P.prototype.k;
P.prototype.forEach=function(a){x("Firebase.DataSnapshot.forEach",1,1,arguments.length);z("Firebase.DataSnapshot.forEach",1,a,!1);if(this.C.P())return!1;var b=this;return this.C.A(function(c,d){return a(new P(d,b.oc.H(c)))})};P.prototype.forEach=P.prototype.forEach;P.prototype.ub=function(){x("Firebase.DataSnapshot.hasChildren",0,0,arguments.length);return this.C.P()?!1:!this.C.f()};P.prototype.hasChildren=P.prototype.ub;
P.prototype.name=function(){x("Firebase.DataSnapshot.name",0,0,arguments.length);return this.oc.name()};P.prototype.name=P.prototype.name;P.prototype.dc=function(){x("Firebase.DataSnapshot.numChildren",0,0,arguments.length);return this.C.dc()};P.prototype.numChildren=P.prototype.dc;P.prototype.Wc=function(){x("Firebase.DataSnapshot.ref",0,0,arguments.length);return this.oc};P.prototype.ref=P.prototype.Wc;function sc(a){v(ea(a)&&0<a.length,"Requires a non-empty array");this.Jd=a;this.yb={}}sc.prototype.dd=function(a,b){for(var c=this.yb[a]||[],d=0;d<c.length;d++)c[d].ba.apply(c[d].Z,Array.prototype.slice.call(arguments,1))};sc.prototype.hb=function(a,b,c){tc(this,a);this.yb[a]=this.yb[a]||[];this.yb[a].push({ba:b,Z:c});(a=this.md(a))&&b.apply(c,a)};sc.prototype.Ab=function(a,b,c){tc(this,a);a=this.yb[a]||[];for(var d=0;d<a.length;d++)if(a[d].ba===b&&(!c||c===a[d].Z)){a.splice(d,1);break}};
function tc(a,b){v(zb(a.Jd,function(a){return a===b}),"Unknown event: "+b)};function uc(){sc.call(this,["visible"]);var a,b;"undefined"!==typeof document&&"undefined"!==typeof document.addEventListener&&("undefined"!==typeof document.hidden?(b="visibilitychange",a="hidden"):"undefined"!==typeof document.mozHidden?(b="mozvisibilitychange",a="mozHidden"):"undefined"!==typeof document.msHidden?(b="msvisibilitychange",a="msHidden"):"undefined"!==typeof document.webkitHidden&&(b="webkitvisibilitychange",a="webkitHidden"));this.nb=!0;if(b){var c=this;document.addEventListener(b,
function(){var b=!document[a];b!==c.nb&&(c.nb=b,c.dd("visible",b))},!1)}}ka(uc,sc);ca(uc);uc.prototype.md=function(a){v("visible"===a,"Unknown event type: "+a);return[this.nb]};function vc(){sc.call(this,["online"]);this.Eb=!0;if("undefined"!==typeof window&&"undefined"!==typeof window.addEventListener){var a=this;window.addEventListener("online",function(){a.Eb||a.dd("online",!0);a.Eb=!0},!1);window.addEventListener("offline",function(){a.Eb&&a.dd("online",!1);a.Eb=!1},!1)}}ka(vc,sc);ca(vc);vc.prototype.md=function(a){v("online"===a,"Unknown event type: "+a);return[this.Eb]};function ac(a,b){for(var c in a)b.call(void 0,a[c],c,a)}function wc(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b}function xc(a){var b={},c;for(c in a)b[c]=a[c];return b};function yc(){this.qb={}}function zc(a,b,c){n(c)||(c=1);A(a.qb,b)||(a.qb[b]=0);a.qb[b]+=c}yc.prototype.get=function(){return xc(this.qb)};function Ac(a){this.Ld=a;this.Zb=null}Ac.prototype.get=function(){var a=this.Ld.get(),b=xc(a);if(this.Zb)for(var c in this.Zb)b[c]-=this.Zb[c];this.Zb=a;return b};function Bc(a,b){this.ad={};this.uc=new Ac(a);this.u=b;setTimeout(r(this.vd,this),10+6E4*Math.random())}Bc.prototype.vd=function(){var a=this.uc.get(),b={},c=!1,d;for(d in a)0<a[d]&&A(this.ad,d)&&(b[d]=a[d],c=!0);c&&(a=this.u,a.S&&(b={c:b},a.e("reportStats",b),a.Ga("s",b)));setTimeout(r(this.vd,this),6E5*Math.random())};var Cc={},Dc={};function Ec(a){a=a.toString();Cc[a]||(Cc[a]=new yc);return Cc[a]}function Fc(a,b){var c=a.toString();Dc[c]||(Dc[c]=b());return Dc[c]};var Gc=null;"undefined"!==typeof MozWebSocket?Gc=MozWebSocket:"undefined"!==typeof WebSocket&&(Gc=WebSocket);function Q(a,b,c){this.Ec=a;this.e=Rb(this.Ec);this.frames=this.wb=null;this.Ja=this.Ka=this.cd=0;this.fa=Ec(b);this.Xa=(b.rc?"wss://":"ws://")+b.ha+"/.ws?v=5";b.host!==b.ha&&(this.Xa=this.Xa+"&ns="+b.bc);c&&(this.Xa=this.Xa+"&s="+c)}var Hc;
Q.prototype.open=function(a,b){this.ja=b;this.Xd=a;this.e("Websocket connecting to "+this.Xa);this.X=new Gc(this.Xa);this.rb=!1;nb.set("previous_websocket_failure",!0);var c=this;this.X.onopen=function(){c.e("Websocket connected.");c.rb=!0};this.X.onclose=function(){c.e("Websocket connection was disconnected.");c.X=null;c.Ra()};this.X.onmessage=function(a){if(null!==c.X)if(a=a.data,c.Ja+=a.length,zc(c.fa,"bytes_received",a.length),Ic(c),null!==c.frames)Jc(c,a);else{a:{v(null===c.frames,"We already have a frame buffer");
if(6>=a.length){var b=Number(a);if(!isNaN(b)){c.cd=b;c.frames=[];a=null;break a}}c.cd=1;c.frames=[]}null!==a&&Jc(c,a)}};this.X.onerror=function(a){c.e("WebSocket error.  Closing connection.");(a=a.message||a.data)&&c.e(a);c.Ra()}};Q.prototype.start=function(){};Q.isAvailable=function(){var a=!1;if("undefined"!==typeof navigator&&navigator.userAgent){var b=navigator.userAgent.match(/Android ([0-9]{0,}\.[0-9]{0,})/);b&&1<b.length&&4.4>parseFloat(b[1])&&(a=!0)}return!a&&null!==Gc&&!Hc};
Q.responsesRequiredToBeHealthy=2;Q.healthyTimeout=3E4;h=Q.prototype;h.$b=function(){nb.remove("previous_websocket_failure")};function Jc(a,b){a.frames.push(b);if(a.frames.length==a.cd){var c=a.frames.join("");a.frames=null;c=ra(c);a.Xd(c)}}h.send=function(a){Ic(this);a=u(a);this.Ka+=a.length;zc(this.fa,"bytes_sent",a.length);a=Zb(a,16384);1<a.length&&this.X.send(String(a.length));for(var b=0;b<a.length;b++)this.X.send(a[b])};
h.Ob=function(){this.Oa=!0;this.wb&&(clearInterval(this.wb),this.wb=null);this.X&&(this.X.close(),this.X=null)};h.Ra=function(){this.Oa||(this.e("WebSocket is closing itself"),this.Ob(),this.ja&&(this.ja(this.rb),this.ja=null))};h.close=function(){this.Oa||(this.e("WebSocket is being closed"),this.Ob())};function Ic(a){clearInterval(a.wb);a.wb=setInterval(function(){a.X&&a.X.send("0");Ic(a)},45E3)};function Kc(a){this.Rc=a;this.kc=[];this.Ya=0;this.Dc=-1;this.Qa=null}function Lc(a,b,c){a.Dc=b;a.Qa=c;a.Dc<a.Ya&&(a.Qa(),a.Qa=null)}function Mc(a,b,c){for(a.kc[b]=c;a.kc[a.Ya];){var d=a.kc[a.Ya];delete a.kc[a.Ya];for(var e=0;e<d.length;++e)if(d[e]){var f=a;fc(function(){f.Rc(d[e])})}if(a.Ya===a.Dc){a.Qa&&(clearTimeout(a.Qa),a.Qa(),a.Qa=null);break}a.Ya++}};function Nc(){this.set={}}h=Nc.prototype;h.add=function(a,b){this.set[a]=null!==b?b:!0};h.contains=function(a){return A(this.set,a)};h.get=function(a){return this.contains(a)?this.set[a]:void 0};h.remove=function(a){delete this.set[a]};h.f=function(){var a;a:{a=this.set;for(var b in a){a=!1;break a}a=!0}return a};h.count=function(){var a=this.set,b=0,c;for(c in a)b++;return b};function R(a,b){ac(a.set,function(a,d){b(d,a)})}h.keys=function(){var a=[];ac(this.set,function(b,c){a.push(c)});return a};function Oc(a,b,c){this.Ec=a;this.e=Rb(a);this.Ja=this.Ka=0;this.fa=Ec(b);this.tc=c;this.rb=!1;this.Sb=function(a){b.host!==b.ha&&(a.ns=b.bc);var c=[],f;for(f in a)a.hasOwnProperty(f)&&c.push(f+"="+a[f]);return(b.rc?"https://":"http://")+b.ha+"/.lp?"+c.join("&")}}var Pc,Qc;
Oc.prototype.open=function(a,b){this.fd=0;this.T=b;this.rd=new Kc(a);this.Oa=!1;var c=this;this.La=setTimeout(function(){c.e("Timed out trying to connect.");c.Ra();c.La=null},3E4);Ub(function(){if(!c.Oa){c.ma=new Rc(function(a,b,d,k,l){Sc(c,arguments);if(c.ma)if(c.La&&(clearTimeout(c.La),c.La=null),c.rb=!0,"start"==a)c.id=b,c.ud=d;else if("close"===a)b?(c.ma.sc=!1,Lc(c.rd,b,function(){c.Ra()})):c.Ra();else throw Error("Unrecognized command received: "+a);},function(a,b){Sc(c,arguments);Mc(c.rd,a,
b)},function(){c.Ra()},c.Sb);var a={start:"t"};a.ser=Math.floor(1E8*Math.random());c.ma.wc&&(a.cb=c.ma.wc);a.v="5";c.tc&&(a.s=c.tc);a=c.Sb(a);c.e("Connecting via long-poll to "+a);Tc(c.ma,a,function(){})}})};Oc.prototype.start=function(){var a=this.ma,b=this.ud;a.Vd=this.id;a.Wd=b;for(a.zc=!0;Wc(a););a=this.id;b=this.ud;this.gb=document.createElement("iframe");var c={dframe:"t"};c.id=a;c.pw=b;this.gb.src=this.Sb(c);this.gb.style.display="none";document.body.appendChild(this.gb)};
Oc.isAvailable=function(){return!Qc&&!("object"===typeof window&&window.chrome&&window.chrome.extension&&!/^chrome/.test(window.location.href))&&!("object"===typeof Windows&&"object"===typeof Windows.ke)&&(Pc||!0)};h=Oc.prototype;h.$b=function(){};h.Ob=function(){this.Oa=!0;this.ma&&(this.ma.close(),this.ma=null);this.gb&&(document.body.removeChild(this.gb),this.gb=null);this.La&&(clearTimeout(this.La),this.La=null)};
h.Ra=function(){this.Oa||(this.e("Longpoll is closing itself"),this.Ob(),this.T&&(this.T(this.rb),this.T=null))};h.close=function(){this.Oa||(this.e("Longpoll is being closed."),this.Ob())};h.send=function(a){a=u(a);this.Ka+=a.length;zc(this.fa,"bytes_sent",a.length);a=sa(a);a=Kb(a,!0);a=Zb(a,1840);for(var b=0;b<a.length;b++){var c=this.ma;c.Ib.push({ee:this.fd,ie:a.length,hd:a[b]});c.zc&&Wc(c);this.fd++}};function Sc(a,b){var c=u(b).length;a.Ja+=c;zc(a.fa,"bytes_received",c)}
function Rc(a,b,c,d){this.Sb=d;this.ja=c;this.Tc=new Nc;this.Ib=[];this.Fc=Math.floor(1E8*Math.random());this.sc=!0;this.wc=Lb();window["pLPCommand"+this.wc]=a;window["pRTLPCB"+this.wc]=b;a=document.createElement("iframe");a.style.display="none";if(document.body){document.body.appendChild(a);try{a.contentWindow.document||K("No IE domain setting required")}catch(e){a.src="javascript:void((function(){document.open();document.domain='"+document.domain+"';document.close();})())"}}else throw"Document body has not initialized. Wait to initialize Firebase until after the document is ready.";
a.contentDocument?a.Ba=a.contentDocument:a.contentWindow?a.Ba=a.contentWindow.document:a.document&&(a.Ba=a.document);this.$=a;a="";this.$.src&&"javascript:"===this.$.src.substr(0,11)&&(a='<script>document.domain="'+document.domain+'";\x3c/script>');a="<html><body>"+a+"</body></html>";try{this.$.Ba.open(),this.$.Ba.write(a),this.$.Ba.close()}catch(f){K("frame writing exception"),f.stack&&K(f.stack),K(f)}}
Rc.prototype.close=function(){this.zc=!1;if(this.$){this.$.Ba.body.innerHTML="";var a=this;setTimeout(function(){null!==a.$&&(document.body.removeChild(a.$),a.$=null)},0)}var b=this.ja;b&&(this.ja=null,b())};
function Wc(a){if(a.zc&&a.sc&&a.Tc.count()<(0<a.Ib.length?2:1)){a.Fc++;var b={};b.id=a.Vd;b.pw=a.Wd;b.ser=a.Fc;for(var b=a.Sb(b),c="",d=0;0<a.Ib.length;)if(1870>=a.Ib[0].hd.length+30+c.length){var e=a.Ib.shift(),c=c+"&seg"+d+"="+e.ee+"&ts"+d+"="+e.ie+"&d"+d+"="+e.hd;d++}else break;Xc(a,b+c,a.Fc);return!0}return!1}function Xc(a,b,c){function d(){a.Tc.remove(c);Wc(a)}a.Tc.add(c);var e=setTimeout(d,25E3);Tc(a,b,function(){clearTimeout(e);d()})}
function Tc(a,b,c){setTimeout(function(){try{if(a.sc){var d=a.$.Ba.createElement("script");d.type="text/javascript";d.async=!0;d.src=b;d.onload=d.onreadystatechange=function(){var a=d.readyState;a&&"loaded"!==a&&"complete"!==a||(d.onload=d.onreadystatechange=null,d.parentNode&&d.parentNode.removeChild(d),c())};d.onerror=function(){K("Long-poll script failed to load: "+b);a.sc=!1;a.close()};a.$.Ba.body.appendChild(d)}}catch(e){}},1)};function Yc(a){Zc(this,a)}var $c=[Oc,Q];function Zc(a,b){var c=Q&&Q.isAvailable(),d=c&&!(nb.qd||!0===nb.get("previous_websocket_failure"));b.je&&(c||L("wss:// URL used, but browser isn't known to support websockets.  Trying anyway."),d=!0);if(d)a.Pb=[Q];else{var e=a.Pb=[];$b($c,function(a,b){b&&b.isAvailable()&&e.push(b)})}}function ad(a){if(0<a.Pb.length)return a.Pb[0];throw Error("No transports available");};function bd(a,b,c,d,e,f){this.id=a;this.e=Rb("c:"+this.id+":");this.Rc=c;this.Db=d;this.T=e;this.Qc=f;this.N=b;this.jc=[];this.ed=0;this.Ed=new Yc(b);this.na=0;this.e("Connection created");cd(this)}
function cd(a){var b=ad(a.Ed);a.B=new b("c:"+a.id+":"+a.ed++,a.N);a.Vc=b.responsesRequiredToBeHealthy||0;var c=dd(a,a.B),d=ed(a,a.B);a.Qb=a.B;a.Nb=a.B;a.w=null;a.Pa=!1;setTimeout(function(){a.B&&a.B.open(c,d)},0);b=b.healthyTimeout||0;0<b&&(a.Yb=setTimeout(function(){a.Yb=null;a.Pa||(a.B&&102400<a.B.Ja?(a.e("Connection exceeded healthy timeout but has received "+a.B.Ja+" bytes.  Marking connection healthy."),a.Pa=!0,a.B.$b()):a.B&&10240<a.B.Ka?a.e("Connection exceeded healthy timeout but has sent "+
a.B.Ka+" bytes.  Leaving connection alive."):(a.e("Closing unhealthy connection after timeout."),a.close()))},b))}function ed(a,b){return function(c){b===a.B?(a.B=null,c||0!==a.na?1===a.na&&a.e("Realtime connection lost."):(a.e("Realtime connection failed."),"s-"===a.N.ha.substr(0,2)&&(nb.remove("host:"+a.N.host),a.N.ha=a.N.host)),a.close()):b===a.w?(a.e("Secondary connection lost."),c=a.w,a.w=null,a.Qb!==c&&a.Nb!==c||a.close()):a.e("closing an old connection")}}
function dd(a,b){return function(c){if(2!=a.na)if(b===a.Nb){var d=Yb("t",c);c=Yb("d",c);if("c"==d){if(d=Yb("t",c),"d"in c)if(c=c.d,"h"===d){var d=c.ts,e=c.v,f=c.h;a.tc=c.s;qb(a.N,f);0==a.na&&(a.B.start(),fd(a,a.B,d),"5"!==e&&L("Protocol version mismatch detected"),c=a.Ed,(c=1<c.Pb.length?c.Pb[1]:null)&&gd(a,c))}else if("n"===d){a.e("recvd end transmission on primary");a.Nb=a.w;for(c=0;c<a.jc.length;++c)a.gc(a.jc[c]);a.jc=[];hd(a)}else"s"===d?(a.e("Connection shutdown command received. Shutting down..."),
a.Qc&&(a.Qc(c),a.Qc=null),a.T=null,a.close()):"r"===d?(a.e("Reset packet received.  New host: "+c),qb(a.N,c),1===a.na?a.close():(id(a),cd(a))):"e"===d?Sb("Server Error: "+c):"o"===d?(a.e("got pong on primary."),jd(a),kd(a)):Sb("Unknown control packet command: "+d)}else"d"==d&&a.gc(c)}else if(b===a.w)if(d=Yb("t",c),c=Yb("d",c),"c"==d)"t"in c&&(c=c.t,"a"===c?ld(a):"r"===c?(a.e("Got a reset on secondary, closing it"),a.w.close(),a.Qb!==a.w&&a.Nb!==a.w||a.close()):"o"===c&&(a.e("got pong on secondary."),
a.zd--,ld(a)));else if("d"==d)a.jc.push(c);else throw Error("Unknown protocol layer: "+d);else a.e("message on old connection")}}bd.prototype.Ad=function(a){md(this,{t:"d",d:a})};function hd(a){a.Qb===a.w&&a.Nb===a.w&&(a.e("cleaning up and promoting a connection: "+a.w.Ec),a.B=a.w,a.w=null)}
function ld(a){0>=a.zd?(a.e("Secondary connection is healthy."),a.Pa=!0,a.w.$b(),a.w.start(),a.e("sending client ack on secondary"),a.w.send({t:"c",d:{t:"a",d:{}}}),a.e("Ending transmission on primary"),a.B.send({t:"c",d:{t:"n",d:{}}}),a.Qb=a.w,hd(a)):(a.e("sending ping on secondary."),a.w.send({t:"c",d:{t:"p",d:{}}}))}bd.prototype.gc=function(a){jd(this);this.Rc(a)};function jd(a){a.Pa||(a.Vc--,0>=a.Vc&&(a.e("Primary connection is healthy."),a.Pa=!0,a.B.$b()))}
function gd(a,b){a.w=new b("c:"+a.id+":"+a.ed++,a.N,a.tc);a.zd=b.responsesRequiredToBeHealthy||0;a.w.open(dd(a,a.w),ed(a,a.w));setTimeout(function(){a.w&&(a.e("Timed out trying to upgrade."),a.w.close())},6E4)}function fd(a,b,c){a.e("Realtime connection established.");a.B=b;a.na=1;a.Db&&(a.Db(c),a.Db=null);0===a.Vc?(a.e("Primary connection is healthy."),a.Pa=!0):setTimeout(function(){kd(a)},5E3)}function kd(a){a.Pa||1!==a.na||(a.e("sending ping on primary."),md(a,{t:"c",d:{t:"p",d:{}}}))}
function md(a,b){if(1!==a.na)throw"Connection is not connected";a.Qb.send(b)}bd.prototype.close=function(){2!==this.na&&(this.e("Closing realtime connection."),this.na=2,id(this),this.T&&(this.T(),this.T=null))};function id(a){a.e("Shutting down all connections");a.B&&(a.B.close(),a.B=null);a.w&&(a.w.close(),a.w=null);a.Yb&&(clearTimeout(a.Yb),a.Yb=null)};function nd(a,b,c,d,e,f){this.id=od++;this.e=Rb("p:"+this.id+":");this.Ua=!0;this.ia={};this.U=[];this.Fb=0;this.Cb=[];this.S=!1;this.ua=1E3;this.ac=3E5;this.hc=b||ba;this.fc=c||ba;this.Bb=d||ba;this.Sc=e||ba;this.Jc=f||ba;this.N=a;this.Xc=null;this.Mb={};this.de=0;this.xb=this.Nc=null;pd(this,0);uc.tb().hb("visible",this.Zd,this);-1===a.host.indexOf("fblocal")&&vc.tb().hb("online",this.Yd,this)}var od=0,qd=0;h=nd.prototype;
h.Ga=function(a,b,c){var d=++this.de;a={r:d,a:a,b:b};this.e(u(a));v(this.S,"sendRequest_ call when we're not connected not allowed.");this.la.Ad(a);c&&(this.Mb[d]=c)};function rd(a,b,c){var d=b.toString(),e=b.path().toString();a.ia[e]=a.ia[e]||{};v(!a.ia[e][d],"listen() called twice for same path/queryId.");a.ia[e][d]={jb:b.jb(),F:c};a.S&&sd(a,e,d,b.jb(),c)}
function sd(a,b,c,d,e){a.e("Listen on "+b+" for "+c);var f={p:b};d=wb(d,function(a){return Ka(a)});"{}"!==c&&(f.q=d);f.h=a.Jc(b);a.Ga("l",f,function(d){a.e("listen response",d);d=d.s;"ok"!==d&&td(a,b,c);e&&e(d)})}
h.ob=function(a,b,c){this.Ma={Md:a,kd:!1,ba:b,Ub:c};this.e("Authenticating using credential: "+this.Ma);ud(this);if(!(b=40==a.length))a:{var d;try{var e=a.split(".");if(3!==e.length){b=!1;break a}var f;b:{try{if("undefined"!==typeof atob){f=atob(e[1]);break b}}catch(g){K("base64DecodeIfNativeSupport failed: ",g)}f=null}null!==f&&(d=ra(f))}catch(k){K("isAdminAuthToken_ failed",k)}b="object"===typeof d&&!0===wa(d,"admin")}b&&(this.e("Admin auth credential detected.  Reducing max reconnect time."),this.ac=
3E4)};h.Rb=function(a){delete this.Ma;this.Bb(!1);this.S&&this.Ga("unauth",{},function(b){a(b.s,b.d)})};function ud(a){var b=a.Ma;a.S&&b&&a.Ga("auth",{cred:b.Md},function(c){var d=c.s;c=c.d||"error";"ok"!==d&&a.Ma===b&&delete a.Ma;a.Bb("ok"===d);b.kd?"ok"!==d&&b.Ub&&b.Ub(d,c):(b.kd=!0,b.ba&&b.ba(d,c))})}function vd(a,b,c,d){b=b.toString();td(a,b,c)&&a.S&&wd(a,b,c,d)}function wd(a,b,c,d){a.e("Unlisten on "+b+" for "+c);b={p:b};d=wb(d,function(a){return Ka(a)});"{}"!==c&&(b.q=d);a.Ga("u",b)}
function xd(a,b,c,d){a.S?yd(a,"o",b,c,d):a.Cb.push({Uc:b,action:"o",data:c,F:d})}function zd(a,b,c,d){a.S?yd(a,"om",b,c,d):a.Cb.push({Uc:b,action:"om",data:c,F:d})}h.Pc=function(a,b){this.S?yd(this,"oc",a,null,b):this.Cb.push({Uc:a,action:"oc",data:null,F:b})};function yd(a,b,c,d,e){c={p:c,d:d};a.e("onDisconnect "+b,c);a.Ga(b,c,function(a){e&&setTimeout(function(){e(a.s,a.d)},0)})}h.put=function(a,b,c,d){Ad(this,"p",a,b,c,d)};function Bd(a,b,c,d){Ad(a,"m",b,c,d,void 0)}
function Ad(a,b,c,d,e,f){c={p:c,d:d};n(f)&&(c.h=f);a.U.push({action:b,wd:c,F:e});a.Fb++;b=a.U.length-1;a.S&&Cd(a,b)}function Cd(a,b){var c=a.U[b].action,d=a.U[b].wd,e=a.U[b].F;a.U[b].ae=a.S;a.Ga(c,d,function(d){a.e(c+" response",d);delete a.U[b];a.Fb--;0===a.Fb&&(a.U=[]);e&&e(d.s,d.d)})}
h.gc=function(a){if("r"in a){this.e("from server: "+u(a));var b=a.r,c=this.Mb[b];c&&(delete this.Mb[b],c(a.b))}else{if("error"in a)throw"A server-side error has occurred: "+a.error;"a"in a&&(b=a.a,c=a.b,this.e("handleServerMessage",b,c),"d"===b?this.hc(c.p,c.d,!1):"m"===b?this.hc(c.p,c.d,!0):"c"===b?Dd(this,c.p,c.q):"ac"===b?(a=c.s,b=c.d,c=this.Ma,delete this.Ma,c&&c.Ub&&c.Ub(a,b),this.Bb(!1)):"sd"===b?this.Xc?this.Xc(c):"msg"in c&&"undefined"!==typeof console&&console.log("FIREBASE: "+c.msg.replace("\n",
"\nFIREBASE: ")):Sb("Unrecognized action received from server: "+u(b)+"\nAre you using the latest client?"))}};h.Db=function(a){this.e("connection ready");this.S=!0;this.xb=(new Date).getTime();this.Sc({serverTimeOffset:a-(new Date).getTime()});ud(this);for(var b in this.ia)for(var c in this.ia[b])a=this.ia[b][c],sd(this,b,c,a.jb,a.F);for(b=0;b<this.U.length;b++)this.U[b]&&Cd(this,b);for(;this.Cb.length;)b=this.Cb.shift(),yd(this,b.action,b.Uc,b.data,b.F);this.fc(!0)};
function pd(a,b){v(!a.la,"Scheduling a connect when we're already connected/ing?");a.$a&&clearTimeout(a.$a);a.$a=setTimeout(function(){a.$a=null;Ed(a)},b)}h.Zd=function(a){a&&!this.nb&&this.ua===this.ac&&(this.e("Window became visible.  Reducing delay."),this.ua=1E3,this.la||pd(this,0));this.nb=a};h.Yd=function(a){a?(this.e("Browser went online.  Reconnecting."),this.ua=1E3,this.Ua=!0,this.la||pd(this,0)):(this.e("Browser went offline.  Killing connection; don't reconnect."),this.Ua=!1,this.la&&this.la.close())};
h.sd=function(){this.e("data client disconnected");this.S=!1;this.la=null;for(var a=0;a<this.U.length;a++){var b=this.U[a];b&&"h"in b.wd&&b.ae&&(b.F&&b.F("disconnect"),delete this.U[a],this.Fb--)}0===this.Fb&&(this.U=[]);if(this.Ua)this.nb?this.xb&&(3E4<(new Date).getTime()-this.xb&&(this.ua=1E3),this.xb=null):(this.e("Window isn't visible.  Delaying reconnect."),this.ua=this.ac,this.Nc=(new Date).getTime()),a=Math.max(0,this.ua-((new Date).getTime()-this.Nc)),a*=Math.random(),this.e("Trying to reconnect in "+
a+"ms"),pd(this,a),this.ua=Math.min(this.ac,1.3*this.ua);else for(var c in this.Mb)delete this.Mb[c];this.fc(!1)};function Ed(a){if(a.Ua){a.e("Making a connection attempt");a.Nc=(new Date).getTime();a.xb=null;var b=r(a.gc,a),c=r(a.Db,a),d=r(a.sd,a),e=a.id+":"+qd++;a.la=new bd(e,a.N,b,c,d,function(b){L(b+" ("+a.N.toString()+")");a.Ua=!1})}}h.Na=function(){this.Ua=!1;this.la?this.la.close():(this.$a&&(clearTimeout(this.$a),this.$a=null),this.S&&this.sd())};
h.lb=function(){this.Ua=!0;this.ua=1E3;this.S||pd(this,0)};function Dd(a,b,c){c=c?wb(c,function(a){return La(a)}).join("$"):"{}";(a=td(a,b,c))&&a.F&&a.F("permission_denied")}function td(a,b,c){b=(new F(b)).toString();c||(c="{}");var d=a.ia[b][c];delete a.ia[b][c];return d};function Fd(){this.n=this.G=null}function Gd(a,b,c){if(b.f())a.G=c,a.n=null;else if(null!==a.G)a.G=a.G.Aa(b,c);else{null==a.n&&(a.n=new Nc);var d=C(b);a.n.contains(d)||a.n.add(d,new Fd);a=a.n.get(d);b=Ma(b);Gd(a,b,c)}}function Hd(a,b){if(b.f())return a.G=null,a.n=null,!0;if(null!==a.G){if(a.G.P())return!1;var c=a.G;a.G=null;c.A(function(b,c){Gd(a,new F(b),c)});return Hd(a,b)}return null!==a.n?(c=C(b),b=Ma(b),a.n.contains(c)&&Hd(a.n.get(c),b)&&a.n.remove(c),a.n.f()?(a.n=null,!0):!1):!0}
function Id(a,b,c){null!==a.G?c(b,a.G):a.A(function(a,e){var f=new F(b.toString()+"/"+a);Id(e,f,c)})}Fd.prototype.A=function(a){null!==this.n&&R(this.n,function(b,c){a(b,c)})};function Jd(){this.aa=M}function S(a,b){return a.aa.L(b)}function T(a,b,c){a.aa=a.aa.Aa(b,c)}Jd.prototype.toString=function(){return this.aa.toString()};function Kd(){this.va=new Jd;this.M=new Jd;this.pa=new Jd;this.Hb=new Qa}function Ld(a,b,c){T(a.va,b,c);return Md(a,b)}function Md(a,b){for(var c=S(a.va,b),d=S(a.M,b),e=I(a.Hb,b),f=!1,g=e;null!==g;){if(null!==g.j()){f=!0;break}g=g.parent()}if(f)return!1;c=Nd(c,d,e);return c!==d?(T(a.M,b,c),!0):!1}function Nd(a,b,c){if(c.f())return a;if(null!==c.j())return b;a=a||M;c.A(function(d){d=d.name();var e=a.O(d),f=b.O(d),g=I(c,d),e=Nd(e,f,g);a=a.I(d,e)});return a}
Kd.prototype.set=function(a,b){var c=this,d=[];vb(b,function(a){var b=a.path;a=a.ta;var g=Lb();J(I(c.Hb,b),g);T(c.M,b,a);d.push({path:b,fe:g})});return d};function Od(a,b){vb(b,function(b){var d=b.fe;b=I(a.Hb,b.path);var e=b.j();v(null!==e,"pendingPut should not be null.");e===d&&J(b,null)})};function Pd(a,b){return a&&"object"===typeof a?(v(".sv"in a,"Unexpected leaf node or priority contents"),b[a[".sv"]]):a}function Qd(a,b){var c=new Fd;Id(a,new F(""),function(a,e){Gd(c,a,Rd(e,b))});return c}function Rd(a,b){var c=Pd(a.k(),b),d;if(a.P()){var e=Pd(a.j(),b);return e!==a.j()||c!==a.k()?new gc(e,c):a}d=a;c!==a.k()&&(d=d.Ia(c));a.A(function(a,c){var e=Rd(c,b);e!==c&&(d=d.I(a,e))});return d};function Sd(){this.ab=[]}function Td(a,b){if(0!==b.length)for(var c=0;c<b.length;c++)a.ab.push(b[c])}Sd.prototype.Kb=function(){for(var a=0;a<this.ab.length;a++)if(this.ab[a]){var b=this.ab[a];this.ab[a]=null;Ud(b)}this.ab=[]};function Ud(a){var b=a.ba,c=a.Bd,d=a.Jb;fc(function(){b(c,d)})};function U(a,b,c,d){this.type=a;this.wa=b;this.ca=c;this.Jb=d};function Vd(a){this.R=a;this.ra=[];this.Gc=new Sd}function Wd(a,b,c,d,e){a.ra.push({type:b,ba:c,cancel:d,Z:e});d=[];var f=Xd(a.i);a.vb&&f.push(new U("value",a.i));for(var g=0;g<f.length;g++)if(f[g].type===b){var k=new E(a.R.m,a.R.path);f[g].ca&&(k=k.H(f[g].ca));d.push({ba:bc(c,e),Bd:new P(f[g].wa,k),Jb:f[g].Jb})}Td(a.Gc,d)}Vd.prototype.mc=function(a,b){b=this.nc(a,b);null!=b&&Yd(this,b)};
function Yd(a,b){for(var c=[],d=0;d<b.length;d++){var e=b[d],f=e.type,g=new E(a.R.m,a.R.path);b[d].ca&&(g=g.H(b[d].ca));g=new P(b[d].wa,g);"value"!==e.type||g.ub()?"value"!==e.type&&(f+=" "+g.name()):f+="("+g.W()+")";K(a.R.m.u.id+": event:"+a.R.path+":"+a.R.Sa()+":"+f);for(f=0;f<a.ra.length;f++){var k=a.ra[f];b[d].type===k.type&&c.push({ba:bc(k.ba,k.Z),Bd:g,Jb:e.Jb})}}Td(a.Gc,c)}Vd.prototype.Kb=function(){this.Gc.Kb()};
function Xd(a){var b=[];if(!a.P()){var c=null;a.A(function(a,e){b.push(new U("child_added",e,a,c));c=a})}return b}function Zd(a){a.vb||(a.vb=!0,Yd(a,[new U("value",a.i)]))};function $d(a,b){Vd.call(this,a);this.i=b}ka($d,Vd);$d.prototype.nc=function(a,b){this.i=a;this.vb&&null!=b&&b.push(new U("value",this.i));return b};$d.prototype.sb=function(){return{}};function ae(a,b){this.Wb=a;this.Oc=b}function be(a,b,c,d,e){var f=a.L(c),g=b.L(c);d=new ae(d,e);e=ce(d,c,f,g);g=!f.f()&&!g.f()&&f.k()!==g.k();if(e||g)for(f=c,c=e;null!==f.parent();){var k=a.L(f);e=b.L(f);var l=f.parent();if(!d.Wb||I(d.Wb,l).j()){var m=b.L(l),p=[],f=Na(f);k.f()?(k=m.ga(f,e),p.push(new U("child_added",e,f,k))):e.f()?p.push(new U("child_removed",k,f)):(k=m.ga(f,e),g&&p.push(new U("child_moved",e,f,k)),c&&p.push(new U("child_changed",e,f,k)));d.Oc(l,m,p)}g&&(g=!1,c=!0);f=l}}
function ce(a,b,c,d){var e,f=[];c===d?e=!1:c.P()&&d.P()?e=c.j()!==d.j():c.P()?(de(a,b,M,d,f),e=!0):d.P()?(de(a,b,c,M,f),e=!0):e=de(a,b,c,d,f);e?a.Oc(b,d,f):c.k()!==d.k()&&a.Oc(b,d,null);return e}
function de(a,b,c,d,e){var f=!1,g=!a.Wb||!I(a.Wb,b).f(),k=[],l=[],m=[],p=[],t={},s={},w,V,G,H;w=c.bb();G=Za(w);V=d.bb();for(H=Za(V);null!==G||null!==H;){c=H;c=null===G?1:null===c?-1:G.key===c.key?0:ic({name:G.key,ka:G.value.k()},{name:c.key,ka:c.value.k()});if(0>c)f=wa(t,G.key),n(f)?(m.push({Ic:G,bd:k[f]}),k[f]=null):(s[G.key]=l.length,l.push(G)),f=!0,G=Za(w);else{if(0<c)f=wa(s,H.key),n(f)?(m.push({Ic:l[f],bd:H}),l[f]=null):(t[H.key]=k.length,k.push(H)),f=!0;else{c=b.H(H.key);if(c=ce(a,c,G.value,
H.value))p.push(H),f=!0;G.value.k()!==H.value.k()&&(m.push({Ic:G,bd:H}),f=!0);G=Za(w)}H=Za(V)}if(!g&&f)return!0}for(g=0;g<l.length;g++)if(t=l[g])c=b.H(t.key),ce(a,c,t.value,M),e.push(new U("child_removed",t.value,t.key));for(g=0;g<k.length;g++)if(t=k[g])c=b.H(t.key),l=d.ga(t.key,t.value),ce(a,c,M,t.value),e.push(new U("child_added",t.value,t.key,l));for(g=0;g<m.length;g++)t=m[g].Ic,k=m[g].bd,c=b.H(k.key),l=d.ga(k.key,k.value),e.push(new U("child_moved",k.value,k.key,l)),(c=ce(a,c,t.value,k.value))&&
p.push(k);for(g=0;g<p.length;g++)a=p[g],l=d.ga(a.key,a.value),e.push(new U("child_changed",a.value,a.key,l));return f};function ee(){this.Y=this.za=null;this.set={}}ka(ee,Nc);h=ee.prototype;h.setActive=function(a){this.za=a};function fe(a,b,c){a.add(b,c);a.Y||(a.Y=c.R.path)}function ge(a){var b=a.za;a.za=null;return b}function he(a){return a.contains("default")}function ie(a){return null!=a.za&&he(a)}h.defaultView=function(){return he(this)?this.get("default"):null};h.path=function(){return this.Y};h.toString=function(){return wb(this.keys(),function(a){return"default"===a?"{}":a}).join("$")};
h.jb=function(){var a=[];R(this,function(b,c){a.push(c.R)});return a};function je(a,b){Vd.call(this,a);this.i=M;this.nc(b,Xd(b))}ka(je,Vd);
je.prototype.nc=function(a,b){if(null===b)return b;var c=[],d=this.R;n(d.ea)&&(n(d.ya)&&null!=d.ya?c.push(function(a,b){var c=Vb(b,d.ea);return 0<c||0===c&&0<=Wb(a,d.ya)}):c.push(function(a,b){return 0<=Vb(b,d.ea)}));n(d.Ca)&&(n(d.Za)?c.push(function(a,b){var c=Vb(b,d.Ca);return 0>c||0===c&&0>=Wb(a,d.Za)}):c.push(function(a,b){return 0>=Vb(b,d.Ca)}));var e=null,f=null;if(n(this.R.Ea))if(n(this.R.ea)){if(e=ke(a,c,this.R.Ea,!1)){var g=a.O(e).k();c.push(function(a,b){var c=Vb(b,g);return 0>c||0===c&&
0>=Wb(a,e)})}}else if(f=ke(a,c,this.R.Ea,!0)){var k=a.O(f).k();c.push(function(a,b){var c=Vb(b,k);return 0<c||0===c&&0<=Wb(a,f)})}for(var l=[],m=[],p=[],t=[],s=0;s<b.length;s++){var w=b[s].ca,V=b[s].wa;switch(b[s].type){case "child_added":le(c,w,V)&&(this.i=this.i.I(w,V),m.push(b[s]));break;case "child_removed":this.i.O(w).f()||(this.i=this.i.I(w,null),l.push(b[s]));break;case "child_changed":!this.i.O(w).f()&&le(c,w,V)&&(this.i=this.i.I(w,V),t.push(b[s]));break;case "child_moved":var G=!this.i.O(w).f(),
H=le(c,w,V);G?H?(this.i=this.i.I(w,V),p.push(b[s])):(l.push(new U("child_removed",this.i.O(w),w)),this.i=this.i.I(w,null)):H&&(this.i=this.i.I(w,V),m.push(b[s]))}}var Uc=e||f;if(Uc){var Vc=(s=null!==f)?this.i.ld():this.i.nd(),jc=!1,ab=!1,bb=this;(s?a.Hc:a.A).call(a,function(a,b){ab||null!==Vc||(ab=!0);if(ab&&jc)return!0;jc?(l.push(new U("child_removed",bb.i.O(a),a)),bb.i=bb.i.I(a,null)):ab&&(m.push(new U("child_added",b,a)),bb.i=bb.i.I(a,b));Vc===a&&(ab=!0);a===Uc&&(jc=!0)})}for(s=0;s<m.length;s++)c=
m[s],w=this.i.ga(c.ca,c.wa),l.push(new U("child_added",c.wa,c.ca,w));for(s=0;s<p.length;s++)c=p[s],w=this.i.ga(c.ca,c.wa),l.push(new U("child_moved",c.wa,c.ca,w));for(s=0;s<t.length;s++)c=t[s],w=this.i.ga(c.ca,c.wa),l.push(new U("child_changed",c.wa,c.ca,w));this.vb&&0<l.length&&l.push(new U("value",this.i));return l};function ke(a,b,c,d){if(a.P())return null;var e=null;(d?a.Hc:a.A).call(a,function(a,d){if(le(b,a,d)&&(e=a,c--,0===c))return!0});return e}
function le(a,b,c){for(var d=0;d<a.length;d++)if(!a[d](b,c.k()))return!1;return!0}je.prototype.Kc=function(a){return this.i.O(a)!==M};
je.prototype.sb=function(a,b,c){var d={};this.i.P()||this.i.A(function(a){d[a]=3});var e=this.i;c=S(c,new F(""));var f=new Qa;J(I(f,this.R.path),!0);b=M.Aa(a,b);var g=this;be(c,b,a,f,function(a,b,c){null!==c&&a.toString()===g.R.path.toString()&&g.nc(b,c)});this.i.P()?ac(d,function(a,b){d[b]=2}):(this.i.A(function(a){A(d,a)||(d[a]=1)}),ac(d,function(a,b){g.i.O(b).f()&&(d[b]=2)}));this.i=e;return d};function me(a,b){this.u=a;this.g=b;this.ec=b.aa;this.oa=new Qa}me.prototype.Tb=function(a,b,c,d,e){var f=a.path,g=I(this.oa,f),k=g.j();null===k?(k=new ee,J(g,k)):v(!k.f(),"We shouldn't be storing empty QueryMaps");var l=a.Sa();if(k.contains(l))a=k.get(l),Wd(a,b,c,d,e);else{var m=this.g.aa.L(f);a=ne(a,m);oe(this,g,k,l,a);Wd(a,b,c,d,e);(b=(b=Ta(I(this.oa,f),function(a){var b;if(b=a.j()&&a.j().defaultView())b=a.j().defaultView().vb;if(b)return!0},!0))||null===this.u&&!S(this.g,f).f())&&Zd(a)}a.Kb()};
function pe(a,b,c,d,e){var f=a.get(b),g;if(g=f){g=!1;for(var k=f.ra.length-1;0<=k;k--){var l=f.ra[k];if(!(c&&l.type!==c||d&&l.ba!==d||e&&l.Z!==e)&&(f.ra.splice(k,1),g=!0,c&&d))break}}(c=g&&!(0<f.ra.length))&&a.remove(b);return c}function qe(a,b,c,d,e){b=b?b.Sa():null;var f=[];b&&"default"!==b?pe(a,b,c,d,e)&&f.push(b):vb(a.keys(),function(b){pe(a,b,c,d,e)&&f.push(b)});return f}me.prototype.pc=function(a,b,c,d){var e=I(this.oa,a.path).j();return null===e?null:re(this,e,a,b,c,d)};
function re(a,b,c,d,e,f){var g=b.path(),g=I(a.oa,g);c=qe(b,c,d,e,f);b.f()&&J(g,null);d=se(g);if(0<c.length&&!d){d=g;e=g.parent();for(c=!1;!c&&e;){if(f=e.j()){v(!ie(f));var k=d.name(),l=!1;R(f,function(a,b){l=b.Kc(k)||l});l&&(c=!0)}d=e;e=e.parent()}d=null;ie(b)||(b=ge(b),d=te(a,g),b&&b());return c?null:d}return null}function ue(a,b,c){Sa(I(a.oa,b),function(a){(a=a.j())&&R(a,function(a,b){Zd(b)})},c,!0)}
function W(a,b,c){function d(a){do{if(g[a.toString()])return!0;a=a.parent()}while(null!==a);return!1}var e=a.ec,f=a.g.aa;a.ec=f;for(var g={},k=0;k<c.length;k++)g[c[k].toString()]=!0;be(e,f,b,a.oa,function(c,e,f){if(b.contains(c)){var g=d(c);g&&ue(a,c,!1);a.mc(c,e,f);g&&ue(a,c,!0)}else a.mc(c,e,f)});d(b)&&ue(a,b,!0);ve(a,b)}function ve(a,b){var c=I(a.oa,b);Sa(c,function(a){(a=a.j())&&R(a,function(a,b){b.Kb()})},!0,!0);Ta(c,function(a){(a=a.j())&&R(a,function(a,b){b.Kb()})},!1)}
me.prototype.mc=function(a,b,c){a=I(this.oa,a).j();null!==a&&R(a,function(a,e){e.mc(b,c)})};function se(a){return Ta(a,function(a){return a.j()&&ie(a.j())})}function oe(a,b,c,d,e){if(ie(c)||se(b))fe(c,d,e);else{var f,g;c.f()||(f=c.toString(),g=c.jb());fe(c,d,e);c.setActive(we(a,c));f&&g&&vd(a.u,c.path(),f,g)}ie(c)&&Sa(b,function(a){if(a=a.j())a.za&&a.za(),a.za=null})}
function te(a,b){function c(b){var f=b.j();if(f&&he(f))d.push(f.path()),null==f.za&&f.setActive(we(a,f));else{if(f){null!=f.za||f.setActive(we(a,f));var g={};R(f,function(a,b){b.i.A(function(a){A(g,a)||(g[a]=!0,a=f.path().H(a),d.push(a))})})}b.A(c)}}var d=[];c(b);return d}
function we(a,b){if(a.u){var c=a.u,d=b.path(),e=b.toString(),f=b.jb(),g,k=b.keys(),l=he(b);rd(a.u,b,function(c){"ok"!==c?(c=dc(c),L("on() or once() for "+b.path().toString()+" failed: "+c.toString()),xe(a,b,c)):g||(l?ue(a,b.path(),!0):vb(k,function(a){(a=b.get(a))&&Zd(a)}),ve(a,b.path()))});return function(){g=!0;vd(c,d,e,f)}}return ba}function xe(a,b,c){b&&(R(b,function(a,b){for(var f=0;f<b.ra.length;f++){var g=b.ra[f];g.cancel&&bc(g.cancel,g.Z)(c)}}),re(a,b))}
function ne(a,b){return"default"===a.Sa()?new $d(a,b):new je(a,b)}me.prototype.sb=function(a,b,c,d){function e(a){ac(a,function(a,b){f[b]=3===a?3:(wa(f,b)||a)===a?a:3})}var f={};R(b,function(b,f){e(f.sb(a,c,d))});c.P()||c.A(function(a){A(f,a)||(f[a]=4)});return f};function ye(a,b,c,d,e){var f=b.path();b=a.sb(f,b,d,e);var g=M,k=[];ac(b,function(b,m){var p=new F(m);3===b||1===b?g=g.I(m,d.L(p)):(2===b&&k.push({path:f.H(m),ta:M}),k=k.concat(ze(a,d.L(p),I(c,p),e)))});return[{path:f,ta:g}].concat(k)}
function Ae(a,b,c,d){var e;a:{var f=I(a.oa,b);e=f.parent();for(var g=[];null!==e;){var k=e.j();if(null!==k){if(he(k)){e=[{path:b,ta:c}];break a}k=a.sb(b,k,c,d);f=wa(k,f.name());if(3===f||1===f){e=[{path:b,ta:c}];break a}2===f&&g.push({path:b,ta:M})}f=e;e=e.parent()}e=g}if(1==e.length&&(!e[0].ta.f()||c.f()))return e;g=I(a.oa,b);f=g.j();null!==f?he(f)?e.push({path:b,ta:c}):e=e.concat(ye(a,f,g,c,d)):e=e.concat(ze(a,c,g,d));return e}
function ze(a,b,c,d){var e=c.j();if(null!==e)return he(e)?[{path:c.path(),ta:b}]:ye(a,e,c,b,d);var f=[];c.A(function(c){var e=b.P()?M:b.O(c.name());c=ze(a,e,c,d);f=f.concat(c)});return f};function Be(a){this.N=a;this.fa=Ec(a);this.u=new nd(this.N,r(this.hc,this),r(this.fc,this),r(this.Bb,this),r(this.Sc,this),r(this.Jc,this));this.Dd=Fc(a,r(function(){return new Bc(this.fa,this.u)},this));this.Va=new Qa;this.Ha=new Jd;this.g=new Kd;this.J=new me(this.u,this.g.pa);this.Lc=new Jd;this.Mc=new me(null,this.Lc);Ce(this,"connected",!1);Ce(this,"authenticated",!1);this.T=new Fd;this.Vb=0}h=Be.prototype;h.toString=function(){return(this.N.rc?"https://":"http://")+this.N.host};h.name=function(){return this.N.bc};
function De(a){a=S(a.Lc,new F(".info/serverTimeOffset")).W()||0;return(new Date).getTime()+a}function Ee(a){a=a={timestamp:De(a)};a.timestamp=a.timestamp||(new Date).getTime();return a}
h.hc=function(a,b,c){this.Vb++;this.pd&&(b=this.pd(a,b));var d,e,f=[];9<=a.length&&a.lastIndexOf(".priority")===a.length-9?(d=new F(a.substring(0,a.length-9)),e=S(this.g.va,d).Ia(b),f.push(d)):c?(d=new F(a),e=S(this.g.va,d),ac(b,function(a,b){var c=new F(b);".priority"===b?e=e.Ia(a):(e=e.Aa(c,O(a)),f.push(d.H(b)))})):(d=new F(a),e=O(b),f.push(d));a=Ae(this.J,d,e,this.g.M);b=!1;for(c=0;c<a.length;++c){var g=a[c];b=Ld(this.g,g.path,g.ta)||b}b&&(d=Fe(this,d));W(this.J,d,f)};
h.fc=function(a){Ce(this,"connected",a);!1===a&&Ge(this)};h.Sc=function(a){var b=this;$b(a,function(a,d){Ce(b,d,a)})};h.Jc=function(a){a=new F(a);return S(this.g.va,a).hash()};h.Bb=function(a){Ce(this,"authenticated",a)};function Ce(a,b,c){b=new F("/.info/"+b);T(a.Lc,b,O(c));W(a.Mc,b,[b])}
h.ob=function(a,b,c){"firebaseio-demo.com"===this.N.domain&&L("FirebaseRef.auth() not supported on demo (*.firebaseio-demo.com) Firebases. Please use on production (*.firebaseio.com) Firebases only.");this.u.ob(a,function(a,c){X(b,a,c)},function(a,b){L("auth() was canceled: "+b);if(c){var f=Error(b);f.code=a.toUpperCase();c(f)}})};h.Rb=function(a){this.u.Rb(function(b,c){X(a,b,c)})};
h.mb=function(a,b,c,d){this.e("set",{path:a.toString(),value:b,ka:c});var e=Ee(this);b=O(b,c);var e=Rd(b,e),e=Ae(this.J,a,e,this.g.M),f=this.g.set(a,e),g=this;this.u.put(a.toString(),b.W(!0),function(b,c){"ok"!==b&&L("set at "+a+" failed: "+b);Od(g.g,f);Md(g.g,a);var e=Fe(g,a);W(g.J,e,[]);X(d,b,c)});e=He(this,a);Fe(this,e);W(this.J,e,[a])};
h.update=function(a,b,c){this.e("update",{path:a.toString(),value:b});var d=S(this.g.pa,a),e=!0,f=[],g=Ee(this),k=[],l;for(l in b){var e=!1,m=O(b[l]),m=Rd(m,g),d=d.I(l,m),p=a.H(l);f.push(p);m=Ae(this.J,p,m,this.g.M);k=k.concat(this.g.set(a,m))}if(e)K("update() called with empty data.  Don't do anything."),X(c,"ok");else{var t=this;Bd(this.u,a.toString(),b,function(b,d){v("ok"===b||"permission_denied"===b,"merge at "+a+" failed.");"ok"!==b&&L("update at "+a+" failed: "+b);Od(t.g,k);Md(t.g,a);var e=
Fe(t,a);W(t.J,e,[]);X(c,b,d)});b=He(this,a);Fe(this,b);W(t.J,b,f)}};h.Yc=function(a,b,c){this.e("setPriority",{path:a.toString(),ka:b});var d=Ee(this),d=Pd(b,d),d=S(this.g.M,a).Ia(d),d=Ae(this.J,a,d,this.g.M),e=this.g.set(a,d),f=this;this.u.put(a.toString()+"/.priority",b,function(b,d){"permission_denied"===b&&L("setPriority at "+a+" failed: "+b);Od(f.g,e);Md(f.g,a);var l=Fe(f,a);W(f.J,l,[]);X(c,b,d)});b=Fe(this,a);W(f.J,b,[])};
function Ge(a){a.e("onDisconnectEvents");var b=[],c=Ee(a);Id(Qd(a.T,c),new F(""),function(c,e){var f=Ae(a.J,c,e,a.g.M);b.push.apply(b,a.g.set(c,f));f=He(a,c);Fe(a,f);W(a.J,f,[c])});Od(a.g,b);a.T=new Fd}h.Pc=function(a,b){var c=this;this.u.Pc(a.toString(),function(d,e){"ok"===d&&Hd(c.T,a);X(b,d,e)})};function Ie(a,b,c,d){var e=O(c);xd(a.u,b.toString(),e.W(!0),function(c,g){"ok"===c&&Gd(a.T,b,e);X(d,c,g)})}
function Je(a,b,c,d,e){var f=O(c,d);xd(a.u,b.toString(),f.W(!0),function(c,d){"ok"===c&&Gd(a.T,b,f);X(e,c,d)})}function Ke(a,b,c,d){var e=!0,f;for(f in c)e=!1;e?(K("onDisconnect().update() called with empty data.  Don't do anything."),X(d,"ok")):zd(a.u,b.toString(),c,function(e,f){if("ok"===e)for(var l in c){var m=O(c[l]);Gd(a.T,b.H(l),m)}X(d,e,f)})}function Le(a){zc(a.fa,"deprecated_on_disconnect");a.Dd.ad.deprecated_on_disconnect=!0}
h.Tb=function(a,b,c,d,e){".info"===C(a.path)?this.Mc.Tb(a,b,c,d,e):this.J.Tb(a,b,c,d,e)};h.pc=function(a,b,c,d){if(".info"===C(a.path))this.Mc.pc(a,b,c,d);else{b=this.J.pc(a,b,c,d);if(c=null!==b){c=this.g;d=a.path;for(var e=[],f=0;f<b.length;++f)e[f]=S(c.va,b[f]);T(c.va,d,M);for(f=0;f<b.length;++f)T(c.va,b[f],e[f]);c=Md(c,d)}c&&(v(this.g.pa.aa===this.J.ec,"We should have raised any outstanding events by now.  Else, we'll blow them away."),T(this.g.pa,a.path,S(this.g.M,a.path)),this.J.ec=this.g.pa.aa)}};
h.Na=function(){this.u.Na()};h.lb=function(){this.u.lb()};h.Zc=function(a){if("undefined"!==typeof console){a?(this.uc||(this.uc=new Ac(this.fa)),a=this.uc.get()):a=this.fa.get();var b=xb(wc(a),function(a,b){return Math.max(b.length,a)},0),c;for(c in a){for(var d=a[c],e=c.length;e<b+2;e++)c+=" ";console.log(c+d)}}};h.$c=function(a){zc(this.fa,a);this.Dd.ad[a]=!0};h.e=function(){K("r:"+this.u.id+":",arguments)};
function X(a,b,c){a&&fc(function(){if("ok"==b)a(null,c);else{var d=(b||"error").toUpperCase(),e=d;c&&(e+=": "+c);e=Error(e);e.code=d;a(e)}})};function Me(a,b,c,d,e){function f(){}a.e("transaction on "+b);var g=new E(a,b);g.hb("value",f);c={path:b,update:c,F:d,status:null,td:Lb(),Ac:e,yd:0,xc:function(){g.Ab("value",f)},yc:null};a.Ha.aa=Ne(a,a.Ha.aa,a.g.M.aa,a.Va);d=c.update(S(a.Ha,b).W());if(n(d)){Ba("transaction failed: Data returned ",d);c.status=1;e=I(a.Va,b);var k=e.j()||[];k.push(c);J(e,k);k="object"===typeof d&&null!==d&&A(d,".priority")?d[".priority"]:S(a.g.M,b).k();e=Ee(a);d=O(d,k);d=Rd(d,e);T(a.Ha,b,d);c.Ac&&(T(a.g.pa,b,d),W(a.J,
b,[b]));Oe(a)}else c.xc(),c.F&&(a=Pe(a,b),c.F(null,!1,a))}function Oe(a,b){var c=b||a.Va;b||Qe(a,c);if(null!==c.j()){var d=Re(a,c);v(0<d.length);yb(d,function(a){return 1===a.status})&&Se(a,c.path(),d)}else c.ub()&&c.A(function(b){Oe(a,b)})}
function Se(a,b,c){for(var d=0;d<c.length;d++)v(1===c[d].status,"tryToSendTransactionQueue_: items in queue should all be run."),c[d].status=2,c[d].yd++;var e=S(a.g.M,b).hash();T(a.g.M,b,S(a.g.pa,b));for(var f=S(a.Ha,b).W(!0),g=Lb(),k=Te(c),d=0;d<k.length;d++)J(I(a.g.Hb,k[d]),g);a.u.put(b.toString(),f,function(e){a.e("transaction put response",{path:b.toString(),status:e});for(d=0;d<k.length;d++){var f=I(a.g.Hb,k[d]),p=f.j();v(null!==p,"sendTransactionQueue_: pendingPut should not be null.");p===
g&&(J(f,null),T(a.g.M,k[d],S(a.g.va,k[d])))}if("ok"===e){e=[];for(d=0;d<c.length;d++)c[d].status=3,c[d].F&&(f=Pe(a,c[d].path),e.push(r(c[d].F,null,null,!0,f))),c[d].xc();Qe(a,I(a.Va,b));Oe(a);for(d=0;d<e.length;d++)fc(e[d])}else{if("datastale"===e)for(d=0;d<c.length;d++)c[d].status=4===c[d].status?5:1;else for(L("transaction at "+b+" failed: "+e),d=0;d<c.length;d++)c[d].status=5,c[d].yc=e;e=Fe(a,b);W(a.J,e,[b])}},e)}
function Te(a){for(var b={},c=0;c<a.length;c++)a[c].Ac&&(b[a[c].path.toString()]=a[c].path);a=[];for(var d in b)a.push(b[d]);return a}
function Fe(a,b){var c=Ue(a,b),d=c.path(),c=Re(a,c);T(a.g.pa,d,S(a.g.M,d));T(a.Ha,d,S(a.g.M,d));if(0!==c.length){for(var e=S(a.g.pa,d),f=e,g=[],k=0;k<c.length;k++){var l=Oa(d,c[k].path),m=!1,p;v(null!==l,"rerunTransactionsUnderNode_: relativePath should not be null.");if(5===c[k].status)m=!0,p=c[k].yc;else if(1===c[k].status)if(25<=c[k].yd)m=!0,p="maxretry";else{var t=e.L(l),s=c[k].update(t.W());if(n(s)){Ba("transaction failed: Data returned ",s);var w=O(s);"object"===typeof s&&null!=s&&A(s,".priority")||
(w=w.Ia(t.k()));e=e.Aa(l,w);c[k].Ac&&(f=f.Aa(l,w))}else m=!0,p="nodata"}m&&(c[k].status=3,setTimeout(c[k].xc,0),c[k].F&&(m=new E(a,c[k].path),l=new P(e.L(l),m),"nodata"===p?g.push(r(c[k].F,null,null,!1,l)):g.push(r(c[k].F,null,Error(p),!1,l))))}T(a.Ha,d,e);T(a.g.pa,d,f);Qe(a,a.Va);for(k=0;k<g.length;k++)fc(g[k]);Oe(a)}return d}function Ue(a,b){for(var c,d=a.Va;null!==(c=C(b))&&null===d.j();)d=I(d,c),b=Ma(b);return d}
function Re(a,b){var c=[];Ve(a,b,c);c.sort(function(a,b){return a.td-b.td});return c}function Ve(a,b,c){var d=b.j();if(null!==d)for(var e=0;e<d.length;e++)c.push(d[e]);b.A(function(b){Ve(a,b,c)})}function Qe(a,b){var c=b.j();if(c){for(var d=0,e=0;e<c.length;e++)3!==c[e].status&&(c[d]=c[e],d++);c.length=d;J(b,0<c.length?c:null)}b.A(function(b){Qe(a,b)})}function He(a,b){var c=Ue(a,b).path(),d=I(a.Va,b);Ta(d,function(a){We(a)});We(d);Sa(d,function(a){We(a)});return c}
function We(a){var b=a.j();if(null!==b){for(var c=[],d=-1,e=0;e<b.length;e++)4!==b[e].status&&(2===b[e].status?(v(d===e-1,"All SENT items should be at beginning of queue."),d=e,b[e].status=4,b[e].yc="set"):(v(1===b[e].status),b[e].xc(),b[e].F&&c.push(r(b[e].F,null,Error("set"),!1,null))));-1===d?J(a,null):b.length=d+1;for(e=0;e<c.length;e++)fc(c[e])}}function Pe(a,b){var c=new E(a,b);return new P(S(a.Ha,b),c)}
function Ne(a,b,c,d){if(d.f())return c;if(null!=d.j())return b;var e=c;d.A(function(d){var g=d.name(),k=new F(g);d=Ne(a,b.L(k),c.L(k),d);e=e.I(g,d)});return e};function Y(){this.kb={}}ca(Y);Y.prototype.Na=function(){for(var a in this.kb)this.kb[a].Na()};Y.prototype.interrupt=Y.prototype.Na;Y.prototype.lb=function(){for(var a in this.kb)this.kb[a].lb()};Y.prototype.resume=Y.prototype.lb;var Z={Rd:function(a){var b=N.prototype.hash;N.prototype.hash=a;var c=gc.prototype.hash;gc.prototype.hash=a;return function(){N.prototype.hash=b;gc.prototype.hash=c}}};Z.hijackHash=Z.Rd;Z.Sa=function(a){return a.Sa()};Z.queryIdentifier=Z.Sa;Z.Ud=function(a){return a.m.u.ia};Z.listens=Z.Ud;Z.be=function(a){return a.m.u.la};Z.refConnection=Z.be;Z.Gd=nd;Z.DataConnection=Z.Gd;nd.prototype.sendRequest=nd.prototype.Ga;nd.prototype.interrupt=nd.prototype.Na;Z.Hd=bd;Z.RealTimeConnection=Z.Hd;
bd.prototype.sendRequest=bd.prototype.Ad;bd.prototype.close=bd.prototype.close;Z.Fd=pb;Z.ConnectionTarget=Z.Fd;Z.Pd=function(){Pc=Hc=!0};Z.forceLongPolling=Z.Pd;Z.Qd=function(){Qc=!0};Z.forceWebSockets=Z.Qd;Z.he=function(a,b){a.m.u.Xc=b};Z.setSecurityDebugCallback=Z.he;Z.Zc=function(a,b){a.m.Zc(b)};Z.stats=Z.Zc;Z.$c=function(a,b){a.m.$c(b)};Z.statsIncrementCounter=Z.$c;Z.Vb=function(a){return a.m.Vb};Z.dataUpdateCount=Z.Vb;Z.Sd=function(a,b){a.m.pd=b};Z.interceptServerData=Z.Sd;function $(a,b,c){this.Lb=a;this.Y=b;this.Fa=c}$.prototype.cancel=function(a){x("Firebase.onDisconnect().cancel",0,1,arguments.length);z("Firebase.onDisconnect().cancel",1,a,!0);this.Lb.Pc(this.Y,a)};$.prototype.cancel=$.prototype.cancel;$.prototype.remove=function(a){x("Firebase.onDisconnect().remove",0,1,arguments.length);B("Firebase.onDisconnect().remove",this.Y);z("Firebase.onDisconnect().remove",1,a,!0);Ie(this.Lb,this.Y,null,a)};$.prototype.remove=$.prototype.remove;
$.prototype.set=function(a,b){x("Firebase.onDisconnect().set",1,2,arguments.length);B("Firebase.onDisconnect().set",this.Y);Aa("Firebase.onDisconnect().set",a,!1);z("Firebase.onDisconnect().set",2,b,!0);Ie(this.Lb,this.Y,a,b)};$.prototype.set=$.prototype.set;
$.prototype.mb=function(a,b,c){x("Firebase.onDisconnect().setWithPriority",2,3,arguments.length);B("Firebase.onDisconnect().setWithPriority",this.Y);Aa("Firebase.onDisconnect().setWithPriority",a,!1);Fa("Firebase.onDisconnect().setWithPriority",2,b,!1);z("Firebase.onDisconnect().setWithPriority",3,c,!0);if(".length"===this.Fa||".keys"===this.Fa)throw"Firebase.onDisconnect().setWithPriority failed: "+this.Fa+" is a read-only object.";Je(this.Lb,this.Y,a,b,c)};$.prototype.setWithPriority=$.prototype.mb;
$.prototype.update=function(a,b){x("Firebase.onDisconnect().update",1,2,arguments.length);B("Firebase.onDisconnect().update",this.Y);if(ea(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;L("Passing an Array to Firebase.onDisconnect().update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}Ea("Firebase.onDisconnect().update",a);z("Firebase.onDisconnect().update",2,b,!0);Ke(this.Lb,
this.Y,a,b)};$.prototype.update=$.prototype.update;var Xe=function(){var a=0,b=[];return function(c){var d=c===a;a=c;for(var e=Array(8),f=7;0<=f;f--)e[f]="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c%64),c=Math.floor(c/64);v(0===c,"Cannot push at time == 0");c=e.join("");if(d){for(f=11;0<=f&&63===b[f];f--)b[f]=0;b[f]++}else for(f=0;12>f;f++)b[f]=Math.floor(64*Math.random());for(f=0;12>f;f++)c+="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);v(20===c.length,"NextPushId: Length should be 20.");
return c}}();function E(a,b){var c,d;if(a instanceof Be)c=a,d=b;else{x("new Firebase",1,2,arguments.length);var e=arguments[0];d=c="";var f=!0,g="";if(q(e)){var k=e.indexOf("//");if(0<=k)var l=e.substring(0,k-1),e=e.substring(k+2);k=e.indexOf("/");-1===k&&(k=e.length);c=e.substring(0,k);var e=e.substring(k+1),m=c.split(".");if(3==m.length){k=m[2].indexOf(":");f=0<=k?"https"===l||"wss"===l:!0;if("firebase"===m[1])Tb(c+" is no longer supported. Please use <YOUR FIREBASE>.firebaseio.com instead");else for(d=m[0],
g="",e=("/"+e).split("/"),k=0;k<e.length;k++)if(0<e[k].length){m=e[k];try{m=decodeURIComponent(m.replace(/\+/g," "))}catch(p){}g+="/"+m}d=d.toLowerCase()}else Tb("Cannot parse Firebase url. Please use https://<YOUR FIREBASE>.firebaseio.com")}f||"undefined"!==typeof window&&window.location&&window.location.protocol&&-1!==window.location.protocol.indexOf("https:")&&L("Insecure Firebase access from a secure page. Please use https in calls to new Firebase().");c=new pb(c,f,d,"ws"===l||"wss"===l);d=new F(g);
f=d.toString();!(l=!q(c.host)||0===c.host.length||!za(c.bc))&&(l=0!==f.length)&&(f&&(f=f.replace(/^\/*\.info(\/|$)/,"/")),l=!(q(f)&&0!==f.length&&!ya.test(f)));if(l)throw Error(y("new Firebase",1,!1)+'must be a valid firebase URL and the path can\'t contain ".", "#", "$", "[", or "]".');if(b)if(b instanceof Y)f=b;else throw Error("Expected a valid Firebase.Context for second argument to new Firebase()");else f=Y.tb();l=c.toString();e=wa(f.kb,l);e||(e=new Be(c),f.kb[l]=e);c=e}D.call(this,c,d)}
ka(E,D);var Ye=E,Ze=["Firebase"],$e=aa;Ze[0]in $e||!$e.execScript||$e.execScript("var "+Ze[0]);for(var af;Ze.length&&(af=Ze.shift());)!Ze.length&&n(Ye)?$e[af]=Ye:$e=$e[af]?$e[af]:$e[af]={};E.prototype.name=function(){x("Firebase.name",0,0,arguments.length);return this.path.f()?null:Na(this.path)};E.prototype.name=E.prototype.name;
E.prototype.H=function(a){x("Firebase.child",1,1,arguments.length);if(ga(a))a=String(a);else if(!(a instanceof F))if(null===C(this.path)){var b=a;b&&(b=b.replace(/^\/*\.info(\/|$)/,"/"));Ia("Firebase.child",b)}else Ia("Firebase.child",a);return new E(this.m,this.path.H(a))};E.prototype.child=E.prototype.H;E.prototype.parent=function(){x("Firebase.parent",0,0,arguments.length);var a=this.path.parent();return null===a?null:new E(this.m,a)};E.prototype.parent=E.prototype.parent;
E.prototype.root=function(){x("Firebase.ref",0,0,arguments.length);for(var a=this;null!==a.parent();)a=a.parent();return a};E.prototype.root=E.prototype.root;E.prototype.toString=function(){x("Firebase.toString",0,0,arguments.length);var a;if(null===this.parent())a=this.m.toString();else{a=this.parent().toString()+"/";var b=this.name();a+=encodeURIComponent(String(b))}return a};E.prototype.toString=E.prototype.toString;
E.prototype.set=function(a,b){x("Firebase.set",1,2,arguments.length);B("Firebase.set",this.path);Aa("Firebase.set",a,!1);z("Firebase.set",2,b,!0);this.m.mb(this.path,a,null,b)};E.prototype.set=E.prototype.set;
E.prototype.update=function(a,b){x("Firebase.update",1,2,arguments.length);B("Firebase.update",this.path);if(ea(a)){for(var c={},d=0;d<a.length;++d)c[""+d]=a[d];a=c;L("Passing an Array to Firebase.update() is deprecated. Use set() if you want to overwrite the existing data, or an Object with integer keys if you really do want to only update some of the children.")}Ea("Firebase.update",a);z("Firebase.update",2,b,!0);if(A(a,".priority"))throw Error("update() does not currently support updating .priority.");
this.m.update(this.path,a,b)};E.prototype.update=E.prototype.update;E.prototype.mb=function(a,b,c){x("Firebase.setWithPriority",2,3,arguments.length);B("Firebase.setWithPriority",this.path);Aa("Firebase.setWithPriority",a,!1);Fa("Firebase.setWithPriority",2,b,!1);z("Firebase.setWithPriority",3,c,!0);if(".length"===this.name()||".keys"===this.name())throw"Firebase.setWithPriority failed: "+this.name()+" is a read-only object.";this.m.mb(this.path,a,b,c)};E.prototype.setWithPriority=E.prototype.mb;
E.prototype.remove=function(a){x("Firebase.remove",0,1,arguments.length);B("Firebase.remove",this.path);z("Firebase.remove",1,a,!0);this.set(null,a)};E.prototype.remove=E.prototype.remove;
E.prototype.transaction=function(a,b,c){x("Firebase.transaction",1,3,arguments.length);B("Firebase.transaction",this.path);z("Firebase.transaction",1,a,!1);z("Firebase.transaction",2,b,!0);if(n(c)&&"boolean"!=typeof c)throw Error(y("Firebase.transaction",3,!0)+"must be a boolean.");if(".length"===this.name()||".keys"===this.name())throw"Firebase.transaction failed: "+this.name()+" is a read-only object.";"undefined"===typeof c&&(c=!0);Me(this.m,this.path,a,b,c)};E.prototype.transaction=E.prototype.transaction;
E.prototype.Yc=function(a,b){x("Firebase.setPriority",1,2,arguments.length);B("Firebase.setPriority",this.path);Fa("Firebase.setPriority",1,a,!1);z("Firebase.setPriority",2,b,!0);this.m.Yc(this.path,a,b)};E.prototype.setPriority=E.prototype.Yc;E.prototype.push=function(a,b){x("Firebase.push",0,2,arguments.length);B("Firebase.push",this.path);Aa("Firebase.push",a,!0);z("Firebase.push",2,b,!0);var c=De(this.m),c=Xe(c),c=this.H(c);"undefined"!==typeof a&&null!==a&&c.set(a,b);return c};
E.prototype.push=E.prototype.push;E.prototype.ja=function(){return new $(this.m,this.path,this.name())};E.prototype.onDisconnect=E.prototype.ja;E.prototype.ce=function(){L("FirebaseRef.removeOnDisconnect() being deprecated. Please use FirebaseRef.onDisconnect().remove() instead.");this.ja().remove();Le(this.m)};E.prototype.removeOnDisconnect=E.prototype.ce;
E.prototype.ge=function(a){L("FirebaseRef.setOnDisconnect(value) being deprecated. Please use FirebaseRef.onDisconnect().set(value) instead.");this.ja().set(a);Le(this.m)};E.prototype.setOnDisconnect=E.prototype.ge;E.prototype.ob=function(a,b,c){x("Firebase.auth",1,3,arguments.length);if(!q(a))throw Error(y("Firebase.auth",1,!1)+"must be a valid credential (a string).");z("Firebase.auth",2,b,!0);z("Firebase.auth",3,b,!0);this.m.ob(a,b,c)};E.prototype.auth=E.prototype.ob;
E.prototype.Rb=function(a){x("Firebase.unauth",0,1,arguments.length);z("Firebase.unauth",1,a,!0);this.m.Rb(a)};E.prototype.unauth=E.prototype.Rb;E.goOffline=function(){x("Firebase.goOffline",0,0,arguments.length);Y.tb().Na()};E.goOnline=function(){x("Firebase.goOnline",0,0,arguments.length);Y.tb().lb()};
function Qb(a,b){v(!b||!0===a||!1===a,"Can't turn on custom loggers persistently.");!0===a?("undefined"!==typeof console&&("function"===typeof console.log?Ob=r(console.log,console):"object"===typeof console.log&&(Ob=function(a){console.log(a)})),b&&ob.set("logging_enabled",!0)):a?Ob=a:(Ob=null,ob.remove("logging_enabled"))}E.enableLogging=Qb;E.ServerValue={TIMESTAMP:{".sv":"timestamp"}};E.SDK_VERSION="1.0.18";E.INTERNAL=Z;E.Context=Y;})();

(function() {var COMPILED=!0,goog=goog||{};goog.global=this;goog.exportPath_=function(a,b,c){a=a.split(".");c=c||goog.global;a[0]in c||!c.execScript||c.execScript("var "+a[0]);for(var d;a.length&&(d=a.shift());)a.length||void 0===b?c=c[d]?c[d]:c[d]={}:c[d]=b};goog.define=function(a,b){var c=b;COMPILED||goog.global.CLOSURE_DEFINES&&Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_DEFINES,a)&&(c=goog.global.CLOSURE_DEFINES[a]);goog.exportPath_(a,c)};goog.DEBUG=!0;goog.LOCALE="en";goog.TRUSTED_SITE=!0;
goog.provide=function(a){if(!COMPILED){if(goog.isProvided_(a))throw Error('Namespace "'+a+'" already declared.');delete goog.implicitNamespaces_[a];for(var b=a;(b=b.substring(0,b.lastIndexOf(".")))&&!goog.getObjectByName(b);)goog.implicitNamespaces_[b]=!0}goog.exportPath_(a)};goog.setTestOnly=function(a){if(COMPILED&&!goog.DEBUG)throw a=a||"",Error("Importing test-only code into non-debug environment"+a?": "+a:".");};goog.forwardDeclare=function(a){};
COMPILED||(goog.isProvided_=function(a){return!goog.implicitNamespaces_[a]&&goog.isDefAndNotNull(goog.getObjectByName(a))},goog.implicitNamespaces_={});goog.getObjectByName=function(a,b){for(var c=a.split("."),d=b||goog.global,e;e=c.shift();)if(goog.isDefAndNotNull(d[e]))d=d[e];else return null;return d};goog.globalize=function(a,b){var c=b||goog.global,d;for(d in a)c[d]=a[d]};
goog.addDependency=function(a,b,c){if(goog.DEPENDENCIES_ENABLED){var d;a=a.replace(/\\/g,"/");for(var e=goog.dependencies_,f=0;d=b[f];f++)e.nameToPath[d]=a,a in e.pathToNames||(e.pathToNames[a]={}),e.pathToNames[a][d]=!0;for(d=0;b=c[d];d++)a in e.requires||(e.requires[a]={}),e.requires[a][b]=!0}};goog.ENABLE_DEBUG_LOADER=!0;
goog.require=function(a){if(!COMPILED&&!goog.isProvided_(a)){if(goog.ENABLE_DEBUG_LOADER){var b=goog.getPathFromDeps_(a);if(b){goog.included_[b]=!0;goog.writeScripts_();return}}a="goog.require could not find: "+a;goog.global.console&&goog.global.console.error(a);throw Error(a);}};goog.basePath="";goog.nullFunction=function(){};goog.identityFunction=function(a,b){return a};goog.abstractMethod=function(){throw Error("unimplemented abstract method");};
goog.addSingletonGetter=function(a){a.getInstance=function(){if(a.instance_)return a.instance_;goog.DEBUG&&(goog.instantiatedSingletons_[goog.instantiatedSingletons_.length]=a);return a.instance_=new a}};goog.instantiatedSingletons_=[];goog.DEPENDENCIES_ENABLED=!COMPILED&&goog.ENABLE_DEBUG_LOADER;
goog.DEPENDENCIES_ENABLED&&(goog.included_={},goog.dependencies_={pathToNames:{},nameToPath:{},requires:{},visited:{},written:{}},goog.inHtmlDocument_=function(){var a=goog.global.document;return"undefined"!=typeof a&&"write"in a},goog.findBasePath_=function(){if(goog.global.CLOSURE_BASE_PATH)goog.basePath=goog.global.CLOSURE_BASE_PATH;else if(goog.inHtmlDocument_())for(var a=goog.global.document.getElementsByTagName("script"),b=a.length-1;0<=b;--b){var c=a[b].src,d=c.lastIndexOf("?"),d=-1==d?c.length:
d;if("base.js"==c.substr(d-7,7)){goog.basePath=c.substr(0,d-7);break}}},goog.importScript_=function(a){var b=goog.global.CLOSURE_IMPORT_SCRIPT||goog.writeScriptTag_;!goog.dependencies_.written[a]&&b(a)&&(goog.dependencies_.written[a]=!0)},goog.writeScriptTag_=function(a){if(goog.inHtmlDocument_()){var b=goog.global.document;if("complete"==b.readyState){if(/\bdeps.js$/.test(a))return!1;throw Error('Cannot write "'+a+'" after document load');}b.write('<script type="text/javascript" src="'+a+'">\x3c/script>');
return!0}return!1},goog.writeScripts_=function(){function a(e){if(!(e in d.written)){if(!(e in d.visited)&&(d.visited[e]=!0,e in d.requires))for(var g in d.requires[e])if(!goog.isProvided_(g))if(g in d.nameToPath)a(d.nameToPath[g]);else throw Error("Undefined nameToPath for "+g);e in c||(c[e]=!0,b.push(e))}}var b=[],c={},d=goog.dependencies_,e;for(e in goog.included_)d.written[e]||a(e);for(e=0;e<b.length;e++)if(b[e])goog.importScript_(goog.basePath+b[e]);else throw Error("Undefined script input");
},goog.getPathFromDeps_=function(a){return a in goog.dependencies_.nameToPath?goog.dependencies_.nameToPath[a]:null},goog.findBasePath_(),goog.global.CLOSURE_NO_DEPS||goog.importScript_(goog.basePath+"deps.js"));
goog.typeOf=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b};goog.isDef=function(a){return void 0!==a};goog.isNull=function(a){return null===a};goog.isDefAndNotNull=function(a){return null!=a};goog.isArray=function(a){return"array"==goog.typeOf(a)};goog.isArrayLike=function(a){var b=goog.typeOf(a);return"array"==b||"object"==b&&"number"==typeof a.length};goog.isDateLike=function(a){return goog.isObject(a)&&"function"==typeof a.getFullYear};goog.isString=function(a){return"string"==typeof a};
goog.isBoolean=function(a){return"boolean"==typeof a};goog.isNumber=function(a){return"number"==typeof a};goog.isFunction=function(a){return"function"==goog.typeOf(a)};goog.isObject=function(a){var b=typeof a;return"object"==b&&null!=a||"function"==b};goog.getUid=function(a){return a[goog.UID_PROPERTY_]||(a[goog.UID_PROPERTY_]=++goog.uidCounter_)};goog.hasUid=function(a){return!!a[goog.UID_PROPERTY_]};goog.removeUid=function(a){"removeAttribute"in a&&a.removeAttribute(goog.UID_PROPERTY_);try{delete a[goog.UID_PROPERTY_]}catch(b){}};
goog.UID_PROPERTY_="closure_uid_"+(1E9*Math.random()>>>0);goog.uidCounter_=0;goog.getHashCode=goog.getUid;goog.removeHashCode=goog.removeUid;goog.cloneObject=function(a){var b=goog.typeOf(a);if("object"==b||"array"==b){if(a.clone)return a.clone();var b="array"==b?[]:{},c;for(c in a)b[c]=goog.cloneObject(a[c]);return b}return a};goog.bindNative_=function(a,b,c){return a.call.apply(a.bind,arguments)};
goog.bindJs_=function(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}};goog.bind=function(a,b,c){Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?goog.bind=goog.bindNative_:goog.bind=goog.bindJs_;return goog.bind.apply(null,arguments)};
goog.partial=function(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}};goog.mixin=function(a,b){for(var c in b)a[c]=b[c]};goog.now=goog.TRUSTED_SITE&&Date.now||function(){return+new Date};
goog.globalEval=function(a){if(goog.global.execScript)goog.global.execScript(a,"JavaScript");else if(goog.global.eval)if(null==goog.evalWorksForGlobals_&&(goog.global.eval("var _et_ = 1;"),"undefined"!=typeof goog.global._et_?(delete goog.global._et_,goog.evalWorksForGlobals_=!0):goog.evalWorksForGlobals_=!1),goog.evalWorksForGlobals_)goog.global.eval(a);else{var b=goog.global.document,c=b.createElement("script");c.type="text/javascript";c.defer=!1;c.appendChild(b.createTextNode(a));b.body.appendChild(c);
b.body.removeChild(c)}else throw Error("goog.globalEval not available");};goog.evalWorksForGlobals_=null;goog.getCssName=function(a,b){var c=function(a){return goog.cssNameMapping_[a]||a},d=function(a){a=a.split("-");for(var b=[],d=0;d<a.length;d++)b.push(c(a[d]));return b.join("-")},d=goog.cssNameMapping_?"BY_WHOLE"==goog.cssNameMappingStyle_?c:d:function(a){return a};return b?a+"-"+d(b):d(a)};goog.setCssNameMapping=function(a,b){goog.cssNameMapping_=a;goog.cssNameMappingStyle_=b};
!COMPILED&&goog.global.CLOSURE_CSS_NAME_MAPPING&&(goog.cssNameMapping_=goog.global.CLOSURE_CSS_NAME_MAPPING);goog.getMsg=function(a,b){var c=b||{},d;for(d in c){var e=(""+c[d]).replace(/\$/g,"$$$$");a=a.replace(RegExp("\\{\\$"+d+"\\}","gi"),e)}return a};goog.getMsgWithFallback=function(a,b){return a};goog.exportSymbol=function(a,b,c){goog.exportPath_(a,b,c)};goog.exportProperty=function(a,b,c){a[b]=c};
goog.inherits=function(a,b){function c(){}c.prototype=b.prototype;a.superClass_=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.base=function(a,c,f){var g=Array.prototype.slice.call(arguments,2);return b.prototype[c].apply(a,g)}};
goog.base=function(a,b,c){var d=arguments.callee.caller;if(goog.DEBUG&&!d)throw Error("arguments.caller not defined.  goog.base() expects not to be running in strict mode. See http://www.ecma-international.org/ecma-262/5.1/#sec-C");if(d.superClass_)return d.superClass_.constructor.apply(a,Array.prototype.slice.call(arguments,1));for(var e=Array.prototype.slice.call(arguments,2),f=!1,g=a.constructor;g;g=g.superClass_&&g.superClass_.constructor)if(g.prototype[b]===d)f=!0;else if(f)return g.prototype[b].apply(a,
e);if(a[b]===d)return a.constructor.prototype[b].apply(a,e);throw Error("goog.base called from a method of one name to a method of a different name");};goog.scope=function(a){a.call(goog.global)};var fb={simplelogin:{}};fb.simplelogin.Vars_=function(){this.apiHost="https://auth.firebase.com"};fb.simplelogin.Vars_.prototype.setApiHost=function(a){this.apiHost=a};fb.simplelogin.Vars_.prototype.getApiHost=function(){return this.apiHost};fb.simplelogin.Vars=new fb.simplelogin.Vars_;goog.json={};goog.json.USE_NATIVE_JSON=!1;goog.json.isValid_=function(a){return/^\s*$/.test(a)?!1:/^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g,"@").replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g,""))};
goog.json.parse=goog.json.USE_NATIVE_JSON?goog.global.JSON.parse:function(a){a=String(a);if(goog.json.isValid_(a))try{return eval("("+a+")")}catch(b){}throw Error("Invalid JSON string: "+a);};goog.json.unsafeParse=goog.json.USE_NATIVE_JSON?goog.global.JSON.parse:function(a){return eval("("+a+")")};goog.json.serialize=goog.json.USE_NATIVE_JSON?goog.global.JSON.stringify:function(a,b){return(new goog.json.Serializer(b)).serialize(a)};goog.json.Serializer=function(a){this.replacer_=a};
goog.json.Serializer.prototype.serialize=function(a){var b=[];this.serialize_(a,b);return b.join("")};
goog.json.Serializer.prototype.serialize_=function(a,b){switch(typeof a){case "string":this.serializeString_(a,b);break;case "number":this.serializeNumber_(a,b);break;case "boolean":b.push(a);break;case "undefined":b.push("null");break;case "object":if(null==a){b.push("null");break}if(goog.isArray(a)){this.serializeArray(a,b);break}this.serializeObject_(a,b);break;case "function":break;default:throw Error("Unknown type: "+typeof a);}};
goog.json.Serializer.charToJsonCharCache_={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\u000b"};goog.json.Serializer.charsToReplace_=/\uffff/.test("\uffff")?/[\\\"\x00-\x1f\x7f-\uffff]/g:/[\\\"\x00-\x1f\x7f-\xff]/g;
goog.json.Serializer.prototype.serializeString_=function(a,b){b.push('"',a.replace(goog.json.Serializer.charsToReplace_,function(a){if(a in goog.json.Serializer.charToJsonCharCache_)return goog.json.Serializer.charToJsonCharCache_[a];var b=a.charCodeAt(0),e="\\u";16>b?e+="000":256>b?e+="00":4096>b&&(e+="0");return goog.json.Serializer.charToJsonCharCache_[a]=e+b.toString(16)}),'"')};goog.json.Serializer.prototype.serializeNumber_=function(a,b){b.push(isFinite(a)&&!isNaN(a)?a:"null")};
goog.json.Serializer.prototype.serializeArray=function(a,b){var c=a.length;b.push("[");for(var d="",e=0;e<c;e++)b.push(d),d=a[e],this.serialize_(this.replacer_?this.replacer_.call(a,String(e),d):d,b),d=",";b.push("]")};
goog.json.Serializer.prototype.serializeObject_=function(a,b){b.push("{");var c="",d;for(d in a)if(Object.prototype.hasOwnProperty.call(a,d)){var e=a[d];"function"!=typeof e&&(b.push(c),this.serializeString_(d,b),b.push(":"),this.serialize_(this.replacer_?this.replacer_.call(a,d,e):e,b),c=",")}b.push("}")};fb.simplelogin.util={};fb.simplelogin.util.json={};fb.simplelogin.util.json.parse=function(a){return"undefined"!==typeof JSON&&goog.isDef(JSON.parse)?JSON.parse(a):goog.json.parse(a)};fb.simplelogin.util.json.stringify=function(a){return"undefined"!==typeof JSON&&goog.isDef(JSON.stringify)?JSON.stringify(a):goog.json.serialize(a)};fb.simplelogin.transports={};fb.simplelogin.transports.Transport={};fb.simplelogin.Transport=function(){};fb.simplelogin.Transport.prototype.open=function(a,b,c){};fb.simplelogin.transports.Popup={};fb.simplelogin.Popup=function(){};fb.simplelogin.Popup.prototype.open=function(a,b,c){};fb.simplelogin.util.misc={};fb.simplelogin.util.misc.parseUrl=function(a){var b=document.createElement("a");b.href=a;return{protocol:b.protocol.replace(":",""),host:b.hostname,port:b.port,query:b.search,params:fb.simplelogin.util.misc.parseQuerystring(b.search),hash:b.hash.replace("#",""),path:b.pathname.replace(/^([^\/])/,"/$1")}};fb.simplelogin.util.misc.parseQuerystring=function(a){var b={};a=a.replace(/^\?/,"").split("&");for(var c=0;c<a.length;c++)if(a[c]){var d=a[c].split("=");b[d[0]]=d[1]}return b};
fb.simplelogin.util.misc.parseSubdomain=function(a){var b="";try{var c=fb.simplelogin.util.misc.parseUrl(a).host.split(".");2<c.length&&(b=c.slice(0,-2).join("."))}catch(d){}return b};var popupTimeout=4E4;fb.simplelogin.transports.CordovaInAppBrowser_=function(){};
fb.simplelogin.transports.CordovaInAppBrowser_.prototype.open=function(a,b,c){callbackInvoked=!1;var d=function(){var a=Array.prototype.slice.apply(arguments);callbackInvoked||(callbackInvoked=!0,c.apply(null,a))},e=window.open(a+"&transport=internal-redirect-hash","blank","location=no");e.addEventListener("loadstop",function(a){var b;if(a&&a.url&&(a=fb.simplelogin.util.misc.parseUrl(a.url),"/blank/page.html"===a.path)){e.close();try{var c=fb.simplelogin.util.misc.parseQuerystring(decodeURIComponent(a.hash));
a={};for(var k in c)a[k]=fb.simplelogin.util.json.parse(c[k]);b=a}catch(l){}b&&b.token&&b.user?d(null,b):b&&b.error?d(b.error):d({code:"UNKNOWN_ERROR",message:"An unknown error occurred."})}});e.addEventListener("exit",function(a){d({code:"USER_DENIED",message:"User cancelled the authentication request."})});setTimeout(function(){e&&e.close&&e.close()},popupTimeout)};fb.simplelogin.transports.CordovaInAppBrowser=new fb.simplelogin.transports.CordovaInAppBrowser_;fb.simplelogin.Errors={};var messagePrefix="FirebaseSimpleLogin: ",errors={UNKNOWN_ERROR:"An unknown error occurred.",INVALID_EMAIL:"Invalid email specified.",INVALID_PASSWORD:"Invalid password specified.",USER_DENIED:"User cancelled the authentication request.",TRIGGER_IO_TABS:'The "forge.tabs" module required when using Firebase Simple Login and                         Trigger.io. Without this module included and enabled, login attempts to                         OAuth authentication providers will not be able to complete.'};
fb.simplelogin.Errors.format=function(a,b){var c=a||"UNKNOWN_ERROR",d=b||errors[c],e={},f=arguments;2===f.length?(c=f[0],d=f[1]):1===f.length&&("object"===typeof f[0]&&f[0].code&&f[0].message?(c=f[0].code,d=f[0].message,e=f[0].data):"string"===typeof f[0]&&(c=f[0],d=""));d=Error(messagePrefix+d);d.code=c;e&&(d.data=e);return d};fb.simplelogin.Errors.get=function(a){errors[a]||(a="UNKNOWN_ERROR");return fb.simplelogin.Errors.format(a,errors[a])};var RELAY_FRAME_NAME="__winchan_relay_frame",CLOSE_CMD="die";function addListener(a,b,c){a.attachEvent?a.attachEvent("on"+b,c):a.addEventListener&&a.addEventListener(b,c,!1)}function removeListener(a,b,c){a.detachEvent?a.detachEvent("on"+b,c):a.removeEventListener&&a.removeEventListener(b,c,!1)}function extractOrigin(a){/^https?:\/\//.test(a)||(a=window.location.href);var b=/^(https?:\/\/[\-_a-zA-Z\.0-9:]+)/.exec(a);return b?b[1]:a}
function findRelay(){for(var a=window.location,b=window.opener.frames,a=a.protocol+"//"+a.host,c=b.length-1;0<=c;c--)try{if(0===b[c].location.href.indexOf(a)&&b[c].name===RELAY_FRAME_NAME)return b[c]}catch(d){}}
var isInternetExplorer=function(){var a,b=-1,c=navigator.userAgent;"Microsoft Internet Explorer"===navigator.appName?(a=/MSIE ([0-9]{1,}[\.0-9]{0,})/,(a=c.match(a))&&1<a.length&&(b=parseFloat(a[1]))):-1<c.indexOf("Trident")&&(a=/rv:([0-9]{2,2}[\.0-9]{0,})/,(a=c.match(a))&&1<a.length&&(b=parseFloat(a[1])));return 8<=b}();fb.simplelogin.transports.WinChan_=function(){};
fb.simplelogin.transports.WinChan_.prototype.open=function(a,b,c){function d(){g&&document.body.removeChild(g);g=void 0;m&&(m=clearInterval(m));removeListener(window,"message",e);removeListener(window,"unload",d);if(l)try{l.close()}catch(a){k.postMessage(CLOSE_CMD,h)}l=k=void 0}function e(a){if(a.origin===h)try{var b=fb.simplelogin.util.json.parse(a.data);"ready"===b.a?k.postMessage(n,h):"error"===b.a?(d(),c&&(c(b.d),c=null)):"response"===b.a&&(d(),c&&(c(null,b.d),c=null))}catch(e){}}if(!c)throw"missing required callback argument";
b.url=a;var f;b.url||(f="missing required 'url' parameter");b.relay_url||(f="missing required 'relay_url' parameter");f&&setTimeout(function(){c(f)},0);b.window_name||(b.window_name=null);if(!b.window_features||fb.simplelogin.util.env.isFennec())b.window_features=void 0;var g,h=extractOrigin(b.url);if(h!==extractOrigin(b.relay_url))return setTimeout(function(){c("invalid arguments: origin of url and relay_url must match")},0);var k;isInternetExplorer&&(g=document.createElement("iframe"),g.setAttribute("src",
b.relay_url),g.style.display="none",g.setAttribute("name",RELAY_FRAME_NAME),document.body.appendChild(g),k=g.contentWindow);var l=window.open(b.url,b.window_name,b.window_features);k||(k=l);var m=setInterval(function(){l&&l.closed&&(d(),c&&(c("unknown closed window"),c=null))},500),n=fb.simplelogin.util.json.stringify({a:"request",d:b.params});addListener(window,"unload",d);addListener(window,"message",e);return{close:d,focus:function(){if(l)try{l.focus()}catch(a){}}}};
goog.exportSymbol("fb.simplelogin.transports.WinChan_.prototype.open",fb.simplelogin.transports.WinChan_.prototype.open);
fb.simplelogin.transports.WinChan_.prototype.onOpen=function(a){function b(a){a=fb.simplelogin.util.json.stringify(a);isInternetExplorer?f.doPost(a,e):f.postMessage(a,e)}function c(d){var f;try{f=fb.simplelogin.util.json.parse(d.data)}catch(g){}f&&"request"===f.a&&(removeListener(window,"message",c),e=d.origin,a&&setTimeout(function(){a(e,f.d,function(c){a=void 0;b({a:"response",d:c})})},0))}function d(a){if(a.data===CLOSE_CMD)try{window.close()}catch(b){}}var e="*",f=isInternetExplorer?findRelay():
window.opener;if(!f)throw"can't find relay frame";addListener(isInternetExplorer?f:window,"message",c);addListener(isInternetExplorer?f:window,"message",d);try{b({a:"ready"})}catch(g){addListener(f,"load",function(a){b({a:"ready"})})}var h=function(){try{removeListener(isInternetExplorer?f:window,"message",d)}catch(c){}a&&b({a:"error",d:"client closed window"});a=void 0;try{window.close()}catch(e){}};addListener(window,"unload",h);return{detach:function(){removeListener(window,"unload",h)}}};
goog.exportSymbol("fb.simplelogin.transports.WinChan_.prototype.onOpen",fb.simplelogin.transports.WinChan_.prototype.onOpen);fb.simplelogin.transports.WinChan_.prototype.isAvailable=function(){return fb.simplelogin.util.json&&fb.simplelogin.util.json.parse&&fb.simplelogin.util.json.stringify&&window.postMessage};fb.simplelogin.transports.WinChan=new fb.simplelogin.transports.WinChan_;fb.simplelogin.transports.TriggerIoTab_=function(){};
fb.simplelogin.transports.TriggerIoTab_.prototype.open=function(a,b,c){callbackInvoked=!1;var d=function(){var a=Array.prototype.slice.apply(arguments);callbackInvoked||(callbackInvoked=!0,c.apply(null,a))};forge.tabs.openWithOptions({url:a+"&transport=internal-redirect-hash",pattern:fb.simplelogin.Vars.getApiHost()+"/blank/page*"},function(a){var b;if(a&&a.url)try{var c=fb.simplelogin.util.misc.parseUrl(a.url),h=fb.simplelogin.util.misc.parseQuerystring(decodeURIComponent(c.hash));a={};for(var k in h)a[k]=
fb.simplelogin.util.json.parse(h[k]);b=a}catch(l){}b&&b.token&&b.user?d(null,b):b&&b.error?d(b.error):d({code:"UNKNOWN_ERROR",message:"An unknown error occurred."})},function(a){d({code:"UNKNOWN_ERROR",message:"An unknown error occurred."})})};fb.simplelogin.transports.TriggerIoTab=new fb.simplelogin.transports.TriggerIoTab_;fb.simplelogin.util.sjcl={};var sjcl={cipher:{},hash:{},keyexchange:{},mode:{},misc:{},codec:{},exception:{corrupt:function(a){this.toString=function(){return"CORRUPT: "+this.message};this.message=a},invalid:function(a){this.toString=function(){return"INVALID: "+this.message};this.message=a},bug:function(a){this.toString=function(){return"BUG: "+this.message};this.message=a},notReady:function(a){this.toString=function(){return"NOT READY: "+this.message};this.message=a}}};
"undefined"!=typeof module&&module.exports&&(module.exports=sjcl);
sjcl.cipher.aes=function(a){this.h[0][0][0]||this.w();var b,c,d,e,f=this.h[0][4],g=this.h[1];b=a.length;var h=1;if(4!==b&&6!==b&&8!==b)throw new sjcl.exception.invalid("invalid aes key size");this.a=[d=a.slice(0),e=[]];for(a=b;a<4*b+28;a++){c=d[a-1];if(0===a%b||8===b&&4===a%b)c=f[c>>>24]<<24^f[c>>16&255]<<16^f[c>>8&255]<<8^f[c&255],0===a%b&&(c=c<<8^c>>>24^h<<24,h=h<<1^283*(h>>7));d[a]=d[a-b]^c}for(b=0;a;b++,a--)c=d[b&3?a:a-4],e[b]=4>=a||4>b?c:g[0][f[c>>>24]]^g[1][f[c>>16&255]]^g[2][f[c>>8&255]]^g[3][f[c&
255]]};
sjcl.cipher.aes.prototype={encrypt:function(a){return this.G(a,0)},decrypt:function(a){return this.G(a,1)},h:[[[],[],[],[],[]],[[],[],[],[],[]]],w:function(){var a=this.h[0],b=this.h[1],c=a[4],d=b[4],e,f,g,h=[],k=[],l,m,n,p;for(e=0;256>e;e++)k[(h[e]=e<<1^283*(e>>7))^e]=e;for(f=g=0;!c[f];f^=l||1,g=k[g]||1)for(n=g^g<<1^g<<2^g<<3^g<<4,n=n>>8^n&255^99,c[f]=n,d[n]=f,m=h[e=h[l=h[f]]],p=16843009*m^65537*e^257*l^16843008*f,m=257*h[n]^16843008*n,e=0;4>e;e++)a[e][f]=m=m<<24^m>>>8,b[e][n]=p=p<<24^p>>>8;for(e=
0;5>e;e++)a[e]=a[e].slice(0),b[e]=b[e].slice(0)},G:function(a,b){if(4!==a.length)throw new sjcl.exception.invalid("invalid aes block size");var c=this.a[b],d=a[0]^c[0],e=a[b?3:1]^c[1],f=a[2]^c[2];a=a[b?1:3]^c[3];var g,h,k,l=c.length/4-2,m,n=4,p=[0,0,0,0];g=this.h[b];var q=g[0],r=g[1],u=g[2],v=g[3],w=g[4];for(m=0;m<l;m++)g=q[d>>>24]^r[e>>16&255]^u[f>>8&255]^v[a&255]^c[n],h=q[e>>>24]^r[f>>16&255]^u[a>>8&255]^v[d&255]^c[n+1],k=q[f>>>24]^r[a>>16&255]^u[d>>8&255]^v[e&255]^c[n+2],a=q[a>>>24]^r[d>>16&255]^
u[e>>8&255]^v[f&255]^c[n+3],n+=4,d=g,e=h,f=k;for(m=0;4>m;m++)p[b?3&-m:m]=w[d>>>24]<<24^w[e>>16&255]<<16^w[f>>8&255]<<8^w[a&255]^c[n++],g=d,d=e,e=f,f=a,a=g;return p}};
sjcl.bitArray={bitSlice:function(a,b,c){a=sjcl.bitArray.N(a.slice(b/32),32-(b&31)).slice(1);return void 0===c?a:sjcl.bitArray.clamp(a,c-b)},extract:function(a,b,c){var d=Math.floor(-b-c&31);return((b+c-1^b)&-32?a[b/32|0]<<32-d^a[b/32+1|0]>>>d:a[b/32|0]>>>d)&(1<<c)-1},concat:function(a,b){if(0===a.length||0===b.length)return a.concat(b);var c=a[a.length-1],d=sjcl.bitArray.getPartial(c);return 32===d?a.concat(b):sjcl.bitArray.N(b,d,c|0,a.slice(0,a.length-1))},bitLength:function(a){var b=a.length;return 0===
b?0:32*(b-1)+sjcl.bitArray.getPartial(a[b-1])},clamp:function(a,b){if(32*a.length<b)return a;a=a.slice(0,Math.ceil(b/32));var c=a.length;b&=31;0<c&&b&&(a[c-1]=sjcl.bitArray.partial(b,a[c-1]&2147483648>>b-1,1));return a},partial:function(a,b,c){return 32===a?b:(c?b|0:b<<32-a)+1099511627776*a},getPartial:function(a){return Math.round(a/1099511627776)||32},equal:function(a,b){if(sjcl.bitArray.bitLength(a)!==sjcl.bitArray.bitLength(b))return!1;var c=0,d;for(d=0;d<a.length;d++)c|=a[d]^b[d];return 0===
c},N:function(a,b,c,d){var e;for(void 0===d&&(d=[]);32<=b;b-=32)d.push(c),c=0;if(0===b)return d.concat(a);for(e=0;e<a.length;e++)d.push(c|a[e]>>>b),c=a[e]<<32-b;e=a.length?a[a.length-1]:0;a=sjcl.bitArray.getPartial(e);d.push(sjcl.bitArray.partial(b+a&31,32<b+a?c:d.pop(),1));return d},O:function(a,b){return[a[0]^b[0],a[1]^b[1],a[2]^b[2],a[3]^b[3]]}};
sjcl.codec.utf8String={fromBits:function(a){var b="",c=sjcl.bitArray.bitLength(a),d,e;for(d=0;d<c/8;d++)0===(d&3)&&(e=a[d/4]),b+=String.fromCharCode(e>>>24),e<<=8;return decodeURIComponent(escape(b))},toBits:function(a){a=unescape(encodeURIComponent(a));var b=[],c,d=0;for(c=0;c<a.length;c++)d=d<<8|a.charCodeAt(c),3===(c&3)&&(b.push(d),d=0);c&3&&b.push(sjcl.bitArray.partial(8*(c&3),d));return b}};
sjcl.codec.base64={C:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",fromBits:function(a,b,c){var d="",e=0,f=sjcl.codec.base64.C,g=0,h=sjcl.bitArray.bitLength(a);c&&(f=f.substr(0,62)+"-_");for(c=0;6*d.length<h;)d+=f.charAt((g^a[c]>>>e)>>>26),6>e?(g=a[c]<<6-e,e+=26,c++):(g<<=6,e-=6);for(;d.length&3&&!b;)d+="=";return d},toBits:function(a,b){a=a.replace(/\s|=/g,"");var c=[],d=0,e=sjcl.codec.base64.C,f=0,g;b&&(e=e.substr(0,62)+"-_");for(b=0;b<a.length;b++){g=e.indexOf(a.charAt(b));
if(0>g)throw new sjcl.exception.invalid("this isn't base64!");26<d?(d-=26,c.push(f^g>>>d),f=g<<32-d):(d+=6,f^=g<<32-d)}d&56&&c.push(sjcl.bitArray.partial(d&56,f,1));return c}};sjcl.codec.base64url={fromBits:function(a){return sjcl.codec.base64.fromBits(a,1,1)},toBits:function(a){return sjcl.codec.base64.toBits(a,1)}};sjcl.hash.sha256=function(a){this.a[0]||this.w();a?(this.m=a.m.slice(0),this.i=a.i.slice(0),this.e=a.e):this.reset()};sjcl.hash.sha256.hash=function(a){return(new sjcl.hash.sha256).update(a).finalize()};
sjcl.hash.sha256.prototype={blockSize:512,reset:function(){this.m=this.L.slice(0);this.i=[];this.e=0;return this},update:function(a){"string"===typeof a&&(a=sjcl.codec.utf8String.toBits(a));var b,c=this.i=sjcl.bitArray.concat(this.i,a);b=this.e;a=this.e=b+sjcl.bitArray.bitLength(a);for(b=512+b&-512;b<=a;b+=512)this.B(c.splice(0,16));return this},finalize:function(){var a,b=this.i,c=this.m,b=sjcl.bitArray.concat(b,[sjcl.bitArray.partial(1,1)]);for(a=b.length+2;a&15;a++)b.push(0);b.push(Math.floor(this.e/
4294967296));for(b.push(this.e|0);b.length;)this.B(b.splice(0,16));this.reset();return c},L:[],a:[],w:function(){function a(a){return 4294967296*(a-Math.floor(a))|0}var b=0,c=2,d;a:for(;64>b;c++){for(d=2;d*d<=c;d++)if(0===c%d)continue a;8>b&&(this.L[b]=a(Math.pow(c,0.5)));this.a[b]=a(Math.pow(c,1/3));b++}},B:function(a){var b,c,d=a.slice(0),e=this.m,f=this.a,g=e[0],h=e[1],k=e[2],l=e[3],m=e[4],n=e[5],p=e[6],q=e[7];for(a=0;64>a;a++)16>a?b=d[a]:(b=d[a+1&15],c=d[a+14&15],b=d[a&15]=(b>>>7^b>>>18^b>>>3^
b<<25^b<<14)+(c>>>17^c>>>19^c>>>10^c<<15^c<<13)+d[a&15]+d[a+9&15]|0),b=b+q+(m>>>6^m>>>11^m>>>25^m<<26^m<<21^m<<7)+(p^m&(n^p))+f[a],q=p,p=n,n=m,m=l+b|0,l=k,k=h,h=g,g=b+(h&k^l&(h^k))+(h>>>2^h>>>13^h>>>22^h<<30^h<<19^h<<10)|0;e[0]=e[0]+g|0;e[1]=e[1]+h|0;e[2]=e[2]+k|0;e[3]=e[3]+l|0;e[4]=e[4]+m|0;e[5]=e[5]+n|0;e[6]=e[6]+p|0;e[7]=e[7]+q|0}};
sjcl.mode.ccm={name:"ccm",encrypt:function(a,b,c,d,e){var f,g=b.slice(0),h=sjcl.bitArray,k=h.bitLength(c)/8,l=h.bitLength(g)/8;e=e||64;d=d||[];if(7>k)throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");for(f=2;4>f&&l>>>8*f;f++);f<15-k&&(f=15-k);c=h.clamp(c,8*(15-f));b=sjcl.mode.ccm.F(a,b,c,d,e,f);g=sjcl.mode.ccm.H(a,g,c,b,e,f);return h.concat(g.data,g.tag)},decrypt:function(a,b,c,d,e){e=e||64;d=d||[];var f=sjcl.bitArray,g=f.bitLength(c)/8,h=f.bitLength(b),k=f.clamp(b,h-e),l=f.bitSlice(b,
h-e),h=(h-e)/8;if(7>g)throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");for(b=2;4>b&&h>>>8*b;b++);b<15-g&&(b=15-g);c=f.clamp(c,8*(15-b));k=sjcl.mode.ccm.H(a,k,c,l,e,b);a=sjcl.mode.ccm.F(a,k.data,c,d,e,b);if(!f.equal(k.tag,a))throw new sjcl.exception.corrupt("ccm: tag doesn't match");return k.data},F:function(a,b,c,d,e,f){var g=[],h=sjcl.bitArray,k=h.O;e/=8;if(e%2||4>e||16<e)throw new sjcl.exception.invalid("ccm: invalid tag length");if(4294967295<d.length||4294967295<b.length)throw new sjcl.exception.bug("ccm: can't deal with 4GiB or more data");
f=[h.partial(8,(d.length?64:0)|e-2<<2|f-1)];f=h.concat(f,c);f[3]|=h.bitLength(b)/8;f=a.encrypt(f);if(d.length)for(c=h.bitLength(d)/8,65279>=c?g=[h.partial(16,c)]:4294967295>=c&&(g=h.concat([h.partial(16,65534)],[c])),g=h.concat(g,d),d=0;d<g.length;d+=4)f=a.encrypt(k(f,g.slice(d,d+4).concat([0,0,0])));for(d=0;d<b.length;d+=4)f=a.encrypt(k(f,b.slice(d,d+4).concat([0,0,0])));return h.clamp(f,8*e)},H:function(a,b,c,d,e,f){var g,h=sjcl.bitArray;g=h.O;var k=b.length,l=h.bitLength(b);c=h.concat([h.partial(8,
f-1)],c).concat([0,0,0]).slice(0,4);d=h.bitSlice(g(d,a.encrypt(c)),0,e);if(!k)return{tag:d,data:[]};for(g=0;g<k;g+=4)c[3]++,e=a.encrypt(c),b[g]^=e[0],b[g+1]^=e[1],b[g+2]^=e[2],b[g+3]^=e[3];return{tag:d,data:h.clamp(b,l)}}};sjcl.misc.hmac=function(a,b){this.K=b=b||sjcl.hash.sha256;var c=[[],[]],d=b.prototype.blockSize/32;this.k=[new b,new b];a.length>d&&(a=b.hash(a));for(b=0;b<d;b++)c[0][b]=a[b]^909522486,c[1][b]=a[b]^1549556828;this.k[0].update(c[0]);this.k[1].update(c[1])};
sjcl.misc.hmac.prototype.encrypt=sjcl.misc.hmac.prototype.mac=function(a){a=(new this.K(this.k[0])).update(a).finalize();return(new this.K(this.k[1])).update(a).finalize()};
sjcl.misc.pbkdf2=function(a,b,c,d,e){c=c||1E3;if(0>d||0>c)throw sjcl.exception.invalid("invalid params to pbkdf2");"string"===typeof a&&(a=sjcl.codec.utf8String.toBits(a));e=e||sjcl.misc.hmac;a=new e(a);var f,g,h,k,l=[],m=sjcl.bitArray;for(k=1;32*l.length<(d||1);k++){e=f=a.encrypt(m.concat(b,[k]));for(g=1;g<c;g++)for(f=a.encrypt(f),h=0;h<f.length;h++)e[h]^=f[h];l=l.concat(e)}d&&(l=m.clamp(l,d));return l};
sjcl.random={randomWords:function(a,b){var c=[];b=this.isReady(b);var d;if(0===b)throw new sjcl.exception.notReady("generator isn't seeded");b&2&&this.T(!(b&1));for(b=0;b<a;b+=4)0===(b+1)%65536&&this.J(),d=this.u(),c.push(d[0],d[1],d[2],d[3]);this.J();return c.slice(0,a)},setDefaultParanoia:function(a){this.s=a},addEntropy:function(a,b,c){c=c||"user";var d,e,f=(new Date).valueOf(),g=this.p[c],h=this.isReady(),k=0;d=this.D[c];void 0===d&&(d=this.D[c]=this.Q++);void 0===g&&(g=this.p[c]=0);this.p[c]=
(this.p[c]+1)%this.b.length;switch(typeof a){case "number":void 0===b&&(b=1);this.b[g].update([d,this.t++,1,b,f,1,a|0]);break;case "object":c=Object.prototype.toString.call(a);if("[object Uint32Array]"===c){e=[];for(c=0;c<a.length;c++)e.push(a[c]);a=e}else for("[object Array]"!==c&&(k=1),c=0;c<a.length&&!k;c++)"number"!=typeof a[c]&&(k=1);if(!k){if(void 0===b)for(c=b=0;c<a.length;c++)for(e=a[c];0<e;)b++,e>>>=1;this.b[g].update([d,this.t++,2,b,f,a.length].concat(a))}break;case "string":void 0===b&&
(b=a.length);this.b[g].update([d,this.t++,3,b,f,a.length]);this.b[g].update(a);break;default:k=1}if(k)throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");this.j[g]+=b;this.f+=b;0===h&&(0!==this.isReady()&&this.I("seeded",Math.max(this.g,this.f)),this.I("progress",this.getProgress()))},isReady:function(a){a=this.A[void 0!==a?a:this.s];return this.g&&this.g>=a?80<this.j[0]&&(new Date).valueOf()>this.M?3:1:this.f>=a?2:0},getProgress:function(a){a=this.A[a?
a:this.s];return this.g>=a?1:this.f>a?1:this.f/a},startCollectors:function(){if(!this.l){if(window.addEventListener)window.addEventListener("load",this.n,!1),window.addEventListener("mousemove",this.o,!1);else if(document.attachEvent)document.attachEvent("onload",this.n),document.attachEvent("onmousemove",this.o);else throw new sjcl.exception.bug("can't attach event");this.l=!0}},stopCollectors:function(){this.l&&(window.removeEventListener?(window.removeEventListener("load",this.n,!1),window.removeEventListener("mousemove",
this.o,!1)):window.detachEvent&&(window.detachEvent("onload",this.n),window.detachEvent("onmousemove",this.o)),this.l=!1)},addEventListener:function(a,b){this.q[a][this.P++]=b},removeEventListener:function(a,b){var c;a=this.q[a];var d=[];for(c in a)a.hasOwnProperty(c)&&a[c]===b&&d.push(c);for(b=0;b<d.length;b++)c=d[b],delete a[c]},b:[new sjcl.hash.sha256],j:[0],z:0,p:{},t:0,D:{},Q:0,g:0,f:0,M:0,a:[0,0,0,0,0,0,0,0],d:[0,0,0,0],r:void 0,s:6,l:!1,q:{progress:{},seeded:{}},P:0,A:[0,48,64,96,128,192,256,
384,512,768,1024],u:function(){for(var a=0;4>a&&(this.d[a]=this.d[a]+1|0,!this.d[a]);a++);return this.r.encrypt(this.d)},J:function(){this.a=this.u().concat(this.u());this.r=new sjcl.cipher.aes(this.a)},S:function(a){this.a=sjcl.hash.sha256.hash(this.a.concat(a));this.r=new sjcl.cipher.aes(this.a);for(a=0;4>a&&(this.d[a]=this.d[a]+1|0,!this.d[a]);a++);},T:function(a){var b=[],c=0,d;this.M=b[0]=(new Date).valueOf()+3E4;for(d=0;16>d;d++)b.push(4294967296*Math.random()|0);for(d=0;d<this.b.length&&(b=
b.concat(this.b[d].finalize()),c+=this.j[d],this.j[d]=0,a||!(this.z&1<<d));d++);this.z>=1<<this.b.length&&(this.b.push(new sjcl.hash.sha256),this.j.push(0));this.f-=c;c>this.g&&(this.g=c);this.z++;this.S(b)},o:function(a){sjcl.random.addEntropy([a.x||a.clientX||a.offsetX||0,a.y||a.clientY||a.offsetY||0],2,"mouse")},n:function(){sjcl.random.addEntropy((new Date).valueOf(),2,"loadtime")},I:function(a,b){var c;a=sjcl.random.q[a];var d=[];for(c in a)a.hasOwnProperty(c)&&d.push(a[c]);for(c=0;c<d.length;c++)d[c](b)}};
try{var s=new Uint32Array(32);crypto.getRandomValues(s);sjcl.random.addEntropy(s,1024,"crypto['getRandomValues']")}catch(t){}
sjcl.json={defaults:{v:1,iter:1E3,ks:128,ts:64,mode:"ccm",adata:"",cipher:"aes"},encrypt:function(a,b,c,d){c=c||{};d=d||{};var e=sjcl.json,f=e.c({iv:sjcl.random.randomWords(4,0)},e.defaults),g;e.c(f,c);c=f.adata;"string"===typeof f.salt&&(f.salt=sjcl.codec.base64.toBits(f.salt));"string"===typeof f.iv&&(f.iv=sjcl.codec.base64.toBits(f.iv));if(!sjcl.mode[f.mode]||!sjcl.cipher[f.cipher]||"string"===typeof a&&100>=f.iter||64!==f.ts&&96!==f.ts&&128!==f.ts||128!==f.ks&&192!==f.ks&&256!==f.ks||2>f.iv.length||
4<f.iv.length)throw new sjcl.exception.invalid("json encrypt: invalid parameters");"string"===typeof a&&(g=sjcl.misc.cachedPbkdf2(a,f),a=g.key.slice(0,f.ks/32),f.salt=g.salt);"string"===typeof b&&(b=sjcl.codec.utf8String.toBits(b));"string"===typeof c&&(c=sjcl.codec.utf8String.toBits(c));g=new sjcl.cipher[f.cipher](a);e.c(d,f);d.key=a;f.ct=sjcl.mode[f.mode].encrypt(g,b,f.iv,c,f.ts);return e.encode(f)},decrypt:function(a,b,c,d){c=c||{};d=d||{};var e=sjcl.json;b=e.c(e.c(e.c({},e.defaults),e.decode(b)),
c,!0);var f;c=b.adata;"string"===typeof b.salt&&(b.salt=sjcl.codec.base64.toBits(b.salt));"string"===typeof b.iv&&(b.iv=sjcl.codec.base64.toBits(b.iv));if(!sjcl.mode[b.mode]||!sjcl.cipher[b.cipher]||"string"===typeof a&&100>=b.iter||64!==b.ts&&96!==b.ts&&128!==b.ts||128!==b.ks&&192!==b.ks&&256!==b.ks||!b.iv||2>b.iv.length||4<b.iv.length)throw new sjcl.exception.invalid("json decrypt: invalid parameters");"string"===typeof a&&(f=sjcl.misc.cachedPbkdf2(a,b),a=f.key.slice(0,b.ks/32),b.salt=f.salt);"string"===
typeof c&&(c=sjcl.codec.utf8String.toBits(c));f=new sjcl.cipher[b.cipher](a);c=sjcl.mode[b.mode].decrypt(f,b.ct,b.iv,c,b.ts);e.c(d,b);d.key=a;return sjcl.codec.utf8String.fromBits(c)},encode:function(a){var b,c="{",d="";for(b in a)if(a.hasOwnProperty(b)){if(!b.match(/^[a-z0-9]+$/i))throw new sjcl.exception.invalid("json encode: invalid property name");c+=d+'"'+b+'":';d=",";switch(typeof a[b]){case "number":case "boolean":c+=a[b];break;case "string":c+='"'+escape(a[b])+'"';break;case "object":c+='"'+
sjcl.codec.base64.fromBits(a[b],0)+'"';break;default:throw new sjcl.exception.bug("json encode: unsupported type");}}return c+"}"},decode:function(a){a=a.replace(/\s/g,"");if(!a.match(/^\{.*\}$/))throw new sjcl.exception.invalid("json decode: this isn't json!");a=a.replace(/^\{|\}$/g,"").split(/,/);var b={},c,d;for(c=0;c<a.length;c++){if(!(d=a[c].match(/^(?:(["']?)([a-z][a-z0-9]*)\1):(?:(\d+)|"([a-z0-9+\/%*_.@=\-]*)")$/i)))throw new sjcl.exception.invalid("json decode: this isn't json!");b[d[2]]=
d[3]?parseInt(d[3],10):d[2].match(/^(ct|salt|iv)$/)?sjcl.codec.base64.toBits(d[4]):unescape(d[4])}return b},c:function(a,b,c){void 0===a&&(a={});if(void 0===b)return a;for(var d in b)if(b.hasOwnProperty(d)){if(c&&void 0!==a[d]&&a[d]!==b[d])throw new sjcl.exception.invalid("required parameter overridden");a[d]=b[d]}return a},V:function(a,b){var c={},d;for(d in a)a.hasOwnProperty(d)&&a[d]!==b[d]&&(c[d]=a[d]);return c},U:function(a,b){var c={},d;for(d=0;d<b.length;d++)void 0!==a[b[d]]&&(c[b[d]]=a[b[d]]);
return c}};sjcl.encrypt=sjcl.json.encrypt;sjcl.decrypt=sjcl.json.decrypt;sjcl.misc.R={};sjcl.misc.cachedPbkdf2=function(a,b){var c=sjcl.misc.R,d;b=b||{};d=b.iter||1E3;c=c[a]=c[a]||{};d=c[d]=c[d]||{firstSalt:b.salt&&b.salt.length?b.salt.slice(0):sjcl.random.randomWords(2,0)};c=void 0===b.salt?d.firstSalt:b.salt;d[c]=d[c]||sjcl.misc.pbkdf2(a,c,b.iter);return{key:d[c].slice(0),salt:c.slice(0)}};goog.net={};goog.net.Cookies=function(a){this.document_=a};goog.net.Cookies.MAX_COOKIE_LENGTH=3950;goog.net.Cookies.SPLIT_RE_=/\s*;\s*/;goog.net.Cookies.prototype.isEnabled=function(){return navigator.cookieEnabled};goog.net.Cookies.prototype.isValidName=function(a){return!/[;=\s]/.test(a)};goog.net.Cookies.prototype.isValidValue=function(a){return!/[;\r\n]/.test(a)};
goog.net.Cookies.prototype.set=function(a,b,c,d,e,f){if(!this.isValidName(a))throw Error('Invalid cookie name "'+a+'"');if(!this.isValidValue(b))throw Error('Invalid cookie value "'+b+'"');goog.isDef(c)||(c=-1);e=e?";domain="+e:"";d=d?";path="+d:"";f=f?";secure":"";c=0>c?"":0==c?";expires="+(new Date(1970,1,1)).toUTCString():";expires="+(new Date(goog.now()+1E3*c)).toUTCString();this.setCookie_(a+"="+b+e+d+c+f)};
goog.net.Cookies.prototype.get=function(a,b){for(var c=a+"=",d=this.getParts_(),e=0,f;f=d[e];e++){if(0==f.lastIndexOf(c,0))return f.substr(c.length);if(f==a)return""}return b};goog.net.Cookies.prototype.remove=function(a,b,c){var d=this.containsKey(a);this.set(a,"",0,b,c);return d};goog.net.Cookies.prototype.getKeys=function(){return this.getKeyValues_().keys};goog.net.Cookies.prototype.getValues=function(){return this.getKeyValues_().values};goog.net.Cookies.prototype.isEmpty=function(){return!this.getCookie_()};
goog.net.Cookies.prototype.getCount=function(){return this.getCookie_()?this.getParts_().length:0};goog.net.Cookies.prototype.containsKey=function(a){return goog.isDef(this.get(a))};goog.net.Cookies.prototype.containsValue=function(a){for(var b=this.getKeyValues_().values,c=0;c<b.length;c++)if(b[c]==a)return!0;return!1};goog.net.Cookies.prototype.clear=function(){for(var a=this.getKeyValues_().keys,b=a.length-1;0<=b;b--)this.remove(a[b])};
goog.net.Cookies.prototype.setCookie_=function(a){this.document_.cookie=a};goog.net.Cookies.prototype.getCookie_=function(){return this.document_.cookie};goog.net.Cookies.prototype.getParts_=function(){return(this.getCookie_()||"").split(goog.net.Cookies.SPLIT_RE_)};goog.net.Cookies.prototype.getKeyValues_=function(){for(var a=this.getParts_(),b=[],c=[],d,e,f=0;e=a[f];f++)d=e.indexOf("="),-1==d?(b.push(""),c.push(e)):(b.push(e.substring(0,d)),c.push(e.substring(d+1)));return{keys:b,values:c}};
goog.net.cookies=new goog.net.Cookies(document);goog.net.cookies.MAX_COOKIE_LENGTH=goog.net.Cookies.MAX_COOKIE_LENGTH;fb.simplelogin.util.env={};fb.simplelogin.util.env.hasLocalStorage=function(a){try{if(localStorage){localStorage.setItem("firebase-sentinel","test");var b=localStorage.getItem("firebase-sentinel");localStorage.removeItem("firebase-sentinel");return"test"===b}}catch(c){}return!1};
fb.simplelogin.util.env.hasSessionStorage=function(a){try{if(sessionStorage){sessionStorage.setItem("firebase-sentinel","test");var b=sessionStorage.getItem("firebase-sentinel");sessionStorage.removeItem("firebase-sentinel");return"test"===b}}catch(c){}return!1};fb.simplelogin.util.env.isMobileCordovaInAppBrowser=function(){return(window.cordova||window.CordovaInAppBrowser||window.phonegap)&&/ios|iphone|ipod|ipad|android/i.test(navigator.userAgent)};
fb.simplelogin.util.env.isMobileTriggerIoTab=function(){return window.forge&&/ios|iphone|ipod|ipad|android/i.test(navigator.userAgent)};fb.simplelogin.util.env.isWindowsMetro=function(){return!!window.Windows&&/^ms-appx:/.test(location.href)};fb.simplelogin.util.env.isChromeiOS=function(){return!!navigator.userAgent.match(/CriOS/)};fb.simplelogin.util.env.isTwitteriOS=function(){return!!navigator.userAgent.match(/Twitter for iPhone/)};fb.simplelogin.util.env.isFacebookiOS=function(){return!!navigator.userAgent.match(/FBAN\/FBIOS/)};
fb.simplelogin.util.env.isWindowsPhone=function(){return!!navigator.userAgent.match(/Windows Phone/)};fb.simplelogin.util.env.isStandaloneiOS=function(){return!!window.navigator.standalone};fb.simplelogin.util.env.isPhantomJS=function(){return!!navigator.userAgent.match(/PhantomJS/)};fb.simplelogin.util.env.isFennec=function(){try{var a=navigator.userAgent;return-1!=a.indexOf("Fennec/")||-1!=a.indexOf("Firefox/")&&-1!=a.indexOf("Android")}catch(b){}return!1};var cookieStoragePath="/",encryptionStorageKey="firebaseSessionKey",sessionPersistentStorageKey="firebaseSession",hasLocalStorage=fb.simplelogin.util.env.hasLocalStorage();fb.simplelogin.SessionStore_=function(){};
fb.simplelogin.SessionStore_.prototype.set=function(a,b){if(hasLocalStorage)try{var c=a.sessionKey,d=sjcl.encrypt(c,fb.simplelogin.util.json.stringify(a));localStorage.setItem(sessionPersistentStorageKey,fb.simplelogin.util.json.stringify(d));goog.net.cookies.set(encryptionStorageKey,c,b?86400*b:-1,cookieStoragePath,null,!1)}catch(e){}};
fb.simplelogin.SessionStore_.prototype.get=function(){if(hasLocalStorage){try{var a=goog.net.cookies.get(encryptionStorageKey),b=localStorage.getItem(sessionPersistentStorageKey);if(a&&b)return fb.simplelogin.util.json.parse(sjcl.decrypt(a,fb.simplelogin.util.json.parse(b)))}catch(c){}return null}};fb.simplelogin.SessionStore_.prototype.clear=function(){hasLocalStorage&&(localStorage.removeItem(sessionPersistentStorageKey),goog.net.cookies.remove(encryptionStorageKey,cookieStoragePath,null))};
fb.simplelogin.SessionStore=new fb.simplelogin.SessionStore_;fb.simplelogin.transports.XHR_=function(){};
fb.simplelogin.transports.XHR_.prototype.open=function(a,b,c){var d=this,e={contentType:"application/json"},f=new XMLHttpRequest,g=(e.method||"GET").toUpperCase(),h=e.contentType||"application/x-www-form-urlencoded",k=!1,l;f.onreadystatechange=function(){if(!k&&4===f.readyState){k=!0;var a,b;try{a=fb.simplelogin.util.json.parse(f.responseText),b=a.error||null,delete a.error}catch(e){}return!a||b?c&&c(d.formatError_(b)):c&&c(b,a)}};b&&("GET"===g?(-1===a.indexOf("?")&&(a+="?"),a+=this.formatQueryString(b),
b=null):("application/json"===h&&(b=fb.simplelogin.util.json.stringify(b)),"application/x-www-form-urlencoded"===h&&(b=this.formatQueryString(b))));f.open(g,a,!0);a={"X-Requested-With":"XMLHttpRequest",Accept:"application/json;text/plain","Content-Type":h};e.headers=e.headers||{};for(l in e.headers)a[l]=e.headers[l];for(l in a)f.setRequestHeader(l,a[l]);f.send(b)};fb.simplelogin.transports.XHR_.prototype.isAvailable=function(){return window.XMLHttpRequest&&"function"===typeof window.XMLHttpRequest};
fb.simplelogin.transports.XHR_.prototype.formatQueryString=function(a){if(!a)return"";var b=[],c;for(c in a)b.push(encodeURIComponent(c)+"="+encodeURIComponent(a[c]));return b.join("&")};fb.simplelogin.transports.XHR_.prototype.formatError_=function(a){return a?fb.simplelogin.Errors.format(a):fb.simplelogin.Errors.get("UNKNOWN_ERROR")};fb.simplelogin.transports.XHR=new fb.simplelogin.transports.XHR_;fb.simplelogin.util.validation={};var VALID_EMAIL_REGEX_=/^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,6})+$/;fb.simplelogin.util.validation.validateArgCount=function(a,b,c,d){var e;d<b?e="at least "+b:d>c&&(e=0===c?"none":"no more than "+c);if(e)throw Error(a+" failed: Was called with "+d+(1===d?" argument.":" arguments.")+" Expects "+e+".");};fb.simplelogin.util.validation.isValidEmail=function(a){return goog.isString(a)&&VALID_EMAIL_REGEX_.test(a)};
fb.simplelogin.util.validation.isValidPassword=function(a){return goog.isString(a)};fb.simplelogin.util.validation.isValidNamespace=function(a){return goog.isString(a)};
fb.simplelogin.util.validation.errorPrefix_=function(a,b,c){var d="";switch(b){case 1:d=c?"first":"First";break;case 2:d=c?"second":"Second";break;case 3:d=c?"third":"Third";break;case 4:d=c?"fourth":"Fourth";break;default:fb.core.util.validation.assert(!1,"errorPrefix_ called with argumentNumber > 4.  Need to update it?")}return a=a+" failed: "+(d+" argument ")};
fb.simplelogin.util.validation.validateNamespace=function(a,b,c,d){if((!d||goog.isDef(c))&&!goog.isString(c))throw Error(fb.simplelogin.util.validation.errorPrefix_(a,b,d)+"must be a valid firebase namespace.");};fb.simplelogin.util.validation.validateCallback=function(a,b,c,d){if((!d||goog.isDef(c))&&!goog.isFunction(c))throw Error(fb.simplelogin.util.validation.errorPrefix_(a,b,d)+"must be a valid function.");};
fb.simplelogin.util.validation.validateString=function(a,b,c,d){if((!d||goog.isDef(c))&&!goog.isString(c))throw Error(fb.simplelogin.util.validation.errorPrefix_(a,b,d)+"must be a valid string.");};fb.simplelogin.util.validation.validateContextObject=function(a,b,c,d){if(!d||goog.isDef(c))if(!goog.isObject(c)||null===c)throw Error(fb.simplelogin.util.validation.errorPrefix_(a,b,d)+"must be a valid context object.");};var CALLBACK_NAMESPACE="_FirebaseSimpleLoginJSONP";fb.simplelogin.transports.JSONP_=function(){window[CALLBACK_NAMESPACE]=window[CALLBACK_NAMESPACE]||{}};fb.simplelogin.transports.JSONP_.prototype.open=function(a,b,c){a+=/\?/.test(a)?"":"?";a+="&transport=jsonp";for(var d in b)a+="&"+encodeURIComponent(d)+"="+encodeURIComponent(b[d]);b=this.generateRequestId_();a+="&callback="+encodeURIComponent(CALLBACK_NAMESPACE+"."+b);this.registerCallback_(b,c);this.writeScriptTag_(b,a,c)};
fb.simplelogin.transports.JSONP_.prototype.generateRequestId_=function(){return"_FirebaseJSONP"+(new Date).getTime()+Math.floor(100*Math.random())};fb.simplelogin.transports.JSONP_.prototype.registerCallback_=function(a,b){var c=this;window[CALLBACK_NAMESPACE][a]=function(d){var e=d.error||null;delete d.error;b(e,d);c.removeCallback_(a)}};
fb.simplelogin.transports.JSONP_.prototype.removeCallback_=function(a){setTimeout(function(){delete window[CALLBACK_NAMESPACE][a];var b=document.getElementById(a);b&&b.parentNode.removeChild(b)},0)};
fb.simplelogin.transports.JSONP_.prototype.writeScriptTag_=function(a,b,c){var d=this;setTimeout(function(){try{var e=document.createElement("script");e.type="text/javascript";e.id=a;e.async=!0;e.src=b;e.onerror=function(){var b=document.getElementById(a);null!==b&&b.parentNode.removeChild(b);c&&c(d.formatError_({code:"SERVER_ERROR",message:"An unknown server error occurred."}))};var f=document.getElementsByTagName("script")[0];f.parentNode.insertBefore(e,f)}catch(g){c&&c(d.formatError_({code:"SERVER_ERROR",
message:"An unknown server error occurred."}))}},0)};fb.simplelogin.transports.JSONP_.prototype.formatError_=function(a){var b;a?(b=Error(a.message),b.code=a.code||"UNKNOWN_ERROR"):(b=Error(),b.code="UNKNOWN_ERROR");return b};fb.simplelogin.transports.JSONP=new fb.simplelogin.transports.JSONP_;fb.simplelogin.providers={};fb.simplelogin.providers.Password_=function(){};fb.simplelogin.providers.Password_.prototype.getTransport_=function(){return fb.simplelogin.transports.XHR.isAvailable()?fb.simplelogin.transports.XHR:fb.simplelogin.transports.JSONP};
fb.simplelogin.providers.Password_.prototype.login=function(a,b){var c=fb.simplelogin.Vars.getApiHost()+"/auth/firebase";if(!fb.simplelogin.util.validation.isValidNamespace(a.firebase))return b&&b(fb.simplelogin.Errors.get("INVALID_FIREBASE"));this.getTransport_().open(c,a,b)};
fb.simplelogin.providers.Password_.prototype.createUser=function(a,b){var c=fb.simplelogin.Vars.getApiHost()+"/auth/firebase/create";if(!fb.simplelogin.util.validation.isValidNamespace(a.firebase))return b&&b(fb.simplelogin.Errors.get("INVALID_FIREBASE"));if(!fb.simplelogin.util.validation.isValidEmail(a.email))return b&&b(fb.simplelogin.Errors.get("INVALID_EMAIL"));if(!fb.simplelogin.util.validation.isValidPassword(a.password))return b&&b(fb.simplelogin.Errors.get("INVALID_PASSWORD"));this.getTransport_().open(c,
a,b)};
fb.simplelogin.providers.Password_.prototype.changePassword=function(a,b){var c=fb.simplelogin.Vars.getApiHost()+"/auth/firebase/update";if(!fb.simplelogin.util.validation.isValidNamespace(a.firebase))return b&&b(fb.simplelogin.Errors.get("INVALID_FIREBASE"));if(!fb.simplelogin.util.validation.isValidEmail(a.email))return b&&b(fb.simplelogin.Errors.get("INVALID_EMAIL"));if(!fb.simplelogin.util.validation.isValidPassword(a.newPassword))return b&&b(fb.simplelogin.Errors.get("INVALID_PASSWORD"));this.getTransport_().open(c,
a,b)};
fb.simplelogin.providers.Password_.prototype.removeUser=function(a,b){var c=fb.simplelogin.Vars.getApiHost()+"/auth/firebase/remove";if(!fb.simplelogin.util.validation.isValidNamespace(a.firebase))return b&&b(fb.simplelogin.Errors.get("INVALID_FIREBASE"));if(!fb.simplelogin.util.validation.isValidEmail(a.email))return b&&b(fb.simplelogin.Errors.get("INVALID_EMAIL"));if(!fb.simplelogin.util.validation.isValidPassword(a.password))return b&&b(fb.simplelogin.Errors.get("INVALID_PASSWORD"));this.getTransport_().open(c,a,
b)};fb.simplelogin.providers.Password_.prototype.sendPasswordResetEmail=function(a,b){var c=fb.simplelogin.Vars.getApiHost()+"/auth/firebase/reset_password";if(!fb.simplelogin.util.validation.isValidNamespace(a.firebase))return b&&b(fb.simplelogin.Errors.get("INVALID_FIREBASE"));if(!fb.simplelogin.util.validation.isValidEmail(a.email))return b&&b(fb.simplelogin.Errors.get("INVALID_EMAIL"));this.getTransport_().open(c,a,b)};fb.simplelogin.providers.Password=new fb.simplelogin.providers.Password_;fb.simplelogin.transports.WindowsMetroAuthBroker_=function(){};
fb.simplelogin.transports.WindowsMetroAuthBroker_.prototype.open=function(a,b,c){var d,e,f,g,h,k;try{d=window.Windows.Foundation.Uri,e=window.Windows.Security.Authentication.Web.WebAuthenticationOptions,f=window.Windows.Security.Authentication.Web.WebAuthenticationBroker,g=f.authenticateAsync}catch(l){return c({code:"WINDOWS_METRO",message:'"Windows.Security.Authentication.Web.WebAuthenticationBroker" required when using Firebase Simple Login in Windows Metro context'})}h=!1;k=function(){var a=Array.prototype.slice.apply(arguments);
h||(h=!0,c.apply(null,a))};a=new d(a+"&transport=internal-redirect-hash");d=new d(fb.simplelogin.Vars.getApiHost()+"/blank/page.html");g(e.none,a,d).done(function(a){var b;if(a&&a.responseData)try{var c=fb.simplelogin.util.misc.parseUrl(a.responseData),d=fb.simplelogin.util.misc.parseQuerystring(decodeURIComponent(c.hash));a={};for(var e in d)a[e]=fb.simplelogin.util.json.parse(d[e]);b=a}catch(f){}b&&b.token&&b.user?k(null,b):b&&b.error?k(b.error):k({code:"UNKNOWN_ERROR",message:"An unknown error occurred."})},
function(a){k({code:"UNKNOWN_ERROR",message:"An unknown error occurred."})})};fb.simplelogin.transports.WindowsMetroAuthBroker=new fb.simplelogin.transports.WindowsMetroAuthBroker_;goog.string={};goog.string.Unicode={NBSP:"\u00a0"};goog.string.startsWith=function(a,b){return 0==a.lastIndexOf(b,0)};goog.string.endsWith=function(a,b){var c=a.length-b.length;return 0<=c&&a.indexOf(b,c)==c};goog.string.caseInsensitiveStartsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(0,b.length))};goog.string.caseInsensitiveEndsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(a.length-b.length,b.length))};
goog.string.caseInsensitiveEquals=function(a,b){return a.toLowerCase()==b.toLowerCase()};goog.string.subs=function(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")};goog.string.collapseWhitespace=function(a){return a.replace(/[\s\xa0]+/g," ").replace(/^\s+|\s+$/g,"")};goog.string.isEmpty=function(a){return/^[\s\xa0]*$/.test(a)};goog.string.isEmptySafe=function(a){return goog.string.isEmpty(goog.string.makeSafe(a))};
goog.string.isBreakingWhitespace=function(a){return!/[^\t\n\r ]/.test(a)};goog.string.isAlpha=function(a){return!/[^a-zA-Z]/.test(a)};goog.string.isNumeric=function(a){return!/[^0-9]/.test(a)};goog.string.isAlphaNumeric=function(a){return!/[^a-zA-Z0-9]/.test(a)};goog.string.isSpace=function(a){return" "==a};goog.string.isUnicodeChar=function(a){return 1==a.length&&" "<=a&&"~">=a||"\u0080"<=a&&"\ufffd">=a};goog.string.stripNewlines=function(a){return a.replace(/(\r\n|\r|\n)+/g," ")};
goog.string.canonicalizeNewlines=function(a){return a.replace(/(\r\n|\r|\n)/g,"\n")};goog.string.normalizeWhitespace=function(a){return a.replace(/\xa0|\s/g," ")};goog.string.normalizeSpaces=function(a){return a.replace(/\xa0|[ \t]+/g," ")};goog.string.collapseBreakingSpaces=function(a){return a.replace(/[\t\r\n ]+/g," ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g,"")};goog.string.trim=function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};
goog.string.trimLeft=function(a){return a.replace(/^[\s\xa0]+/,"")};goog.string.trimRight=function(a){return a.replace(/[\s\xa0]+$/,"")};goog.string.caseInsensitiveCompare=function(a,b){var c=String(a).toLowerCase(),d=String(b).toLowerCase();return c<d?-1:c==d?0:1};goog.string.numerateCompareRegExp_=/(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare=function(a,b){if(a==b)return 0;if(!a)return-1;if(!b)return 1;for(var c=a.toLowerCase().match(goog.string.numerateCompareRegExp_),d=b.toLowerCase().match(goog.string.numerateCompareRegExp_),e=Math.min(c.length,d.length),f=0;f<e;f++){var g=c[f],h=d[f];if(g!=h)return c=parseInt(g,10),!isNaN(c)&&(d=parseInt(h,10),!isNaN(d)&&c-d)?c-d:g<h?-1:1}return c.length!=d.length?c.length-d.length:a<b?-1:1};goog.string.urlEncode=function(a){return encodeURIComponent(String(a))};
goog.string.urlDecode=function(a){return decodeURIComponent(a.replace(/\+/g," "))};goog.string.newLineToBr=function(a,b){return a.replace(/(\r\n|\r|\n)/g,b?"<br />":"<br>")};
goog.string.htmlEscape=function(a,b){if(b)return a.replace(goog.string.amperRe_,"&amp;").replace(goog.string.ltRe_,"&lt;").replace(goog.string.gtRe_,"&gt;").replace(goog.string.quotRe_,"&quot;").replace(goog.string.singleQuoteRe_,"&#39;");if(!goog.string.allRe_.test(a))return a;-1!=a.indexOf("&")&&(a=a.replace(goog.string.amperRe_,"&amp;"));-1!=a.indexOf("<")&&(a=a.replace(goog.string.ltRe_,"&lt;"));-1!=a.indexOf(">")&&(a=a.replace(goog.string.gtRe_,"&gt;"));-1!=a.indexOf('"')&&(a=a.replace(goog.string.quotRe_,
"&quot;"));-1!=a.indexOf("'")&&(a=a.replace(goog.string.singleQuoteRe_,"&#39;"));return a};goog.string.amperRe_=/&/g;goog.string.ltRe_=/</g;goog.string.gtRe_=/>/g;goog.string.quotRe_=/"/g;goog.string.singleQuoteRe_=/'/g;goog.string.allRe_=/[&<>"']/;goog.string.unescapeEntities=function(a){return goog.string.contains(a,"&")?"document"in goog.global?goog.string.unescapeEntitiesUsingDom_(a):goog.string.unescapePureXmlEntities_(a):a};
goog.string.unescapeEntitiesWithDocument=function(a,b){return goog.string.contains(a,"&")?goog.string.unescapeEntitiesUsingDom_(a,b):a};
goog.string.unescapeEntitiesUsingDom_=function(a,b){var c={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"'},d;d=b?b.createElement("div"):document.createElement("div");return a.replace(goog.string.HTML_ENTITY_PATTERN_,function(a,b){var g=c[a];if(g)return g;if("#"==b.charAt(0)){var h=Number("0"+b.substr(1));isNaN(h)||(g=String.fromCharCode(h))}g||(d.innerHTML=a+" ",g=d.firstChild.nodeValue.slice(0,-1));return c[a]=g})};
goog.string.unescapePureXmlEntities_=function(a){return a.replace(/&([^;]+);/g,function(a,c){switch(c){case "amp":return"&";case "lt":return"<";case "gt":return">";case "quot":return'"';default:if("#"==c.charAt(0)){var d=Number("0"+c.substr(1));if(!isNaN(d))return String.fromCharCode(d)}return a}})};goog.string.HTML_ENTITY_PATTERN_=/&([^;\s<&]+);?/g;goog.string.whitespaceEscape=function(a,b){return goog.string.newLineToBr(a.replace(/  /g," &#160;"),b)};
goog.string.stripQuotes=function(a,b){for(var c=b.length,d=0;d<c;d++){var e=1==c?b:b.charAt(d);if(a.charAt(0)==e&&a.charAt(a.length-1)==e)return a.substring(1,a.length-1)}return a};goog.string.truncate=function(a,b,c){c&&(a=goog.string.unescapeEntities(a));a.length>b&&(a=a.substring(0,b-3)+"...");c&&(a=goog.string.htmlEscape(a));return a};
goog.string.truncateMiddle=function(a,b,c,d){c&&(a=goog.string.unescapeEntities(a));if(d&&a.length>b){d>b&&(d=b);var e=a.length-d;a=a.substring(0,b-d)+"..."+a.substring(e)}else a.length>b&&(d=Math.floor(b/2),e=a.length-d,a=a.substring(0,d+b%2)+"..."+a.substring(e));c&&(a=goog.string.htmlEscape(a));return a};goog.string.specialEscapeChars_={"\x00":"\\0","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\x0B",'"':'\\"',"\\":"\\\\"};goog.string.jsEscapeCache_={"'":"\\'"};
goog.string.quote=function(a){a=String(a);if(a.quote)return a.quote();for(var b=['"'],c=0;c<a.length;c++){var d=a.charAt(c),e=d.charCodeAt(0);b[c+1]=goog.string.specialEscapeChars_[d]||(31<e&&127>e?d:goog.string.escapeChar(d))}b.push('"');return b.join("")};goog.string.escapeString=function(a){for(var b=[],c=0;c<a.length;c++)b[c]=goog.string.escapeChar(a.charAt(c));return b.join("")};
goog.string.escapeChar=function(a){if(a in goog.string.jsEscapeCache_)return goog.string.jsEscapeCache_[a];if(a in goog.string.specialEscapeChars_)return goog.string.jsEscapeCache_[a]=goog.string.specialEscapeChars_[a];var b=a,c=a.charCodeAt(0);if(31<c&&127>c)b=a;else{if(256>c){if(b="\\x",16>c||256<c)b+="0"}else b="\\u",4096>c&&(b+="0");b+=c.toString(16).toUpperCase()}return goog.string.jsEscapeCache_[a]=b};goog.string.toMap=function(a){for(var b={},c=0;c<a.length;c++)b[a.charAt(c)]=!0;return b};
goog.string.contains=function(a,b){return-1!=a.indexOf(b)};goog.string.countOf=function(a,b){return a&&b?a.split(b).length-1:0};goog.string.removeAt=function(a,b,c){var d=a;0<=b&&b<a.length&&0<c&&(d=a.substr(0,b)+a.substr(b+c,a.length-b-c));return d};goog.string.remove=function(a,b){var c=RegExp(goog.string.regExpEscape(b),"");return a.replace(c,"")};goog.string.removeAll=function(a,b){var c=RegExp(goog.string.regExpEscape(b),"g");return a.replace(c,"")};
goog.string.regExpEscape=function(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")};goog.string.repeat=function(a,b){return Array(b+1).join(a)};goog.string.padNumber=function(a,b,c){a=goog.isDef(c)?a.toFixed(c):String(a);c=a.indexOf(".");-1==c&&(c=a.length);return goog.string.repeat("0",Math.max(0,b-c))+a};goog.string.makeSafe=function(a){return null==a?"":String(a)};goog.string.buildString=function(a){return Array.prototype.join.call(arguments,"")};
goog.string.getRandomString=function(){return Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^goog.now()).toString(36)};
goog.string.compareVersions=function(a,b){for(var c=0,d=goog.string.trim(String(a)).split("."),e=goog.string.trim(String(b)).split("."),f=Math.max(d.length,e.length),g=0;0==c&&g<f;g++){var h=d[g]||"",k=e[g]||"",l=RegExp("(\\d*)(\\D*)","g"),m=RegExp("(\\d*)(\\D*)","g");do{var n=l.exec(h)||["","",""],p=m.exec(k)||["","",""];if(0==n[0].length&&0==p[0].length)break;var c=0==n[1].length?0:parseInt(n[1],10),q=0==p[1].length?0:parseInt(p[1],10),c=goog.string.compareElements_(c,q)||goog.string.compareElements_(0==
n[2].length,0==p[2].length)||goog.string.compareElements_(n[2],p[2])}while(0==c)}return c};goog.string.compareElements_=function(a,b){return a<b?-1:a>b?1:0};goog.string.HASHCODE_MAX_=4294967296;goog.string.hashCode=function(a){for(var b=0,c=0;c<a.length;++c)b=31*b+a.charCodeAt(c),b%=goog.string.HASHCODE_MAX_;return b};goog.string.uniqueStringCounter_=2147483648*Math.random()|0;goog.string.createUniqueString=function(){return"goog_"+goog.string.uniqueStringCounter_++};
goog.string.toNumber=function(a){var b=Number(a);return 0==b&&goog.string.isEmpty(a)?NaN:b};goog.string.isLowerCamelCase=function(a){return/^[a-z]+([A-Z][a-z]*)*$/.test(a)};goog.string.isUpperCamelCase=function(a){return/^([A-Z][a-z]*)+$/.test(a)};goog.string.toCamelCase=function(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})};goog.string.toSelectorCase=function(a){return String(a).replace(/([A-Z])/g,"-$1").toLowerCase()};
goog.string.toTitleCase=function(a,b){var c=goog.isString(b)?goog.string.regExpEscape(b):"\\s";return a.replace(RegExp("(^"+(c?"|["+c+"]+":"")+")([a-z])","g"),function(a,b,c){return b+c.toUpperCase()})};goog.string.parseInt=function(a){isFinite(a)&&(a=String(a));return goog.isString(a)?/^\s*-?0x/i.test(a)?parseInt(a,16):parseInt(a,10):NaN};goog.string.splitLimit=function(a,b,c){a=a.split(b);for(var d=[];0<c&&a.length;)d.push(a.shift()),c--;a.length&&d.push(a.join(b));return d};fb.simplelogin.providers.Persona_=function(){};fb.simplelogin.providers.Persona_.prototype.login=function(a,b){navigator.id.watch({onlogin:function(a){b(a)},onlogout:function(){}});a=a||{};a.oncancel=function(){b(null)};navigator.id.request(a)};fb.simplelogin.providers.Persona=new fb.simplelogin.providers.Persona_;var CLIENT_VERSION="1.3.1";
fb.simplelogin.client=function(a,b,c,d){function e(a,b,c){setTimeout(function(){a(b,c)},0)}this.mRef=a;this.mNamespace=fb.simplelogin.util.misc.parseSubdomain(a.toString());this.sessionLengthDays=null;window._FirebaseSimpleLogin=window._FirebaseSimpleLogin||{};window._FirebaseSimpleLogin.callbacks=window._FirebaseSimpleLogin.callbacks||[];window._FirebaseSimpleLogin.callbacks.push({cb:b,ctx:c});"file:"===window.location.protocol&&!fb.simplelogin.util.env.isPhantomJS()&&!fb.simplelogin.util.env.isMobileCordovaInAppBrowser()&&
console&&console.log&&console.log("FirebaseSimpleLogin(): Due to browser security restrictions, loading applications via `file://*` URLs will prevent popup-based authentication providers from working properly. When testing locally, you'll need to run a barebones webserver on your machine rather than loading your test files via `file://*`. The easiest way to run a barebones server on your local machine is to `cd` to the root directory of your code and run `python -m SimpleHTTPServer`, which will allow you to access your content via `http://127.0.0.1:8000/*`.");
d&&fb.simplelogin.Vars.setApiHost(d);this.mLoginStateChange=function(a,b){var c=window._FirebaseSimpleLogin.callbacks||[];Array.prototype.slice.apply(arguments);for(var d=0;d<c.length;d++){var l=c[d],m=!!a||"undefined"===typeof l.user;if(!m){var n,p;l.user&&l.user.firebaseAuthToken&&(n=l.user.firebaseAuthToken);b&&b.firebaseAuthToken&&(p=b.firebaseAuthToken);m=(n||p)&&n!==p}window._FirebaseSimpleLogin.callbacks[d].user=b||null;m&&e(goog.bind(l.cb,l.ctx),a,b)}};this.resumeSession()};
fb.simplelogin.client.prototype.setApiHost=function(a){fb.simplelogin.Vars.setApiHost(a)};goog.exportSymbol("fb.simplelogin.client.prototype.setApiHost",fb.simplelogin.client.prototype.setApiHost);
fb.simplelogin.client.prototype.resumeSession=function(){var a=this,b;try{b=sessionStorage.getItem("firebaseRequestId"),sessionStorage.removeItem("firebaseRequestId")}catch(c){}if(b){var d=fb.simplelogin.transports.JSONP;fb.simplelogin.transports.XHR.isAvailable()&&(d=fb.simplelogin.transports.XHR);d.open(fb.simplelogin.Vars.getApiHost()+"/auth/session",{requestId:b,firebase:a.mNamespace},function(b,c){c&&c.token&&c.user?a.attemptAuth(c.token,c.user,!0):b?(fb.simplelogin.SessionStore.clear(),a.mLoginStateChange(b)):
(fb.simplelogin.SessionStore.clear(),a.mLoginStateChange(null,null))})}else(b=fb.simplelogin.SessionStore.get())&&b.token&&b.user?a.attemptAuth(b.token,b.user,!1):a.mLoginStateChange(null,null)};
fb.simplelogin.client.prototype.attemptAuth=function(a,b,c){var d=this;this.mRef.auth(a,function(e,f){e?(fb.simplelogin.SessionStore.clear(),d.mLoginStateChange(null,null)):(c&&fb.simplelogin.SessionStore.set({token:a,user:b,sessionKey:b.sessionKey},d.sessionLengthDays),"function"==typeof f&&f(),delete b.sessionKey,b.firebaseAuthToken=a,d.mLoginStateChange(null,b))},function(a){fb.simplelogin.SessionStore.clear();d.mLoginStateChange(null,null)})};
fb.simplelogin.client.prototype.login=function(){fb.simplelogin.util.validation.validateString("FirebaseSimpleLogin.login()",1,arguments[0],!1);fb.simplelogin.util.validation.validateArgCount("FirebaseSimpleLogin.login()",1,2,arguments.length);var a=arguments[0].toLowerCase(),b=arguments[1]||{};this.sessionLengthDays=b.rememberMe?30:null;switch(a){case "anonymous":return this.loginAnonymously(b);case "facebook-token":return this.loginWithFacebookToken(b);case "github":return this.loginWithGithub(b);
case "google-token":return this.loginWithGoogleToken(b);case "password":return this.loginWithPassword(b);case "persona":return this.loginWithPersona(b);case "twitter-token":return this.loginWithTwitterToken(b);case "facebook":return b.access_token?this.loginWithFacebookToken(b):this.loginWithFacebook(b);case "google":return b.access_token?this.loginWithGoogleToken(b):this.loginWithGoogle(b);case "twitter":return b.oauth_token&&b.oauth_token_secret?this.loginWithTwitterToken(b):this.loginWithTwitter(b);
default:throw Error("FirebaseSimpleLogin.login("+a+") failed: unrecognized authentication provider");}};goog.exportSymbol("fb.simplelogin.client.prototype.login",fb.simplelogin.client.prototype.login);
fb.simplelogin.client.prototype.loginAnonymously=function(a){var b=this;a.firebase=this.mNamespace;a.v=CLIENT_VERSION;fb.simplelogin.transports.JSONP.open(fb.simplelogin.Vars.getApiHost()+"/auth/anonymous",a,function(a,d){a||!d.token?b.mLoginStateChange(fb.simplelogin.Errors.format(a),null):b.attemptAuth(d.token,d.user,!0)})};
fb.simplelogin.client.prototype.loginWithPassword=function(a){var b=this;a.firebase=this.mNamespace;a.v=CLIENT_VERSION;fb.simplelogin.providers.Password.login(a,function(a,d){a||!d.token?b.mLoginStateChange(fb.simplelogin.Errors.format(a)):b.attemptAuth(d.token,d.user,!0)})};fb.simplelogin.client.prototype.loginWithGithub=function(a){a.height=850;a.width=950;this.loginViaOAuth("github",a)};
fb.simplelogin.client.prototype.loginWithGoogle=function(a){a.height=650;a.width=575;this.loginViaOAuth("google",a)};fb.simplelogin.client.prototype.loginWithFacebook=function(a){a.height=400;a.width=535;this.loginViaOAuth("facebook",a)};fb.simplelogin.client.prototype.loginWithTwitter=function(a){this.loginViaOAuth("twitter",a)};fb.simplelogin.client.prototype.loginWithFacebookToken=function(a){this.loginViaToken("facebook",a)};
fb.simplelogin.client.prototype.loginWithGoogleToken=function(a){this.loginViaToken("google",a)};fb.simplelogin.client.prototype.loginWithTwitterToken=function(a){this.loginViaToken("twitter",a)};
fb.simplelogin.client.prototype.loginWithPersona=function(a){var b=this;if(!navigator.id)throw Error("FirebaseSimpleLogin.login(persona): Unable to find Persona include.js");fb.simplelogin.providers.Persona.login(a,function(a){null===a?callback(fb.simplelogin.Errors.get("UNKNOWN_ERROR")):fb.simplelogin.transports.JSONP.open(fb.simplelogin.Vars.getApiHost()+"/auth/persona/token",{firebase:b.mNamespace,assertion:a,v:CLIENT_VERSION},function(a,c){!a&&c.token&&c.user?b.attemptAuth(c.token,c.user,!0):
b.mLoginStateChange(fb.simplelogin.Errors.format(a),null)})})};fb.simplelogin.client.prototype.logout=function(){fb.simplelogin.SessionStore.clear();this.mRef.unauth();this.mLoginStateChange(null,null)};goog.exportSymbol("fb.simplelogin.client.prototype.logout",fb.simplelogin.client.prototype.logout);
fb.simplelogin.client.prototype.loginViaToken=function(a,b,c){b=b||{};b.v=CLIENT_VERSION;var d=this;a=fb.simplelogin.Vars.getApiHost()+"/auth/"+a+"/token?firebase="+d.mNamespace;fb.simplelogin.transports.JSONP.open(a,b,function(a,b){!a&&b.token&&b.user?d.attemptAuth(b.token,b.user,!0):d.mLoginStateChange(fb.simplelogin.Errors.format(a),null)})};
fb.simplelogin.client.prototype.loginViaOAuth=function(a,b,c){b=b||{};var d=this;a=fb.simplelogin.Vars.getApiHost()+"/auth/"+a+"?firebase="+this.mNamespace;b.scope&&(a+="&scope="+b.scope);b.debug&&(a+="&debug="+b.debug);a+="&v="+encodeURIComponent(CLIENT_VERSION);c={menubar:0,location:0,resizable:0,scrollbars:1,status:0,dialog:1,width:700,height:375};b.height&&(c.height=b.height,delete b.height);b.width&&(c.width=b.width,delete b.width);var e=fb.simplelogin.util.env.isMobileCordovaInAppBrowser()?
"mobile-phonegap":fb.simplelogin.util.env.isMobileTriggerIoTab()?"mobile-triggerio":fb.simplelogin.util.env.isWindowsMetro()?"windows-metro":"desktop",f;if("desktop"===e){f=fb.simplelogin.transports.WinChan;var e=[],g;for(g in c)e.push(g+"="+c[g]);b.url+="&transport=winchan";b.relay_url=fb.simplelogin.Vars.getApiHost()+"/auth/channel";b.window_features=e.join(",")}else"mobile-phonegap"===e?f=fb.simplelogin.transports.CordovaInAppBrowser:"mobile-triggerio"===e?f=fb.simplelogin.transports.TriggerIoTab:
"windows-metro"===e&&(f=fb.simplelogin.transports.WindowsMetroAuthBroker);if(b.preferRedirect||fb.simplelogin.util.env.isChromeiOS()||fb.simplelogin.util.env.isWindowsPhone()||fb.simplelogin.util.env.isStandaloneiOS()||fb.simplelogin.util.env.isTwitteriOS()||fb.simplelogin.util.env.isFacebookiOS()){b=goog.string.getRandomString()+goog.string.getRandomString();try{sessionStorage.setItem("firebaseRequestId",b)}catch(h){}a+="&requestId="+b+"&fb_redirect_uri="+encodeURIComponent(window.location.href);
window.location=a}else f.open(a,b,function(a,b){if(b&&b.token&&b.user)d.attemptAuth(b.token,b.user,!0);else{var c=a||{code:"UNKNOWN_ERROR",message:"An unknown error occurred."};"unknown closed window"===a?c={code:"USER_DENIED",message:"User cancelled the authentication request."}:b&&b.error&&(c=b.error);d.mLoginStateChange(fb.simplelogin.Errors.format(c),null)}})};
fb.simplelogin.client.prototype.manageFirebaseUsers=function(a,b,c){b.firebase=this.mNamespace;fb.simplelogin.providers.Password[a](b,function(a,b){return a?c&&c(fb.simplelogin.Errors.format(a),null):c&&c(null,b)})};fb.simplelogin.client.prototype.createUser=function(a,b,c){this.manageFirebaseUsers("createUser",{email:a,password:b},c)};goog.exportSymbol("fb.simplelogin.client.prototype.createUser",fb.simplelogin.client.prototype.createUser);
fb.simplelogin.client.prototype.changePassword=function(a,b,c,d){this.manageFirebaseUsers("changePassword",{email:a,oldPassword:b,newPassword:c},function(a){return d&&d(a)})};goog.exportSymbol("fb.simplelogin.client.prototype.changePassword",fb.simplelogin.client.prototype.changePassword);fb.simplelogin.client.prototype.removeUser=function(a,b,c){this.manageFirebaseUsers("removeUser",{email:a,password:b},function(a){return c&&c(a)})};
goog.exportSymbol("fb.simplelogin.client.prototype.removeUser",fb.simplelogin.client.prototype.removeUser);fb.simplelogin.client.prototype.sendPasswordResetEmail=function(a,b){this.manageFirebaseUsers("sendPasswordResetEmail",{email:a},function(a){return b&&b(a)})};goog.exportSymbol("fb.simplelogin.client.prototype.sendPasswordResetEmail",fb.simplelogin.client.prototype.sendPasswordResetEmail);fb.simplelogin.client.onOpen=function(a){fb.simplelogin.transports.WinChan.onOpen(a)};
goog.exportSymbol("fb.simplelogin.client.onOpen",fb.simplelogin.client.onOpen);var FirebaseSimpleLogin=function(a,b,c,d){fb.simplelogin.util.validation.validateArgCount("new FirebaseSimpleLogin",1,4,arguments.length);fb.simplelogin.util.validation.validateCallback("new FirebaseSimpleLogin",2,b,!1);if(goog.isString(a))throw Error("new FirebaseSimpleLogin(): Oops, it looks like you passed a string instead of a Firebase reference (i.e. new Firebase(<firebaseURL>)).");var e=fb.simplelogin.util.misc.parseSubdomain(a.toString());if(!goog.isString(e))throw Error("new FirebaseSimpleLogin(): First argument must be a valid Firebase reference (i.e. new Firebase(<firebaseURL>)).");
var f=new fb.simplelogin.client(a,b,c,d);return{setApiHost:function(a){fb.simplelogin.util.validation.validateArgCount("FirebaseSimpleLogin.setApiHost",1,1,arguments.length);f.setApiHost(a)},login:function(){f.login.apply(f,arguments)},logout:function(){fb.simplelogin.util.validation.validateArgCount("FirebaseSimpleLogin.logout",0,0,arguments.length);f.logout()},createUser:function(a,b,c){fb.simplelogin.util.validation.validateArgCount("FirebaseSimpleLogin.createUser",3,3,arguments.length);fb.simplelogin.util.validation.validateCallback("FirebaseSimpleLogin.createUser",
3,c,!1);f.createUser(a,b,c)},changePassword:function(a,b,c,d){fb.simplelogin.util.validation.validateArgCount("FirebaseSimpleLogin.changePassword",4,4,arguments.length);fb.simplelogin.util.validation.validateCallback("FirebaseSimpleLogin.changePassword",4,d,!1);f.changePassword(a,b,c,d)},removeUser:function(a,b,c){fb.simplelogin.util.validation.validateArgCount("FirebaseSimpleLogin.removeUser",3,3,arguments.length);fb.simplelogin.util.validation.validateCallback("FirebaseSimpleLogin.removeUser",3,
c,!1);f.removeUser(a,b,c)},sendPasswordResetEmail:function(a,b){fb.simplelogin.util.validation.validateArgCount("FirebaseSimpleLogin.sendPasswordResetEmail",2,2,arguments.length);fb.simplelogin.util.validation.validateCallback("FirebaseSimpleLogin.sendPasswordResetEmail",2,b,!1);f.sendPasswordResetEmail(a,b)}}};goog.exportSymbol("FirebaseSimpleLogin",FirebaseSimpleLogin);FirebaseSimpleLogin.onOpen=function(a){fb.simplelogin.client.onOpen(a)};goog.exportProperty(FirebaseSimpleLogin,"onOpen",FirebaseSimpleLogin.onOpen);})();

// AngularFire is an officially supported AngularJS binding for Firebase.
// The bindings let you associate a Firebase URL with a model (or set of
// models), and they will be transparently kept in sync across all clients
// currently using your app. The 2-way data binding offered by AngularJS works
// as normal, except that the changes are also sent to all other clients
// instead of just a server.
//
//      AngularFire 0.7.1
//      http://angularfire.com
//      License: MIT

"use strict";

(function() {

  var AngularFire, AngularFireAuth;

  // Define the `firebase` module under which all AngularFire
  // services will live.
  angular.module("firebase", []).value("Firebase", Firebase);

  // Define the `$firebase` service that provides synchronization methods.
  angular.module("firebase").factory("$firebase", ["$q", "$parse", "$timeout",
    function($q, $parse, $timeout) {
      // The factory returns an object containing the value of the data at
      // the Firebase location provided, as well as several methods. It
      // takes a single argument:
      //
      //   * `ref`: A Firebase reference. Queries or limits may be applied.
      return function(ref) {
        var af = new AngularFire($q, $parse, $timeout, ref);
        return af.construct();
      };
    }
  ]);

  // Define the `orderByPriority` filter that sorts objects returned by
  // $firebase in the order of priority. Priority is defined by Firebase,
  // for more info see: https://www.firebase.com/docs/ordered-data.html
  angular.module("firebase").filter("orderByPriority", function() {
    return function(input) {
      var sorted = [];
      if (input) {
        if (!input.$getIndex || typeof input.$getIndex != "function") {
          // input is not an angularFire instance
          if (angular.isArray(input)) {
            // If input is an array, copy it
            sorted = input.slice(0);
          } else if (angular.isObject(input)) {
            // If input is an object, map it to an array
            angular.forEach(input, function(prop) {
              sorted.push(prop);
            });
          }
        } else {
          // input is an angularFire instance
          var index = input.$getIndex();
          if (index.length > 0) {
            for (var i = 0; i < index.length; i++) {
              var val = input[index[i]];
              if (val) {
                val.$id = index[i];
                sorted.push(val);
              }
            }
          }
        }
      }
      return sorted;
    };
  });

  // Shim Array.indexOf for IE compatibility.
  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement, fromIndex) {
      if (this === undefined || this === null) {
        throw new TypeError("'this' is null or not defined");
      }
      // Hack to convert object.length to a UInt32
      // jshint -W016
      var length = this.length >>> 0;
      fromIndex = +fromIndex || 0;
      // jshint +W016

      if (Math.abs(fromIndex) === Infinity) {
        fromIndex = 0;
      }

      if (fromIndex < 0) {
        fromIndex += length;
        if (fromIndex < 0) {
          fromIndex = 0;
        }
      }

      for (;fromIndex < length; fromIndex++) {
        if (this[fromIndex] === searchElement) {
          return fromIndex;
        }
      }

      return -1;
    };
  }

  // The `AngularFire` object that implements synchronization.
  AngularFire = function($q, $parse, $timeout, ref) {
    this._q = $q;
    this._parse = $parse;
    this._timeout = $timeout;

    // set to true when $bind is called, this tells us whether we need
    // to synchronize a $scope variable during data change events
    // and also whether we will need to $watch the variable for changes
    // we can only $bind to a single instance at a time
    this._bound = false;

    // true after the initial loading event completes, see _getInitialValue()
    this._loaded = false;

    // stores the list of keys if our data is an object, see $getIndex()
    this._index = [];

    // An object storing handlers used for different events.
    this._on = {
      value: [],
      change: [],
      loaded: [],
      child_added: [],
      child_moved: [],
      child_changed: [],
      child_removed: []
    };

    if (typeof ref == "string") {
      throw new Error("Please provide a Firebase reference instead " +
        "of a URL, eg: new Firebase(url)");
    }
    this._fRef = ref;
  };

  AngularFire.prototype = {
    // This function is called by the factory to create a new explicit sync
    // point between a particular model and a Firebase location.
    construct: function() {
      var self = this;
      var object = {};

      // Set the $id val equal to the Firebase reference's name() function.
      object.$id = self._fRef.ref().name();

      // Establish a 3-way data binding (implicit sync) with the specified
      // Firebase location and a model on $scope. To be used from a controller
      // to automatically synchronize *all* local changes. It takes three
      // arguments:
      //
      //    * `$scope`   : The scope with which the bound model is associated.
      //    * `name`     : The name of the model.
      //    * `defaultFn`: A function that provides a default value if the
      //                   remote value is not set. Optional.
      //
      // This function also returns a promise, which, when resolved, will be
      // provided an `unbind` method, a function which you can call to stop
      // watching the local model for changes.
      object.$bind = function(scope, name, defaultFn) {
        return self._bind(scope, name, defaultFn);
      };

      // Add an object to the remote data. Adding an object is the
      // equivalent of calling `push()` on a Firebase reference. It takes
      // one argument:
      //
      //    * `item`: The object or primitive to add.
      //
      // This function returns a promise that will be resolved when the data
      // has been successfully written to the server. If the promise is
      // resolved, it will be provided with a reference to the newly added
      // object or primitive. The key name can be extracted using `ref.name()`.
      // If the promise fails, it will resolve to an error.
      object.$add = function(item) {
        var ref;
        var deferred = self._q.defer();

        function _addCb(err) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve(ref);
          }
        }

        if (typeof item == "object") {
          ref = self._fRef.ref().push(self._parseObject(item), _addCb);
        } else {
          ref = self._fRef.ref().push(item, _addCb);
        }

        return deferred.promise;
      };

      // Save the current state of the object (or a child) to the remote.
      // Takes a single optional argument:
      //
      //    * `key`: Specify a child key to save the data for. If no key is
      //             specified, the entire object's current state will
      //             be saved.
      //
      // This function returns a promise that will be resolved when the
      // data has been successfully saved to the server.
      object.$save = function(key) {
        var deferred = self._q.defer();

        function _saveCb(err) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve();
          }
        }

        if (key) {
          var obj = self._parseObject(self._object[key]);
          self._fRef.ref().child(key).set(obj, _saveCb);
        } else {
          self._fRef.ref().set(self._parseObject(self._object), _saveCb);
        }

        return deferred.promise;
      };

      // Set the current state of the object to the specified value. Calling
      // this is the equivalent of calling `set()` on a Firebase reference.
      // Takes a single mandatory argument:
      //
      //    * `newValue`: The value which should overwrite data stored at
      //                  this location.
      //
      // This function returns a promise that will be resolved when the
      // data has been successfully saved to the server.
      object.$set = function(newValue) {
        var deferred = self._q.defer();
        self._fRef.ref().set(self._parseObject(newValue), function(err) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve();
          }
        });
        return deferred.promise;
      };

      // Non-destructively update only a subset of keys for the current object.
      // This is the equivalent of calling `update()` on a Firebase reference.
      // Takes a single mandatory argument:
      //
      //    * `newValue`: The set of keys and values that must be updated for
      //                  this location.
      //
      // This function returns a promise that will be resolved when the data
      // has been successfully saved to the server.
      object.$update = function(newValue) {
        var deferred = self._q.defer();
        self._fRef.ref().update(self._parseObject(newValue), function(err) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve();
          }
        });
        return deferred.promise;
      };

      // Update a value within a transaction. Calling this is the
      // equivalent of calling `transaction()` on a Firebase reference.
      //
      //  * `updateFn`:     A developer-supplied function which will be passed
      //                    the current data stored at this location (as a
      //                    Javascript object). The function should return the
      //                    new value it would like written (as a Javascript
      //                    object). If "undefined" is returned (i.e. you
      //                    "return;" with no arguments) the transaction will
      //                    be aborted and the data at this location will not
      //                    be modified.
      //  * `applyLocally`: By default, events are raised each time the
      //                    transaction update function runs. So if it is run
      //                    multiple times, you may see intermediate states.
      //                    You can set this to false to suppress these
      //                    intermediate states and instead wait until the
      //                    transaction has completed before events are raised.
      //
      //  This function returns a promise that will be resolved when the
      //  transaction function has completed. A successful transaction is
      //  resolved with the snapshot. If the transaction is aborted,
      //  the promise will be resolved with null.
      object.$transaction = function(updateFn, applyLocally) {
        var deferred = self._q.defer();
        self._fRef.ref().transaction(updateFn,
          function(err, committed, snapshot) {
            if (err) {
              deferred.reject(err);
            } else if (!committed) {
              deferred.resolve(null);
            } else {
              deferred.resolve(snapshot);
            }
          },
        applyLocally);

        return deferred.promise;
      };

      // Remove this object from the remote data. Calling this is the
      // equivalent of calling `remove()` on a Firebase reference. This
      // function takes a single optional argument:
      //
      //    * `key`: Specify a child key to remove. If no key is specified, the
      //             entire object will be removed from the remote data store.
      //
      // This function returns a promise that will be resolved when the
      // object has been successfully removed from the server.
      object.$remove = function(key) {
        var deferred = self._q.defer();

        function _removeCb(err) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve();
          }
        }

        if (key) {
          self._fRef.ref().child(key).remove(_removeCb);
        } else {
          self._fRef.ref().remove(_removeCb);
        }

        return deferred.promise;
      };

      // Get an AngularFire wrapper for a named child. This function takes
      // one mandatory argument:
      //
      //    * `key`: The key name that will point to the child reference to be
      //             returned.
      object.$child = function(key) {
        var af = new AngularFire(
          self._q, self._parse, self._timeout, self._fRef.ref().child(key)
        );
        return af.construct();
      };

      // Attach an event handler for when the object is changed. You can attach
      // handlers for all Firebase events like "child_added", "value", and
      // "child_removed". Additionally, the following events, specific to
      // AngularFire, can be listened to.
      //
      //  - "change": The provided function will be called whenever the local
      //              object is modified because the remote data was updated.
      //  - "loaded": This function will be called *once*, when the initial
      //              data has been loaded. 'object' will be an empty
      //              object ({}) until this function is called.
      object.$on = function(type, callback) {
        if( self._on.hasOwnProperty(type) ) {
          self._sendInitEvent(type, callback);
          // One exception if made for the 'loaded' event. If we already loaded
          // data (perhaps because it was synced), simply fire the callback.
          if (type !== "loaded" || !this._loaded) {
            self._on[type].push(callback);
          }
        } else {
          throw new Error("Invalid event type " + type + " specified");
        }
        return object;
      };

      // Detach an event handler from a specified event type. If no callback
      // is specified, all event handlers for the specified event type will
      // be detached.
      //
      // If no type if provided, synchronization for this instance of $firebase
      // will be turned off complete.
      object.$off = function(type, callback) {
        if (self._on.hasOwnProperty(type)) {
          if (callback) {
            var index = self._on[type].indexOf(callback);
            if (index !== -1) {
              self._on[type].splice(index, 1);
            }
          } else {
            self._on[type] = [];
          }
        } else {
          self._fRef.off();
        }
      };

      // Authenticate this Firebase reference with a custom auth token.
      // Refer to the Firebase documentation on "Custom Login" for details.
      // Returns a promise that will be resolved when authentication is
      // successfully completed.
      object.$auth = function(token) {
        var deferred = self._q.defer();
        self._fRef.auth(token, function(err, obj) {
          if (err !== null) {
            deferred.reject(err);
          } else {
            deferred.resolve(obj);
          }
        }, function(rej) {
          deferred.reject(rej);
        });
        return deferred.promise;
      };

      // Return the current index, which is a list of key names in an array,
      // ordered by their Firebase priority.
      object.$getIndex = function() {
        return angular.copy(self._index);
      };

      // Return the reference used by this object.
      object.$getRef = function() {
        return self._fRef.ref();
      };

      self._object = object;
      self._getInitialValue();

      return self._object;
    },

    // This function is responsible for fetching the initial data for the
    // given reference and attaching appropriate child event handlers.
    _getInitialValue: function() {
      var self = this;

      // store changes to children and update the index of keys appropriately
      function _processSnapshot(snapshot, prevChild) {
        var key = snapshot.name();
        var val = snapshot.val();

        // If the item already exists in the index, remove it first.
        var curIdx = self._index.indexOf(key);
        if (curIdx !== -1) {
          self._index.splice(curIdx, 1);
        }

        // Update index. This is used by $getIndex and orderByPriority.
        if (prevChild) {
          var prevIdx = self._index.indexOf(prevChild);
          self._index.splice(prevIdx + 1, 0, key);
        } else {
          self._index.unshift(key);
        }

        // Store the priority of the current property as "$priority". Changing
        // the value of this property will also update the priority of the
        // object (see _parseObject).
        if (!_isPrimitive(val) && snapshot.getPriority() !== null) {
          val.$priority = snapshot.getPriority();
        }
        self._updateModel(key, val);
      }

      // Helper function to attach and broadcast events.
      function _handleAndBroadcastEvent(type, handler) {
        return function(snapshot, prevChild) {
          handler(snapshot, prevChild);
          self._broadcastEvent(type, self._makeEventSnapshot(snapshot.name(), snapshot.val(), prevChild));
        };
      }

      function _handleFirebaseEvent(type, handler) {
        self._fRef.on(type, _handleAndBroadcastEvent(type, handler));
      }
      _handleFirebaseEvent("child_added", _processSnapshot);
      _handleFirebaseEvent("child_moved", _processSnapshot);
      _handleFirebaseEvent("child_changed", _processSnapshot);
      _handleFirebaseEvent("child_removed", function(snapshot) {
        // Remove from index.
        var key = snapshot.name();
        var idx = self._index.indexOf(key);
        self._index.splice(idx, 1);

        // Remove from local model.
        self._updateModel(key, null);
      });

      function _isPrimitive(v) {
        return v === null || typeof(v) !== 'object';
      }

      function _initialLoad(value) {
        // Call handlers for the "loaded" event.
        self._loaded = true;
        self._broadcastEvent("loaded", value);
      }

      function handleNullValues(value) {
        // NULLs are handled specially. If there's a 3-way data binding
        // on a local primitive, then update that, otherwise switch to object
        // binding using child events.
        if (self._bound && value === null) {
          var local = self._parseObject(self._parse(self._name)(self._scope));
          switch (typeof local) {
          // Primitive defaults.
          case "string":
          case "undefined":
            value = "";
            break;
          case "number":
            value = 0;
            break;
          case "boolean":
            value = false;
            break;
          }
        }

        return value;
      }

      // We handle primitives and objects here together. There is no harm in having
      // child_* listeners attached; if the data suddenly changes between an object
      // and a primitive, the child_added/removed events will fire, and our data here
      // will get updated accordingly so we should be able to transition without issue
      self._fRef.on('value', function(snap) {
        // primitive handling
        var value = snap.val();
        if( _isPrimitive(value) ) {
          value = handleNullValues(value);
          self._updatePrimitive(value);
        }
        else {
          delete self._object.$value;
        }

        // broadcast the value event
        self._broadcastEvent('value', self._makeEventSnapshot(snap.name(), value));

        // broadcast initial loaded event once data and indices are set up appropriately
        if( !self._loaded ) {
          _initialLoad(value);
        }
      });
    },

    // Called whenever there is a remote change. Applies them to the local
    // model for both explicit and implicit sync modes.
    _updateModel: function(key, value) {
      if (value == null) {
        delete this._object[key];
      } else {
        this._object[key] = value;
      }

      // Call change handlers.
      this._broadcastEvent("change", key);

      // update Angular by forcing a compile event
      this._triggerModelUpdate();
    },

    // this method triggers a self._timeout event, which forces Angular to run $apply()
    // and compile the DOM content
    _triggerModelUpdate: function() {
      // since the timeout runs asynchronously, multiple updates could invoke this method
      // before it is actually executed (this occurs when Firebase sends it's initial deluge of data
      // back to our _getInitialValue() method, or when there are locally cached changes)
      // We don't want to trigger it multiple times if we can help, creating multiple dirty checks
      // and $apply operations, which are costly, so if one is already queued, we just wait for
      // it to do its work.
      if( !this._runningTimer ) {
        var self = this;
        this._runningTimer = self._timeout(function() {
          self._runningTimer = null;

          // If there is an implicit binding, also update the local model.
          if (!self._bound) {
            return;
          }

          var current = self._object;
          var local = self._parse(self._name)(self._scope);
          // If remote value matches local value, don't do anything, otherwise
          // apply the change.
          if (!angular.equals(current, local)) {
            self._parse(self._name).assign(self._scope, angular.copy(current));
          }
        });
      }
    },

    // Called whenever there is a remote change for a primitive value.
    _updatePrimitive: function(value) {
      var self = this;
      self._timeout(function() {
        // Primitive values are represented as a special object
        // {$value: value}. Only update if the remote value is different from
        // the local value.
        if (!self._object.$value ||
            !angular.equals(self._object.$value, value)) {
          self._object.$value = value;
        }

        // Call change handlers.
        self._broadcastEvent("change");

        // If there's an implicit binding, simply update the local scope model.
        if (self._bound) {
          var local = self._parseObject(self._parse(self._name)(self._scope));
          if (!angular.equals(local, value)) {
            self._parse(self._name).assign(self._scope, value);
          }
        }
      });
    },

    // If event handlers for a specified event were attached, call them.
    _broadcastEvent: function(evt, param) {
      var cbs = this._on[evt] || [];
      if( evt === 'loaded' ) {
        this._on[evt] = []; // release memory
      }
      var self = this;

      function _wrapTimeout(cb, param) {
        self._timeout(function() {
          cb(param);
        });
      }

      if (cbs.length > 0) {
        for (var i = 0; i < cbs.length; i++) {
          if (typeof cbs[i] == "function") {
            _wrapTimeout(cbs[i], param);
          }
        }
      }
    },

    // triggers an initial event for loaded, value, and child_added events (which get immediate feedback)
    _sendInitEvent: function(evt, callback) {
      var self = this;
      if( self._loaded && ['child_added', 'loaded', 'value'].indexOf(evt) > -1 ) {
        self._timeout(function() {
          var parsedValue = angular.isObject(self._object)? self._parseObject(self._object) : self._object;
          switch(evt) {
          case 'loaded':
            callback(parsedValue);
            break;
          case 'value':
            callback(self._makeEventSnapshot(self._fRef.name(), parsedValue, null));
            break;
          case 'child_added':
            self._iterateChildren(parsedValue, function(name, val, prev) {
              callback(self._makeEventSnapshot(name, val, prev));
            });
            break;
          default: // not reachable
          }
        });
      }
    },

    // assuming data is an object, this method will iterate all
    // child keys and invoke callback with (key, value, prevChild)
    _iterateChildren: function(data, callback) {
      if( this._loaded && angular.isObject(data) ) {
        var prev = null;
        for(var key in data) {
          if( data.hasOwnProperty(key) ) {
            callback(key, data[key], prev);
            prev = key;
          }
        }
      }
    },

    // creates a snapshot object compatible with _broadcastEvent notifications
    _makeEventSnapshot: function(key, value, prevChild) {
      if( angular.isUndefined(prevChild) ) {
        prevChild = null;
      }
      return {
        snapshot: {
          name: key,
          value: value
        },
        prevChild: prevChild
      };
    },

    // This function creates a 3-way binding between the provided scope model
    // and Firebase. All changes made to the local model are saved to Firebase
    // and changes to the remote data automatically appear on the local model.
    _bind: function(scope, name, defaultFn) {
      var self = this;
      var deferred = self._q.defer();

      // _updateModel or _updatePrimitive will take care of updating the local
      // model if _bound is set to true.
      self._name = name;
      self._bound = true;
      self._scope = scope;

      // If the local model is an object, call an update to set local values.
      var local = self._parse(name)(scope);
      if (local !== undefined && typeof local == "object") {
        self._fRef.ref().update(self._parseObject(local));
      }

      // We're responsible for setting up scope.$watch to reflect local changes
      // on the Firebase data.
      var unbind = scope.$watch(name, function() {
        // If the new local value matches the current remote value, we don't
        // trigger a remote update.
        var local = self._parseObject(self._parse(name)(scope));
        if (self._object.$value !== undefined &&
            angular.equals(local, self._object.$value)) {
          return;
        } else if (angular.equals(local, self._parseObject(self._object))) {
          return;
        }

        // If the local model is undefined or the remote data hasn't been
        // loaded yet, don't update.
        if (local === undefined || !self._loaded) {
          return;
        }

        // Use update if limits are in effect, set if not.
        if (self._fRef.set) {
          self._fRef.set(local);
        } else {
          self._fRef.ref().update(local);
        }
      }, true);

      // When the scope is destroyed, unbind automatically.
      scope.$on("$destroy", function() {
        unbind();
      });

      // Once we receive the initial value, the promise will be resolved.
      self._fRef.once("value", function(snap) {
        self._timeout(function() {
          // HACK / FIXME: Objects require a second event loop run, since we
          // switch from value events to child_added. See #209 on Github.
          if (typeof snap.val() != "object") {
            // If the remote value is not set and defaultFn was provided,
            // initialize the local value with the result of defaultFn().
            if (snap.val() == null && typeof defaultFn === 'function') {
              scope[name] = defaultFn();
            }
            deferred.resolve(unbind);
          } else {
            self._timeout(function() {
              // If the remote value is not set and defaultFn was provided,
              // initialize the local value with the result of defaultFn().
              if (snap.val() == null && typeof defaultFn === 'function') {
                scope[name] = defaultFn();
              }
              deferred.resolve(unbind);
            });
          }
        });
      });

      return deferred.promise;
    },

    // Parse a local model, removing all properties beginning with "$" and
    // converting $priority to ".priority".
    _parseObject: function(obj) {
      function _findReplacePriority(item) {
        for (var prop in item) {
          if (item.hasOwnProperty(prop)) {
            if (prop == "$priority") {
              item[".priority"] = item.$priority;
              delete item.$priority;
            } else if (typeof item[prop] == "object") {
              _findReplacePriority(item[prop]);
            }
          }
        }
        return item;
      }

      // We use toJson/fromJson to remove $$hashKey and others. Can be replaced
      // by angular.copy, but only for later versions of AngularJS.
      var newObj = _findReplacePriority(angular.copy(obj));
      return angular.fromJson(angular.toJson(newObj));
    }
  };


  // Defines the `$firebaseSimpleLogin` service that provides simple
  // user authentication support for AngularFire.
  angular.module("firebase").factory("$firebaseSimpleLogin", [
    "$q", "$timeout", "$rootScope", function($q, $t, $rs) {
      // The factory returns an object containing the authentication state
      // of the current user. This service takes one argument:
      //
      //   * `ref`     : A Firebase reference.
      //
      // The returned object has the following properties:
      //
      //  * `user`: Set to "null" if the user is currently logged out. This
      //    value will be changed to an object when the user successfully logs
      //    in. This object will contain details of the logged in user. The
      //    exact properties will vary based on the method used to login, but
      //    will at a minimum contain the `id` and `provider` properties.
      //
      // The returned object will also have the following methods available:
      // $login(), $logout(), $createUser(), $changePassword(), $removeUser(),
      // and $getCurrentUser().
      return function(ref) {
        var auth = new AngularFireAuth($q, $t, $rs, ref);
        return auth.construct();
      };
    }
  ]);

  AngularFireAuth = function($q, $t, $rs, ref) {
    this._q = $q;
    this._timeout = $t;
    this._rootScope = $rs;
    this._loginDeferred = null;
    this._getCurrentUserDeferred = [];
    this._currentUserData = undefined;

    if (typeof ref == "string") {
      throw new Error("Please provide a Firebase reference instead " +
        "of a URL, eg: new Firebase(url)");
    }
    this._fRef = ref;
  };

  AngularFireAuth.prototype = {
    construct: function() {
      var object = {
        user: null,
        $login: this.login.bind(this),
        $logout: this.logout.bind(this),
        $createUser: this.createUser.bind(this),
        $changePassword: this.changePassword.bind(this),
        $removeUser: this.removeUser.bind(this),
        $getCurrentUser: this.getCurrentUser.bind(this),
        $sendPasswordResetEmail: this.sendPasswordResetEmail.bind(this)
      };
      this._object = object;

      // Initialize Simple Login.
      if (!window.FirebaseSimpleLogin) {
        var err = new Error("FirebaseSimpleLogin is undefined. " +
          "Did you forget to include firebase-simple-login.js?");
        this._rootScope.$broadcast("$firebaseSimpleLogin:error", err);
        throw err;
      }

      var client = new FirebaseSimpleLogin(this._fRef,
                                           this._onLoginEvent.bind(this));
      this._authClient = client;
      return this._object;
    },

    // The login method takes a provider (for Simple Login) and authenticates
    // the Firebase reference with which the service was initialized. This
    // method returns a promise, which will be resolved when the login succeeds
    // (and rejected when an error occurs).
    login: function(provider, options) {
      var deferred = this._q.defer();
      var self = this;

      // To avoid the promise from being fulfilled by our initial login state,
      // make sure we have it before triggering the login and creating a new
      // promise.
      this.getCurrentUser().then(function() {
        self._loginDeferred = deferred;
        self._authClient.login(provider, options);
      });

      return deferred.promise;
    },

    // Unauthenticate the Firebase reference.
    logout: function() {
      // Tell the simple login client to log us out.
      this._authClient.logout();

      // Forget who we were, so that any getCurrentUser calls will wait for
      // another user event.
      delete this._currentUserData;
    },

    // Creates a user for Firebase Simple Login. Function 'cb' receives an
    // error as the first argument and a Simple Login user object as the second
    // argument. Note that this function only creates the user, if you wish to
    // log in as the newly created user, call $login() after the promise for
    // this method has been fulfilled.
    createUser: function(email, password) {
      var self = this;
      var deferred = this._q.defer();

      self._authClient.createUser(email, password, function(err, user) {
        if (err) {
          self._rootScope.$broadcast("$firebaseSimpleLogin:error", err);
          deferred.reject(err);
        } else {
          deferred.resolve(user);
        }
      });

      return deferred.promise;
    },

    // Changes the password for a Firebase Simple Login user. Take an email,
    // old password and new password as three mandatory arguments. Returns a
    // promise.
    changePassword: function(email, oldPassword, newPassword) {
      var self = this;
      var deferred = this._q.defer();

      self._authClient.changePassword(email, oldPassword, newPassword,
        function(err) {
          if (err) {
            self._rootScope.$broadcast("$firebaseSimpleLogin:error", err);
            deferred.reject(err);
          } else {
            deferred.resolve();
          }
        }
      );

      return deferred.promise;
    },

    // Gets a promise for the current user info.
    getCurrentUser: function() {
      var self = this;
      var deferred = this._q.defer();

      if (self._currentUserData !== undefined) {
        deferred.resolve(self._currentUserData);
      } else {
        self._getCurrentUserDeferred.push(deferred);
      }

      return deferred.promise;
    },

    // Remove a user for the listed email address. Returns a promise.
    removeUser: function(email, password) {
      var self = this;
      var deferred = this._q.defer();

      self._authClient.removeUser(email, password, function(err) {
        if (err) {
          self._rootScope.$broadcast("$firebaseSimpleLogin:error", err);
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      });

      return deferred.promise;
    },

    // Send a password reset email to the user for an email + password account.
    sendPasswordResetEmail: function(email) {
      var self = this;
      var deferred = this._q.defer();

      self._authClient.sendPasswordResetEmail(email, function(err) {
        if (err) {
          self._rootScope.$broadcast("$firebaseSimpleLogin:error", err);
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      });

      return deferred.promise;
    },

    // Internal callback for any Simple Login event.
    _onLoginEvent: function(err, user) {
      // HACK -- calls to logout() trigger events even if we're not logged in,
      // making us get extra events. Throw them away. This should be fixed by
      // changing Simple Login so that its callbacks refer directly to the
      // action that caused them.
      if (this._currentUserData === user && err === null) {
        return;
      }

      var self = this;
      if (err) {
        if (self._loginDeferred) {
          self._loginDeferred.reject(err);
          self._loginDeferred = null;
        }
        self._rootScope.$broadcast("$firebaseSimpleLogin:error", err);
      } else {
        this._currentUserData = user;

        self._timeout(function() {
          self._object.user = user;
          if (user) {
            self._rootScope.$broadcast("$firebaseSimpleLogin:login", user);
          } else {
            self._rootScope.$broadcast("$firebaseSimpleLogin:logout");
          }
          if (self._loginDeferred) {
            self._loginDeferred.resolve(user);
            self._loginDeferred = null;
          }
          while (self._getCurrentUserDeferred.length > 0) {
            var def = self._getCurrentUserDeferred.pop();
            def.resolve(user);
          }
        });
      }
    }
  };
})();
/*!
 * angular-loading-bar v0.5.0
 * https://chieffancypants.github.io/angular-loading-bar
 * Copyright (c) 2014 Wes Cruver
 * License: MIT
 */
/*
 * angular-loading-bar
 *
 * intercepts XHR requests and creates a loading bar.
 * Based on the excellent nprogress work by rstacruz (more info in readme)
 *
 * (c) 2013 Wes Cruver
 * License: MIT
 */


(function() {

'use strict';

// Alias the loading bar for various backwards compatibilities since the project has matured:
angular.module('angular-loading-bar', ['cfp.loadingBarInterceptor']);
angular.module('chieffancypants.loadingBar', ['cfp.loadingBarInterceptor']);


/**
 * loadingBarInterceptor service
 *
 * Registers itself as an Angular interceptor and listens for XHR requests.
 */
angular.module('cfp.loadingBarInterceptor', ['cfp.loadingBar'])
  .config(['$httpProvider', function ($httpProvider) {

    var interceptor = ['$q', '$cacheFactory', '$timeout', '$rootScope', 'cfpLoadingBar', function ($q, $cacheFactory, $timeout, $rootScope, cfpLoadingBar) {

      /**
       * The total number of requests made
       */
      var reqsTotal = 0;

      /**
       * The number of requests completed (either successfully or not)
       */
      var reqsCompleted = 0;

      /**
       * The amount of time spent fetching before showing the loading bar
       */
      var latencyThreshold = cfpLoadingBar.latencyThreshold;

      /**
       * $timeout handle for latencyThreshold
       */
      var startTimeout;


      /**
       * calls cfpLoadingBar.complete() which removes the
       * loading bar from the DOM.
       */
      function setComplete() {
        $timeout.cancel(startTimeout);
        cfpLoadingBar.complete();
        reqsCompleted = 0;
        reqsTotal = 0;
      }

      /**
       * Determine if the response has already been cached
       * @param  {Object}  config the config option from the request
       * @return {Boolean} retrns true if cached, otherwise false
       */
      function isCached(config) {
        var cache;
        var defaults = $httpProvider.defaults;

        if (config.method !== 'GET' || config.cache === false) {
          config.cached = false;
          return false;
        }

        if (config.cache === true && defaults.cache === undefined) {
          cache = $cacheFactory.get('$http');
        } else if (defaults.cache !== undefined) {
          cache = defaults.cache;
        } else {
          cache = config.cache;
        }

        var cached = cache !== undefined ?
          cache.get(config.url) !== undefined : false;

        if (config.cached !== undefined && cached !== config.cached) {
          return config.cached;
        }
        config.cached = cached;
        return cached;
      }


      return {
        'request': function(config) {
          // Check to make sure this request hasn't already been cached and that
          // the requester didn't explicitly ask us to ignore this request:
          if (!config.ignoreLoadingBar && !isCached(config)) {
            $rootScope.$broadcast('cfpLoadingBar:loading', {url: config.url});
            if (reqsTotal === 0) {
              startTimeout = $timeout(function() {
                cfpLoadingBar.start();
              }, latencyThreshold);
            }
            reqsTotal++;
            cfpLoadingBar.set(reqsCompleted / reqsTotal);
          }
          return config;
        },

        'response': function(response) {
          if (!response.config.ignoreLoadingBar && !isCached(response.config)) {
            reqsCompleted++;
            $rootScope.$broadcast('cfpLoadingBar:loaded', {url: response.config.url});
            if (reqsCompleted >= reqsTotal) {
              setComplete();
            } else {
              cfpLoadingBar.set(reqsCompleted / reqsTotal);
            }
          }
          return response;
        },

        'responseError': function(rejection) {
          if (!rejection.config.ignoreLoadingBar && !isCached(rejection.config)) {
            reqsCompleted++;
            $rootScope.$broadcast('cfpLoadingBar:loaded', {url: rejection.config.url});
            if (reqsCompleted >= reqsTotal) {
              setComplete();
            } else {
              cfpLoadingBar.set(reqsCompleted / reqsTotal);
            }
          }
          return $q.reject(rejection);
        }
      };
    }];

    $httpProvider.interceptors.push(interceptor);
  }]);


/**
 * Loading Bar
 *
 * This service handles adding and removing the actual element in the DOM.
 * Generally, best practices for DOM manipulation is to take place in a
 * directive, but because the element itself is injected in the DOM only upon
 * XHR requests, and it's likely needed on every view, the best option is to
 * use a service.
 */
angular.module('cfp.loadingBar', [])
  .provider('cfpLoadingBar', function() {

    this.includeSpinner = true;
    this.includeBar = true;
    this.latencyThreshold = 100;
    this.startSize = 0.02;
    this.parentSelector = 'body';
    this.spinnerTemplate = '<div id="loading-bar-spinner"><div class="spinner-icon"></div></div>';

    this.$get = ['$document', '$timeout', '$animate', '$rootScope', function ($document, $timeout, $animate, $rootScope) {

      var $parentSelector = this.parentSelector,
        loadingBarContainer = angular.element('<div id="loading-bar"><div class="bar"><div class="peg"></div></div></div>'),
        loadingBar = loadingBarContainer.find('div').eq(0),
        spinner = angular.element(this.spinnerTemplate);

      var incTimeout,
        completeTimeout,
        started = false,
        status = 0;

      var includeSpinner = this.includeSpinner;
      var includeBar = this.includeBar;
      var startSize = this.startSize;

      /**
       * Inserts the loading bar element into the dom, and sets it to 2%
       */
      function _start() {
        var $parent = $document.find($parentSelector);
        $timeout.cancel(completeTimeout);

        // do not continually broadcast the started event:
        if (started) {
          return;
        }

        $rootScope.$broadcast('cfpLoadingBar:started');
        started = true;

        if (includeBar) {
          $animate.enter(loadingBarContainer, $parent);
        }

        if (includeSpinner) {
          $animate.enter(spinner, $parent);
        }

        _set(startSize);
      }

      /**
       * Set the loading bar's width to a certain percent.
       *
       * @param n any value between 0 and 1
       */
      function _set(n) {
        if (!started) {
          return;
        }
        var pct = (n * 100) + '%';
        loadingBar.css('width', pct);
        status = n;

        // increment loadingbar to give the illusion that there is always
        // progress but make sure to cancel the previous timeouts so we don't
        // have multiple incs running at the same time.
        $timeout.cancel(incTimeout);
        incTimeout = $timeout(function() {
          _inc();
        }, 250);
      }

      /**
       * Increments the loading bar by a random amount
       * but slows down as it progresses
       */
      function _inc() {
        if (_status() >= 1) {
          return;
        }

        var rnd = 0;

        // TODO: do this mathmatically instead of through conditions

        var stat = _status();
        if (stat >= 0 && stat < 0.25) {
          // Start out between 3 - 6% increments
          rnd = (Math.random() * (5 - 3 + 1) + 3) / 100;
        } else if (stat >= 0.25 && stat < 0.65) {
          // increment between 0 - 3%
          rnd = (Math.random() * 3) / 100;
        } else if (stat >= 0.65 && stat < 0.9) {
          // increment between 0 - 2%
          rnd = (Math.random() * 2) / 100;
        } else if (stat >= 0.9 && stat < 0.99) {
          // finally, increment it .5 %
          rnd = 0.005;
        } else {
          // after 99%, don't increment:
          rnd = 0;
        }

        var pct = _status() + rnd;
        _set(pct);
      }

      function _status() {
        return status;
      }

      function _complete() {
        $rootScope.$broadcast('cfpLoadingBar:completed');
        _set(1);

        $timeout.cancel(completeTimeout);

        // Attempt to aggregate any start/complete calls within 500ms:
        completeTimeout = $timeout(function() {
          $animate.leave(loadingBarContainer, function() {
            status = 0;
            started = false;
          });
          $animate.leave(spinner);
        }, 500);
      }

      return {
        start            : _start,
        set              : _set,
        status           : _status,
        inc              : _inc,
        complete         : _complete,
        includeSpinner   : this.includeSpinner,
        latencyThreshold : this.latencyThreshold,
        parentSelector   : this.parentSelector,
        startSize        : this.startSize
      };


    }];     //
  });       // wtf javascript. srsly
})();       //
