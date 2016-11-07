angular.module('ngFormioHelper')
.provider('FormioResource', [
  '$stateProvider',
  '$injector',
  function (
    $stateProvider,
    $injector
  ) {
    var resources = {};
    return {
      register: function (name, url, options) {
        options = options || {};
        resources[name] = options.title || name;
        var parent = (options && options.parent) ? options.parent : null;
        var parents = (options && options.parents) ? options.parents : [];
        if ((!parents || !parents.length) && parent) {
          parents = [parent];
        }
        var queryId = name + 'Id';
        options.base = options.base || '';
        var baseName = options.base + name;
        var query = function (submission) {
          var query = {};
          query[queryId] = submission._id;
          return query;
        };

        var $breadcrumbProvider = null;
        try {
          $breadcrumbProvider = $injector.get('$breadcrumbProvider');
        }
        catch (error) {
          $breadcrumbProvider = null;
        }

        // If we wish to enable breadcrumb functions.
        if (options.breadcrumb && $breadcrumbProvider) {
          $breadcrumbProvider.setOptions({
            includeAbstract: true,
            templateUrl: 'formio-helper/breadcrumb.html'
          });
        }

        // Allow them to alter the options per state.
        var baseAlter = function (options) {
          return options;
        };
        options.alter = angular.extend({
          index: baseAlter,
          create: baseAlter,
          abstract: baseAlter,
          view: baseAlter,
          edit: baseAlter,
          delete: baseAlter
        }, options.alter);

        var templates = (options && options.templates) ? options.templates : {};
        var controllers = (options && options.controllers) ? options.controllers : {};
        var queryParams = options.query ? options.query : '';
        $stateProvider
          .state(baseName + 'Index', options.alter.index({
            url: '/' + name + queryParams,
            params: options.params && options.params.index,
            data: options.data && options.data.index,
            templateUrl: templates.index ? templates.index : 'formio-helper/resource/index.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$state',
              '$stateParams',
              '$controller',
              function (
                $scope,
                $state,
                $stateParams,
                $controller
              ) {
                $scope.baseName = baseName;
                var gridQuery = {};
                if (parents.length) {
                  parents.forEach(function(parent) {
                    if ($stateParams.hasOwnProperty(parent + 'Id')) {
                      gridQuery['data.' + parent + '._id'] = $stateParams[parent + 'Id'];
                    }
                  });
                }
                $scope.currentResource = {
                  name: name,
                  queryId: queryId,
                  formUrl: url,
                  columns: [],
                  gridQuery: gridQuery,
                  gridOptions: {}
                };
                $scope.$on('rowView', function (event, submission) {
                  $state.go(baseName + '.view', query(submission));
                });
                $scope.$on('submissionView', function (event, submission) {
                  $state.go(baseName + '.view', query(submission));
                });

                $scope.$on('submissionEdit', function (event, submission) {
                  $state.go(baseName + '.edit', query(submission));
                });

                $scope.$on('submissionDelete', function (event, submission) {
                  $state.go(baseName + '.delete', query(submission));
                });
                if (controllers.index) {
                  $controller(controllers.index, {$scope: $scope});
                }
              }
            ]
          }))
          .state(baseName + 'Create', options.alter.create({
            url: '/create/' + name + queryParams,
            params: options.params && options.params.create,
            data: options.data && options.data.create,
            templateUrl: templates.create ? templates.create : 'formio-helper/resource/create.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$state',
              '$controller',
              function ($scope,
                        $state,
                        $controller) {
                $scope.baseName = baseName;
                $scope.currentResource = {
                  name: name,
                  queryId: queryId,
                  formUrl: url
                };
                $scope.submission = options.defaultValue ? options.defaultValue : {data: {}};
                $scope.pageTitle = 'New ' + _.capitalize(name);
                var handle = false;
                if (controllers.create) {
                  var ctrl = $controller(controllers.create, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (parents.length) {
                  if (!$scope.hideComponents) {
                    $scope.hideComponents = [];
                  }
                  $scope.hideComponents = $scope.hideComponents.concat(parents);

                  // Auto populate the parent entity with the new data.
                  parents.forEach(function(parent) {
                    $scope[parent].loadSubmissionPromise.then(function (entity) {
                      $scope.submission.data[parent] = entity;
                    });
                  });
                }
                if (!handle) {
                  $scope.$on('formSubmission', function (event, submission) {
                    $scope.currentResource.resource = submission;
                    $state.go(baseName + '.view', query(submission));
                  });
                }
              }
            ]
          }))
          .state(baseName, options.alter.abstract({
            abstract: true,
            url: '/' + name + '/:' + queryId,
            data: options.data && options.data.abstract,
            templateUrl: templates.abstract ? templates.abstract : 'formio-helper/resource/resource.html',
            ncyBreadcrumb: options.breadcrumb ? {label: options.breadcrumb.label} : {skip: true},
            controller: [
              '$scope',
              '$stateParams',
              'Formio',
              '$controller',
              '$http',
              function ($scope,
                        $stateParams,
                        Formio,
                        $controller,
                        $http) {
                var submissionUrl = url;
                var endpoint = options.endpoint;
                if (endpoint) {
                  endpoint += '/' + $stateParams[queryId];
                }
                else {
                  submissionUrl += '/submission/' + $stateParams[queryId];
                }

                $scope.baseName = baseName;
                $scope.currentResource = $scope[name] = {
                  name: name,
                  queryId: queryId,
                  formUrl: url,
                  submissionUrl: submissionUrl,
                  formio: (new Formio(submissionUrl)),
                  resource: {},
                  form: {},
                  href: '/#/' + name + '/' + $stateParams[queryId] + '/',
                  parent: (parents.length === 1) ? $scope[parents[0]] : {href: '/#/', name: 'home'}
                };

                $scope.currentResource.loadFormPromise = $scope.currentResource.formio.loadForm().then(function (form) {
                  $scope.currentResource.form = $scope[name].form = form;
                  return form;
                });

                // If they provide their own endpoint for data.
                if (options.endpoint) {
                  $scope.currentResource.loadSubmissionPromise = $http.get(endpoint, {
                    headers: {
                      'x-jwt-token': Formio.getToken()
                    }
                  }).then(function (result) {
                    $scope.currentResource.resource = result.data;
                    return result.data;
                  });
                }
                else {
                  $scope.currentResource.loadSubmissionPromise = $scope.currentResource.formio.loadSubmission().then(function (submission) {
                    $scope.currentResource.resource = $scope[name].submission = submission;
                    return submission;
                  });
                }

                if (controllers.abstract) {
                  $controller(controllers.abstract, {$scope: $scope});
                }
              }
            ]
          }))
          .state(baseName + '.view', options.alter.view({
            url: '/',
            params: options.params && options.params.view,
            data: options.data && options.data.view,
            templateUrl: templates.view ? templates.view : 'formio-helper/resource/view.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$controller',
              function ($scope,
                        $controller) {
                if (controllers.view) {
                  $controller(controllers.view, {$scope: $scope});
                }
              }
            ]
          }))
          .state(baseName + '.edit', options.alter.edit({
            url: '/edit',
            params: options.params && options.params.edit,
            data: options.data && options.data.edit,
            templateUrl: templates.edit ? templates.edit : 'formio-helper/resource/edit.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$state',
              '$controller',
              function ($scope,
                        $state,
                        $controller) {
                var handle = false;
                if (parents.length) {
                  if (!$scope.hideComponents) {
                    $scope.hideComponents = [];
                  }
                  $scope.hideComponents = $scope.hideComponents.concat(parents);
                }
                if (controllers.edit) {
                  var ctrl = $controller(controllers.edit, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (!handle) {
                  $scope.$on('formSubmission', function (event, submission) {
                    $scope.currentResource.resource = submission;
                    $state.go(baseName + '.view', query(submission));
                  });
                }
              }
            ]
          }))
          .state(baseName + '.delete', options.alter.delete({
            url: '/delete',
            params: options.params && options.params.delete,
            data: options.data && options.data.delete,
            templateUrl: templates.delete ? templates.delete : 'formio-helper/resource/delete.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$state',
              '$controller',
              function ($scope,
                        $state,
                        $controller) {
                var handle = false;
                $scope.resourceName = name;
                if (controllers.delete) {
                  var ctrl = $controller(controllers.delete, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (!handle) {
                  $scope.$on('delete', function () {
                    if ((parents.length === 1) && parents[0] !== 'home') {
                      $state.go(parents[0] + '.view');
                    }
                    else {
                      $state.go('home', null, {reload: true});
                    }
                  });
                  $scope.$on('cancel', function () {
                    $state.go(baseName + 'Index');
                  });
                }
              }
            ]
          }));
      },
      $get: function () {
        return resources;
      }
    };
  }
]);
