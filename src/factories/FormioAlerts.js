angular.module('ngFormioHelper')
.factory('FormioAlerts', [
  '$rootScope',
  function ($rootScope) {
    var alerts = [];
    if (!$rootScope.alerts) {
      $rootScope.alerts = [];
    }
    return {
      addAlert: function (alert) {
        // Do not add duplicate alerts.
        if (_.find($rootScope.alerts, {message: alert.message})) {
          return;
        }

        $rootScope.alerts.push(alert);
        if (alert.element) {
          angular.element('#form-group-' + alert.element).addClass('has-error');
        }
        else {
          alerts.push(alert);
        }
      },
      getAlerts: function () {
        var tempAlerts = angular.copy(alerts);
        alerts.length = 0;
        alerts = [];
        $rootScope.alerts = [];
        return tempAlerts;
      },
      onError: function showError(error) {
        if (error.message) {
          this.addAlert({
            type: 'danger',
            message: error.message,
            element: error.path
          });
        }
        else {
          var errors = error.hasOwnProperty('errors') ? error.errors : error.data.errors;
          angular.forEach(errors, showError.bind(this));
        }
      }
    };
  }
]);
