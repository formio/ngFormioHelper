angular.module('ngFormioHelper')
.directive('offlineButton', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: false,
    controller: [
      '$scope', '$rootScope', function($scope, $rootScope) {
        $scope.offline = $rootScope.offline;
        $scope.hasOfflineMode = $rootScope.hasOfflineMode;
      }
    ],
    templateUrl: 'formio-helper/offline/button.html'
  };
});