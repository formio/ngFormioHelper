angular.module('ngFormBuilderHelper')
.constant('FormController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioHelperConfig',
  'FormioAlerts',
  function (
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioHelperConfig,
    FormioAlerts
  ) {
    $scope.loading = true;
    $scope.hideComponents = [];
    $scope.submission = {data: {}};
    $scope.formId = $stateParams.formId;
    $scope.formUrl = FormioHelperConfig.appUrl + '/form';
    $scope.appUrl = FormioHelperConfig.appUrl;
    var formTag = FormioHelperConfig.tag || 'common';
    $scope.formUrl += $stateParams.formId ? ('/' + $stateParams.formId) : '';
    $scope.form = {
      components:[],
      type: ($stateParams.formType ? $stateParams.formType : 'form'),
      tags: [formTag]
    };
    $scope.formio = new Formio($scope.formUrl);

    // Load the form if the id is provided.
    if ($stateParams.formId) {
      $scope.formLoadPromise = $scope.formio.loadForm().then(function(form) {
        $scope.form = form;
        return form;
      }, FormioAlerts.onError.bind(FormioAlerts));
    }
    else {
      // Load the roles available.
      if (!$scope.form.submissionAccess) {
        Formio.makeStaticRequest(Formio.getAppUrl() + '/role').then(function(roles) {
          if ($scope.form.submissionAccess) {
            return;
          }
          angular.forEach(roles, function(role) {
            if (!role.admin && !role.default) {
              // Add access to the form being created to allow for authenticated people to create their own.
              $scope.form.submissionAccess = [
                {
                  type: 'create_own',
                  roles: [role._id]
                },
                {
                  type: 'read_own',
                  roles: [role._id]
                },
                {
                  type: 'update_own',
                  roles: [role._id]
                },
                {
                  type: 'delete_own',
                  roles: [role._id]
                }
              ];
            }
          });
        });
      }
    }

    // Match name of form to title if not customized.
    $scope.titleChange = function(oldTitle) {
      if (!$scope.form.name || $scope.form.name === _.camelCase(oldTitle)) {
        $scope.form.name = _.camelCase($scope.form.title);
      }
    };

    // When a submission is made.
    $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      if (submission._id) {
        $state.go($scope.basePath + 'form.submission.view', {subId: submission._id});
      }
    });

    $scope.$on('pagination:error', function() {
      $scope.loading = false;
    });
    $scope.$on('pagination:loadPage', function() {
      $scope.loading = false;
    });

    // Called when the form is updated.
    $scope.$on('formUpdate', function(event, form) {
      $scope.form.components = form.components;
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });

    // Called when the form is deleted.
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Form was deleted.'
      });
      $state.go($scope.basePath + 'formIndex');
    });

    $scope.$on('cancel', function() {
      $state.go($scope.basePath + 'form.view');
    });

    // Save a form.
    $scope.saveForm = function() {
      $scope.formio.saveForm(angular.copy($scope.form)).then(function(form) {
        var method = $stateParams.formId ? 'updated' : 'created';
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Successfully ' + method + ' form!'
        });
        $state.go($scope.basePath + 'form.view', {formId: form._id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);
