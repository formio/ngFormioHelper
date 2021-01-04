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
        let currentError;
        if (typeof error === 'string') {
          try {
            currentError = JSON.parse(error);
          } catch (err) {
            currentError = error;
          }
        }

        if (currentError.message) {
          this.addAlert({
            type: 'danger',
            message: currentError.message,
            element: currentError.path
          });
        }
        else {
          var errors = currentError.hasOwnProperty('errors') ? currentError.errors : currentError.data.errors;
          angular.forEach(errors, showError.bind(this));
        }
      }
    };
  }
]);
