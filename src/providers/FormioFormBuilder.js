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
            templateUrl: _.get(templates, 'form.index', 'formio-helper/formbuilder/index.html'),
            controller: ['$scope', '$controller', 'FormIndexController', execute('form.index')]
          })
          .state(basePath + 'createForm', {
            url: '/create/:formType',
            templateUrl: _.get(templates, 'form.create', 'formio-helper/formbuilder/create.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.create')]
          })
          .state(basePath + 'form', {
            abstract: true,
            url: '/form/:formId',
            templateUrl: _.get(templates, 'form.abstract', 'formio-helper/formbuilder/form.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.abstract')]
          })
          .state(basePath + 'form.view', {
            url: '/',
            templateUrl: _.get(templates, 'form.view', 'formio-helper/formbuilder/view.html'),
            controller: ['$scope', '$controller', execute('form.view')]
          })
          .state(basePath + 'form.edit', {
            url: '/edit',
            templateUrl: _.get(templates, 'form.edit', 'formio-helper/formbuilder/edit.html'),
            controller: ['$scope', '$controller', execute('form.edit')]
          })
          .state(basePath + 'form.delete', {
            url: '/delete',
            parent: 'form',
            templateUrl: _.get(templates, 'form.delete', 'formio-helper/formbuilder/delete.html'),
            controller: ['$scope', '$controller', execute('form.delete')]
          });

        var formStates = {};
        formStates[basePath + 'form.submission'] = {
          path: '/submission',
          id: 'subId',
          controller: ['$scope', '$controller', 'FormSubmissionController', execute('submission.index')]
        };
        formStates[basePath + 'form.action'] = {
          path: '/action',
          id: 'actionId',
          controller: ['$scope', '$controller', 'FormActionController', execute('action.index')]
        };

        angular.forEach(formStates, function(info, state) {
          $stateProvider
            .state(state, {
              abstract: true,
              url: info.path,
              template: '<div ui-view></div>'
            })
            .state(state + '.index', {
              url: '',
              templateUrl: _.get(templates, 'form.' + info.path + 'Index', 'formio-helper/formbuilder' + info.path + '/index.html'),
              controller: info.controller
            })
            .state(state + '.item', {
              abstract: true,
              url: '/:' + info.id,
              controller: info.controller,
              templateUrl: _.get(templates, 'form.' + info.path + 'Item', 'formio-helper/formbuilder' + info.path + '/item.html')
            })
            .state(state + '.item.view', {
              url: '',
              templateUrl: _.get(templates, 'form.' + info.path + 'View', 'formio-helper/formbuilder' + info.path + '/view.html')
            })
            .state(state + '.item.edit', {
              url: '/edit',
              templateUrl: _.get(templates, 'form.' + info.path + 'Edit', 'formio-helper/formbuilder' + info.path + '/edit.html')
            })
            .state(state + '.item.delete', {
              url: '/delete',
              templateUrl: _.get(templates, 'form.' + info.path + 'Delete', 'formio-helper/formbuilder' + info.path + '/delete.html')
            });
        });

        // Add the action adding state.
        $stateProvider.state(basePath + 'form.action.add', {
          url: '/add/:actionName',
          templateUrl: _.get(templates, 'form.action.add', 'formio-helper/formbuilder/action/add.html'),
          controller: ['$scope', '$controller', 'FormActionController', execute('action.add')],
          params: {actionInfo: null}
        });

        // Add permission state.
        $stateProvider.state(basePath + 'form.permission', {
          url: '/permission',
          templateUrl: _.get(templates, 'form.permission.index', 'formio-helper/formbuilder/permission/index.html'),
          controller: ['$scope', '$controller', 'RoleController', execute('permission.index')]
        });
      },
      $get: function () {
        return {};
      }
    };
  }
]);