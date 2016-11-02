angular.module('ngFormBuilderHelper')
.constant('FormActionController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioAlerts',
  'FormioUtils',
  '$q',
  function (
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioAlerts,
    FormioUtils,
    $q
  ) {
    $scope.actionUrl = '';
    $scope.actionInfo = $stateParams.actionInfo || {settingsForm: {}};
    $scope.action = {data: {settings: {}, condition: {}}};
    $scope.newAction = {name: '', title: 'Select an Action'};
    $scope.availableActions = {};
    $scope.addAction = function() {
      if ($scope.newAction.name) {
        $state.go($scope.basePath + 'form.action.add', {
          actionName: $scope.newAction.name
        });
      }
      else {
        FormioAlerts.onError({
          message: 'You must select an action to add.',
          element: 'action-select'
        });
      }
    };
    $scope.formio.loadActions().then(function(actions) {
      $scope.actions = actions;
    }, FormioAlerts.onError.bind(FormioAlerts));
    $scope.formio.availableActions().then(function(available) {
      if (!available[0].name) {
        available.shift();
      }
      available.unshift($scope.newAction);
      $scope.availableActions = available;
    });

    // Get the action information.
    var getActionInfo = function(name) {
      return $scope.formio.actionInfo(name).then(function(actionInfo) {
        if(actionInfo) {
          $scope.actionInfo = _.merge($scope.actionInfo, actionInfo);
          return $scope.actionInfo;
        }
      });
    };

    var onActionInfo = function(actionInfo) {
      // SQL Action missing sql server warning
      if(actionInfo && actionInfo.name === 'sql') {
        FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
          if(component.key === 'settings[type]' && JSON.parse(component.data.json).length === 0) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any SQL servers configured. You can add a SQL server in the config/default.json configuration.');
          }
        });
      }

      // Email action missing transports (other than the default one).
      if(actionInfo && actionInfo.name === 'email') {
        FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
          if(component.key === 'settings[transport]' && JSON.parse(component.data.json).length <= 1) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any email transports configured. You need to add them in the config/default.json configuration.');
          }
        });
      }

      // Auth action alert for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'auth') {
        $scope.$watch('action.data.settings', function(current, old) {
          if(current.hasOwnProperty('association')) {
            angular.element('#form-group-role').css('display', current.association === 'new' ? '' : 'none');
          }

          // Make the role required for submission if this is a new association.
          if (
            current.hasOwnProperty('association') &&
            old.hasOwnProperty('association') &&
            current.association !== old.association
          ) {
            // Find the role settings component, and require it as needed.
            FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
              if (component.key && component.key === 'role') {
                // Update the validation settings.
                component.validate = component.validate || {};
                component.validate.required = (current.association === 'new' ? true : false);
              }
            });

            // Dont save the old role settings if this is an existing association.
            current.role = (current.role && (current.association === 'new')) || '';
          }
        }, true);
      }

      // Role action alert for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'role') {
        FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The Role Assignment Action requires a Resource Form component with the API key, \'submission\', to modify existing Resource submissions.');
      }
    };

    /**
     * Load an action into the scope.
     * @param defaults
     */
    var loadAction = function(defaults) {
      if ($stateParams.actionId) {
        $scope.actionUrl = $scope.formio.formUrl + '/action/' + $stateParams.actionId;
        var loader = new Formio($scope.actionUrl);
        return loader.loadAction().then(function(action) {
          $scope.action = _.merge($scope.action, {data: action});
          return getActionInfo(action.name);
        });
      }
      else {
        $scope.action = _.merge($scope.action, {data: defaults});
        $scope.action.data.settings = {};
        return $q.when($scope.actionInfo);
      }
    };

    // Get the action information.
    if (!$stateParams.actionInfo && $stateParams.actionName) {
      getActionInfo($stateParams.actionName).then(function(info) {
        loadAction(info.defaults).then(onActionInfo);
      });
    }
    else {
      // Load the action.
      loadAction($scope.actionInfo.defaults).then(onActionInfo);
    }

    // Called when the action has been updated.
    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was updated.'});
      $state.go($scope.basePath + 'form.actionIndex');
    });

    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was deleted.'});
      $state.go($scope.basePath + 'form.actionIndex');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go($scope.basePath + 'form.actionIndex');
    });
  }
]);
