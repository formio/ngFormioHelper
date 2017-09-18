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
    $http.get(FormioHelperConfig.appUrl + '/role?limit=1000').then(function (result) {
      $scope.roles = result.data;
    });
  }
]);