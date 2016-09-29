angular.module('ngFormBuilderHelper')
.constant('RoleController', [
  '$scope',
  'FormioHelperConfig',
  '$http',
  function (
    $scope,
    FormioHelperConfig,
    $http
  ) {
    $http.get(FormioHelperConfig.appUrl + '/role').then(function (result) {
      $scope.roles = result.data;
    });
  }
]);