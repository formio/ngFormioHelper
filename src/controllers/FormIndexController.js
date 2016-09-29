angular.module('ngFormBuilderHelper')
  .constant('FormIndexController', [
    '$scope',
    'FormioHelperConfig',
    function (
      $scope,
      FormioHelperConfig
    ) {
      $scope.forms = [];
      $scope.formsUrl = FormioHelperConfig.appUrl + '/form?type=form&tags=' + FormioHelperConfig.tag;
      $scope.formsPerPage = FormioHelperConfig.perPage;
    }
  ]);