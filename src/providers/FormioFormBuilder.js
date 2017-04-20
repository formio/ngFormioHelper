angular.module('ngFormBuilderHelper')
.provider('FormioFormBuilder', [
  '$stateProvider',
  'FormioHelperConfig',
  function (
    $stateProvider,
    FormioHelperConfig
  ) {
    return {
      register: function (name, url, options) {
        options = options || {};
        var templates = options.templates ? options.templates : {};
        var controllers = options.controllers ? options.controllers : {};
        var basePath = options.base ? options.base : '';
        if (!basePath) {
          basePath = name ? name + '.' : '';
        }

        // Set the configurations.
        FormioHelperConfig.appUrl = url;
        FormioHelperConfig.tag = options.tag || 'common';
        FormioHelperConfig.perPage = options.perPage || 10;

        // Method for quick execution.
        var execute = function(path) {
          return function($scope, $controller, Controller) {
            $scope.basePath = basePath;
            $scope.statePath = path;
            if (Controller) {
              $controller(Controller, {'$scope': $scope});
            }
            var subController = _.get(controllers, path);
            if (subController) {
              $controller(subController, {'$scope': $scope});
            }
          }
        };

        $stateProvider
          .state(basePath + 'formIndex', {
            url: '/forms',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.index', 'formio-helper/formbuilder/index.html'),
            controller: ['$scope', '$controller', 'FormIndexController', execute('form.index')]
          })
          .state(basePath + 'createForm', {
            url: '/create/:formType',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.create', 'formio-helper/formbuilder/create.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.create')]
          })
          .state(basePath + 'form', {
            abstract: true,
            url: '/form/:formId',
            ncyBreadcrumb: _.get(options, 'breadcrumb.form', {skip: true}),
            templateUrl: _.get(templates, 'form.abstract', 'formio-helper/formbuilder/form.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.abstract')]
          })
          .state(basePath + 'form.view', {
            url: '/',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.view', 'formio-helper/formbuilder/view.html'),
            controller: ['$scope', '$controller', execute('form.view')]
          })
          .state(basePath + 'form.edit', {
            url: '/edit',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.edit', 'formio-helper/formbuilder/edit.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.edit')]
          })
          .state(basePath + 'form.delete', {
            url: '/delete',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.delete', 'formio-helper/formbuilder/delete.html'),
            controller: ['$scope', '$controller', execute('form.delete')]
          });

        var formStates = {};
        formStates[basePath + 'form.submission'] = {
          name: 'submission',
          id: 'subId',
          controller: ['$scope', '$controller', 'FormSubmissionController', execute('submission.index')]
        };
        formStates[basePath + 'form.action'] = {
          name: 'action',
          id: 'actionId',
          controller: ['$scope', '$controller', 'FormActionController', execute('action.index')]
        };

        angular.forEach(formStates, function(info, state) {
          $stateProvider
            .state(state + 'Index', {
              url: '/' + info.name,
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.index', 'formio-helper/formbuilder/' + info.name + '/index.html'),
              controller: info.controller
            })
            .state(state, {
              abstract: true,
              ncyBreadcrumb: _.get(options, 'breadcrumb.' + info.name, {skip: true}),
              url: '/' + info.name + '/:' + info.id,
              controller: info.controller,
              templateUrl: _.get(templates, info.name + '.abstract', 'formio-helper/formbuilder/' + info.name + '/item.html')
            })
            .state(state + '.view', {
              url: '',
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.view', 'formio-helper/formbuilder/' + info.name + '/view.html'),
              controller: ['$scope', '$controller', execute(info.name + '.view')]
            })
            .state(state + '.edit', {
              url: '/edit',
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.edit', 'formio-helper/formbuilder/' + info.name + '/edit.html'),
              controller: ['$scope', '$controller', execute(info.name + '.edit')]
            })
            .state(state + '.delete', {
              url: '/delete',
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.delete', 'formio-helper/formbuilder/' + info.name + '/delete.html'),
              controller: ['$scope', '$controller', execute(info.name + '.delete')]
            });
        });

        // Add the action adding state.
        $stateProvider.state(basePath + 'form.action.add', {
          url: '/add/:actionName',
          ncyBreadcrumb: {skip: true},
          templateUrl: _.get(templates, 'action.add', 'formio-helper/formbuilder/action/add.html'),
          controller: ['$scope', '$controller', 'FormActionController', execute('action.add')],
          params: {actionInfo: null}
        });

        // Add permission state.
        $stateProvider.state(basePath + 'form.permission', {
          url: '/permission',
          ncyBreadcrumb: {skip: true},
          templateUrl: _.get(templates, 'permission.index', 'formio-helper/formbuilder/permission/index.html'),
          controller: ['$scope', '$controller', 'RoleController', execute('permission.index')]
        });
      },
      $get: function () {
        return {};
      }
    };
  }
]);
