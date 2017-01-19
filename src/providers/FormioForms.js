angular.module('ngFormioHelper')
.provider('FormioForms', [
  '$stateProvider',
  function ($stateProvider) {
    var resources = {};
    return {
      register: function (name, url, options) {
        options = options || {};
        var templates = options.templates ? options.templates : {};
        var controllers = options.controllers ? options.controllers : {};
        var fields = (typeof options.field === 'string') ? [options.field] : options.field;

        // Normalize the fields properties.
        fields = _.map(fields, function(field) {
          if (typeof field === 'string') {
            return {
              name: field,
              stateParam: field + 'Id'
            };
          }
          return field;
        });
        var basePath = options.base ? options.base : '';
        if (!basePath) {
          basePath = name ? name + '.' : '';
        }

        $stateProvider
          .state(basePath + 'formIndex', {
            url: '/forms',
            params: options.params && options.params.index,
            ncyBreadcrumb: {skip: true},
            templateUrl: templates.index ? templates.index : 'formio-helper/form/index.html',
            controller: ['$scope', 'Formio', '$controller', function ($scope, Formio, $controller) {
              $scope.formBase = basePath;
              $scope.formsSrc = url + '/form';
              $scope.formsTag = $scope.formsTag || options.tag;
              if (controllers.index) {
                $controller(controllers.index, {$scope: $scope});
              }
            }]
          })
          .state(basePath + 'form', {
            url: '/form/:formId',
            abstract: true,
            ncyBreadcrumb: _.get(options, 'breadcrumb.form', {skip: true}),
            templateUrl: templates.form ? templates.form : 'formio-helper/form/form.html',
            controller: [
              '$scope',
              '$stateParams',
              'Formio',
              '$controller',
              function ($scope,
                        $stateParams,
                        Formio,
                        $controller) {
                var formUrl = url + '/form/' + $stateParams.formId;
                $scope.formBase = basePath;
                $scope.currentForm = {
                  name: name,
                  url: formUrl,
                  form: {}
                };

                $scope.currentForm.formio = (new Formio(formUrl));
                $scope.currentForm.promise = $scope.currentForm.formio.loadForm().then(function (form) {
                  $scope.currentForm.form = form;
                  return form;
                });

                if (controllers.form) {
                  $controller(controllers.form, {$scope: $scope});
                }
              }
            ]
          })
          .state(basePath + 'form.view', {
            url: '/',
            params: options.params && options.params.view,
            ncyBreadcrumb: {skip: true},
            templateUrl: templates.view ? templates.view : 'formio-helper/form/view.html',
            controller: [
              '$scope',
              '$state',
              'FormioUtils',
              '$controller',
              function ($scope,
                        $state,
                        FormioUtils,
                        $controller) {
                $scope.submission = {data: {}};
                var handle = false;
                if (fields && fields.length) {
                  $scope.hideComponents = _.map(fields, function(field) {
                    return field.name;
                  });
                  $scope.currentForm.promise.then(function () {
                    fields.forEach(function (field) {
                      var parts = field.name.split('.');
                      var fieldName = parts[parts.length - 1];
                      $scope[fieldName].loadSubmissionPromise.then(function (resource) {
                        _.set($scope.submission.data, field.name, resource);
                      });
                    });
                  });
                }
                if (controllers.view) {
                  var ctrl = $controller(controllers.view, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (!handle) {
                  $scope.$on('formSubmission', function () {
                    $state.go(basePath + 'form.submissions');
                  });
                }
              }
            ]
          })
          .state(basePath + 'form.submissions', {
            url: '/submissions',
            ncyBreadcrumb: {skip: true},
            params: options.params && options.params.submissions,
            templateUrl: templates.submissions ? templates.submissions : 'formio-helper/submission/index.html',
            controller: [
              '$scope',
              '$state',
              '$stateParams',
              'FormioUtils',
              '$controller',
              '$timeout',
              function (
                $scope,
                $state,
                $stateParams,
                FormioUtils,
                $controller,
                $timeout
              ) {
                $scope.submissionQuery = {};
                $scope.submissionColumns = [];
                if (fields && fields.length) {
                  fields.forEach(function (field) {
                    $scope.submissionQuery['data.' + field.name + '._id'] = $stateParams[field.stateParam];
                  });
                }

                var gotoEntity = function(event, entity) {
                  $timeout(function() {
                    $state.go(basePath + 'form.submission.view', {
                      formId: entity.form,
                      submissionId: entity._id
                    });
                  });
                };

                // Go to the submission when they click on the row.
                $scope.$on('rowView', gotoEntity);
                $scope.$on('rowSelect', gotoEntity);

                if (controllers.submissions) {
                  $controller(controllers.submissions, {$scope: $scope});
                }

                $scope.currentForm.promise.then(function (form) {
                  localStorage.setItem(form.name, '');
                  if (
                    !$scope.submissionColumns.length &&
                    !Object.keys($scope.submissionColumns).length === 0
                  ) {
                    FormioUtils.eachComponent(form.components, function (component) {
                      if (!component.key || !component.input || !component.tableView) {
                        return;
                      }
                      if (fields && fields.length && !_.find(fields, {name: component.key})) {
                        return;
                      }
                      $scope.submissionColumns.push(component.key);
                    });

                    // Ensure we reload the data grid.
                    $scope.$broadcast('reloadGrid');
                  }
                });
              }
            ]
          })
          .state(basePath + 'form.submission', {
            abstract: true,
            url: '/submission/:submissionId',
            ncyBreadcrumb: _.get(options, 'breadcrumb.submission', {skip: true}),
            params: options.params && options.params.submission,
            templateUrl: templates.submission ? templates.submission : 'formio-helper/submission/submission.html',
            controller: [
              '$scope',
              '$stateParams',
              'Formio',
              '$controller',
              function ($scope,
                        $stateParams,
                        Formio,
                        $controller) {
                $scope.currentSubmission = {
                  url: $scope.currentForm.url + '/submission/' + $stateParams.submissionId,
                  submission: {
                    data: {}
                  }
                };

                // Store the formio object.
                $scope.currentSubmission.formio = (new Formio($scope.currentSubmission.url));

                // Load the current submission.
                $scope.currentSubmission.promise = $scope.currentSubmission.formio.loadSubmission().then(function (submission) {
                  $scope.currentSubmission.submission = submission;
                  return submission;
                });

                // Execute the controller.
                if (controllers.submission) {
                  $controller(controllers.submission, {$scope: $scope});
                }
              }
            ]
          })
          .state(basePath + 'form.submission.view', {
            url: '/',
            params: options.params && options.params.submissionView,
            ncyBreadcrumb: {skip: true},
            templateUrl: templates.submissionView ? templates.submissionView : 'formio-helper/submission/view.html',
            controller: [
              '$scope',
              '$controller',
              function ($scope,
                        $controller) {
                if (controllers.submissionView) {
                  $controller(controllers.submissionView, {$scope: $scope});
                }
              }
            ]
          })
          .state(basePath + 'form.submission.edit', {
            url: '/edit',
            params: options.params && options.params.submissionEdit,
            ncyBreadcrumb: {skip: true},
            templateUrl: templates.submissionEdit ? templates.submissionEdit : 'formio-helper/submission/edit.html',
            controller: [
              '$scope',
              '$state',
              '$controller',
              function ($scope,
                        $state,
                        $controller) {
                var handle = false;
                if (controllers.submissionEdit) {
                  var ctrl = $controller(controllers.submissionEdit, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (!handle) {
                  $scope.$on('formSubmission', function (event, submission) {
                    $scope.currentSubmission.submission = submission;
                    $state.go(basePath + 'form.submission.view');
                  });
                }
              }
            ]
          })
          .state(basePath + 'form.submission.delete', {
            url: '/delete',
            params: options.params && options.params.submissionDelete,
            ncyBreadcrumb: {skip: true},
            templateUrl: templates.submissionDelete ? templates.submissionDelete : 'formio-helper/submission/delete.html',
            controller: [
              '$scope',
              '$state',
              '$controller',
              function ($scope,
                        $state,
                        $controller) {
                var handle = false;
                if (controllers.submissionDelete) {
                  var ctrl = $controller(controllers.submissionDelete, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (!handle) {
                  $scope.$on('delete', function () {
                    $state.go(basePath + 'form.submissions');
                  });

                  $scope.$on('cancel', function () {
                    $state.go(basePath + 'form.submission.view');
                  });
                }
              }
            ]
          })
      },
      $get: function () {
        return resources;
      }
    };
  }
]);
