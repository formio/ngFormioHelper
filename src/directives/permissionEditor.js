angular.module('ngFormBuilderHelper')
.directive('permissionEditor', [
  '$q',
  'SubmissionAccessLabels',
  function(
    $q,
    SubmissionAccessLabels
  ) {
    var PERMISSION_TYPES = [
      'create_all',
      'read_all',
      'update_all',
      'delete_all',
      'create_own',
      'read_own',
      'update_own',
      'delete_own'
    ];

    return {
      scope: {
        roles: '=',
        permissions: '=',
        waitFor: '='
      },
      restrict: 'E',
      templateUrl: 'formio-helper/formbuilder/permission/editor.html',
      link: function($scope) {
        // Fill in missing permissions / enforce order
        ($scope.waitFor || $q.when()).then(function(){
          var tempPerms = [];
          _.each(PERMISSION_TYPES, function(type) {
            var existingPerm = _.find($scope.permissions, {type: type});
            tempPerms.push(existingPerm || {
                type: type,
                roles: []
              });
          });
          // Replace permissions with complete set of permissions
          $scope.permissions.splice.apply($scope.permissions, [0, $scope.permissions.length].concat(tempPerms));
        });

        $scope.getPermissionsToShow = function() {
          return $scope.permissions.filter($scope.shouldShowPermission);
        };

        $scope.shouldShowPermission = function(permission) {
          return !!SubmissionAccessLabels[permission.type];
        };

        $scope.getPermissionLabel = function(permission) {
          return SubmissionAccessLabels[permission.type].label;
        };

        $scope.getPermissionTooltip = function(permission) {
          return SubmissionAccessLabels[permission.type].tooltip;
        };
      }
    };
  }
]);