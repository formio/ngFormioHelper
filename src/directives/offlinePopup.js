angular.module('ngFormioHelper')
.directive('offlinePopup', function () {
  return {
    restrict: 'A',
    scope: false,
    link: function (scope, el) {
      if (typeof jQuery === 'undefined') {
        return;
      }
      jQuery(el).popover();
    }
  };
});