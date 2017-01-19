angular.module('ngFormBuilderHelper')
.constant('FormSubmissionController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioAlerts',
  '$timeout',
  function (
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioAlerts,
    $timeout
  ) {
    $scope.token = Formio.getToken();
    $scope.submissionId = $stateParams.subId;
    $scope.submissionUrl = $scope.formUrl;
    $scope.submissionUrl += $stateParams.subId ? ('/submission/' + $stateParams.subId) : '';
    $scope.submissionData = Formio.submissionData;
    $scope.submission = {};

    // Load the submission.
    if ($scope.submissionId) {
      $scope.formio = new Formio($scope.submissionUrl);
      $scope.loadSubmissionPromise = $scope.formio.loadSubmission().then(function(submission) {
        $scope.submission = submission;
        return submission;
      });
    }

    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      var message = (submission.method === 'put') ? 'updated' : 'created';
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was ' + message + '.'
      });
      $state.go($scope.basePath + 'form.submissionIndex', {formId: $scope.formId});
    });

    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      $state.go($scope.basePath + 'form.submissionIndex');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go($scope.basePath + 'form.submission.view');
    });

    $scope.$on('formError', function(event, error) {
      event.stopPropagation();
      FormioAlerts.onError(error);
    });

    $scope.$on('rowSelect', function (event, submission) {
      $timeout(function() {
        $state.go($scope.basePath + 'form.submission.view', {
          subId: submission._id
        });
      });
    });

    $scope.$on('rowView', function (event, submission) {
      $state.go($scope.basePath + 'form.submission.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionView', function(event, submission) {
      $state.go($scope.basePath + 'form.submission.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go($scope.basePath + 'form.submission.edit', {
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go($scope.basePath + 'form.submission.delete', {
        subId: submission._id
      });
    });
  }
]);
