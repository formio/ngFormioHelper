angular.module('ngFormioHelper')
.directive('formioForms', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      src: '=',
      base: '=',
      tag: '=?'
    },
    templateUrl: 'formio-helper/form/list.html',
    controller: ['$scope', 'Formio', function ($scope, Formio) {
      $scope.forms = [];
      var params = {
        type: 'form',
        limit: 9999999
      };
      var loadForms = function () {
        if (!$scope.src) {
          return;
        }
        if ($scope.tag) {
          params.tags = $scope.tag;
        }
        (new Formio($scope.src)).loadForms({params: params}).then(function (forms) {
          $scope.forms = forms;
        });
      };

      $scope.$watch('src', loadForms);
    }]
  };
});