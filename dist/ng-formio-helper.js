(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

angular.module('ngFormioHelper', ['formio', 'ngFormioGrid', 'ui.router'])
  .filter('capitalize', [function () {
    return _.capitalize;
  }])
  .filter('truncate', [function () {
    return function (input, opts) {
      if (_.isNumber(opts)) {
        opts = {length: opts};
      }
      return _.truncate(input, opts);
    };
  }])
  .directive("fileread", [
    function () {
      return {
        scope: {
          fileread: "="
        },
        link: function (scope, element) {
          element.bind("change", function (changeEvent) {
            var reader = new FileReader();
            reader.onloadend = function (loadEvent) {
              scope.$apply(function () {
                scope.fileread = jQuery(loadEvent.target.result);
              });
            };
            reader.readAsText(changeEvent.target.files[0]);
          });
        }
      };
    }
  ])
  .provider('FormioResource', [
    '$stateProvider',
    function ($stateProvider) {
      var resources = {};
      return {
        register: function (name, url, options) {
          options = options || {};
          resources[name] = options.title || name;
          var parent = (options && options.parent) ? options.parent : null;
          var queryId = name + 'Id';
          var query = function (submission) {
            var query = {};
            query[queryId] = submission._id;
            return query;
          };

          var templates = (options && options.templates) ? options.templates : {};
          var controllers = (options && options.controllers) ? options.controllers : {};
          var queryParams = options.query ? options.query : '';
          $stateProvider
            .state(name + 'Index', {
              url: '/' + name + queryParams,
              parent: parent ? parent : null,
              params: options.params && options.params.index,
              templateUrl: templates.index ? templates.index : 'formio-helper/resource/index.html',
              controller: [
                '$scope',
                '$state',
                '$controller',
                function ($scope,
                          $state,
                          $controller) {
                  $scope.currentResource = {
                    name: name,
                    queryId: queryId,
                    formUrl: url,
                    columns: [],
                    gridOptions: {}
                  };
                  $scope.$on('rowView', function (event, submission) {
                    $state.go(name + '.view', query(submission));
                  });
                  $scope.$on('submissionView', function (event, submission) {
                    $state.go(name + '.view', query(submission));
                  });

                  $scope.$on('submissionEdit', function (event, submission) {
                    $state.go(name + '.edit', query(submission));
                  });

                  $scope.$on('submissionDelete', function (event, submission) {
                    $state.go(name + '.delete', query(submission));
                  });
                  if (controllers.index) {
                    $controller(controllers.index, {$scope: $scope});
                  }
                }
              ]
            })
            .state(name + 'Create', {
              url: '/create/' + name + queryParams,
              parent: parent ? parent : null,
              params: options.params && options.params.create,
              templateUrl: templates.create ? templates.create : 'formio-helper/resource/create.html',
              controller: [
                '$scope',
                '$state',
                '$controller',
                function ($scope,
                          $state,
                          $controller) {
                  $scope.currentResource = {
                    name: name,
                    queryId: queryId,
                    formUrl: url
                  };
                  $scope.submission = options.defaultValue ? options.defaultValue : {data: {}};
                  var handle = false;
                  if (controllers.create) {
                    var ctrl = $controller(controllers.create, {$scope: $scope});
                    handle = (ctrl.handle || false);
                  }
                  if (parent) {
                    if (!$scope.hideComponents) {
                      $scope.hideComponents = [];
                    }
                    $scope.hideComponents.push(parent);

                    // Auto populate the parent entity with the new data.
                    $scope[parent].loadSubmissionPromise.then(function (entity) {
                      $scope.submission.data[parent] = entity;
                    });
                  }
                  if (!handle) {
                    $scope.$on('formSubmission', function (event, submission) {
                      $state.go(name + '.view', query(submission));
                    });
                  }
                }
              ]
            })
            .state(name, {
              abstract: true,
              url: '/' + name + '/:' + queryId,
              parent: parent ? parent : null,
              templateUrl: templates.abstract ? templates.abstract : 'formio-helper/resource/resource.html',
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

                  $scope.currentResource = $scope[name] = {
                    name: name,
                    queryId: queryId,
                    formUrl: url,
                    submissionUrl: submissionUrl,
                    formio: (new Formio(submissionUrl)),
                    resource: {},
                    form: {},
                    href: '/#/' + name + '/' + $stateParams[queryId] + '/',
                    parent: parent ? $scope[parent] : {href: '/#/', name: 'home'}
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
            })
            .state(name + '.view', {
              url: '/',
              parent: name,
              params: options.params && options.params.view,
              templateUrl: templates.view ? templates.view : 'formio-helper/resource/view.html',
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
            })
            .state(name + '.edit', {
              url: '/edit',
              parent: name,
              params: options.params && options.params.edit,
              templateUrl: templates.edit ? templates.edit : 'formio-helper/resource/edit.html',
              controller: [
                '$scope',
                '$state',
                '$controller',
                function ($scope,
                          $state,
                          $controller) {
                  var handle = false;
                  if (controllers.edit) {
                    var ctrl = $controller(controllers.edit, {$scope: $scope});
                    handle = (ctrl.handle || false);
                  }
                  if (!handle) {
                    $scope.$on('formSubmission', function (event, submission) {
                      $state.go(name + '.view', query(submission));
                    });
                  }
                }
              ]
            })
            .state(name + '.delete', {
              url: '/delete',
              parent: name,
              params: options.params && options.params.delete,
              templateUrl: templates.delete ? templates.delete : 'formio-helper/resource/delete.html',
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
                      if (parent && parent !== 'home') {
                        $state.go(parent + '.view');
                      }
                      else {
                        $state.go('home', null, {reload: true});
                      }
                    });
                    $scope.$on('cancel', function () {
                      $state.go(name + 'Index');
                    });
                  }
                }
              ]
            });
        },
        $get: function () {
          return resources;
        }
      };
    }
  ])
  .directive('formioForms', function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        src: '=',
        base: '=',
        tag: '=?'
      },
      templateUrl: 'formio-helper/form/list.html',
      controller: ['$scope', 'Formio', function ($scope, Formio) {
        $scope.forms = [];
        var params = {
          type: 'form',
          limit: 9999999
        };
        if ($scope.tag) {
          params.tags = $scope.tag;
        }
        (new Formio($scope.src)).loadForms({params: params}).then(function (forms) {
          $scope.forms = forms;
        });
      }]
    };
  })
  .provider('FormioForms', [
    '$stateProvider',
    function ($stateProvider) {
      var resources = {};
      return {
        register: function (name, url, options) {
          var templates = (options && options.templates) ? options.templates : {};
          var controllers = (options && options.controllers) ? options.controllers : {};
          var basePath = name ? name + '.' : '';
          $stateProvider
            .state(basePath + 'formIndex', {
              url: '/forms',
              params: options.params && options.params.index,
              templateUrl: templates.index ? templates.index : 'formio-helper/form/index.html',
              controller: ['$scope', 'Formio', '$controller', function ($scope, Formio, $controller) {
                $scope.formBase = basePath;
                $scope.formsSrc = url + '/form';
                $scope.formsTag = options.tag;
                if (controllers.index) {
                  $controller(controllers.index, {$scope: $scope});
                }
              }]
            })
            .state(basePath + 'form', {
              url: '/form/:formId',
              abstract: true,
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
                  if (options.field) {
                    $scope.currentForm.promise.then(function () {
                      $scope.currentResource.loadSubmissionPromise.then(function (resource) {
                        $scope.submission.data[options.field] = resource;
                        FormioUtils.hideFields($scope.currentForm.form, [options.field]);
                      });
                    });
                  }
                  $scope.$on('formSubmission', function () {
                    $state.go(basePath + 'form.submissions');
                  });
                  if (controllers.view) {
                    $controller(controllers.view, {$scope: $scope});
                  }
                }
              ]
            })
            .state(basePath + 'form.submissions', {
              url: '/submissions',
              params: options.params && options.params.submissions,
              templateUrl: templates.submissions ? templates.submissions : 'formio-helper/submission/index.html',
              controller: [
                '$scope',
                '$state',
                '$stateParams',
                'FormioUtils',
                '$controller',
                function ($scope,
                          $state,
                          $stateParams,
                          FormioUtils,
                          $controller) {
                  $scope.submissionQuery = {};
                  $scope.submissionColumns = [];
                  if (options.field) {
                    $scope.submissionQuery['data.' + options.field + '._id'] = $stateParams[name + 'Id'];
                  }

                  // Go to the submission when they click on the row.
                  $scope.$on('rowView', function (event, entity) {
                    $state.go(basePath + 'form.submission.view', {
                      formId: entity.form,
                      submissionId: entity._id
                    });
                  });

                  // Wait until the current form is loaded.
                  $scope.currentForm.promise.then(function (form) {
                    FormioUtils.eachComponent(form.components, function (component) {
                      if (!component.key || !component.input || !component.tableView) {
                        return;
                      }
                      if (options.field && (component.key === options.field)) {
                        return;
                      }
                      $scope.submissionColumns.push(component.key);
                    });

                    // Ensure we reload the data grid.
                    $scope.$broadcast('reloadGrid');
                  });

                  if (controllers.submissions) {
                    $controller(controllers.submissions, {$scope: $scope});
                  }
                }
              ]
            })
            .state(basePath + 'form.submission', {
              abstract: true,
              url: '/submission/:submissionId',
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
                    submission: {}
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
              templateUrl: templates.submissionEdit ? templates.submissionEdit : 'formio-helper/submission/edit.html',
              controller: [
                '$scope',
                '$state',
                '$controller',
                function ($scope,
                          $state,
                          $controller) {
                  $scope.$on('formSubmission', function (event, submission) {
                    $scope.currentSubmission.submission = submission;
                    $state.go(basePath + 'form.submission.view');
                  });
                  if (controllers.submissionEdit) {
                    $controller(controllers.submissionEdit, {$scope: $scope});
                  }
                }
              ]
            })
            .state(basePath + 'form.submission.delete', {
              url: '/delete',
              params: options.params && options.params.submissionDelete,
              templateUrl: templates.submissionDelete ? templates.submissionDelete : 'formio-helper/submission/delete.html',
              controller: [
                '$scope',
                '$state',
                '$controller',
                function ($scope,
                          $state,
                          $controller) {
                  $scope.$on('delete', function () {
                    $state.go(basePath + 'form.submissions');
                  });

                  $scope.$on('cancel', function () {
                    $state.go(basePath + 'form.submission.view');
                  });

                  if (controllers.submissionDelete) {
                    $controller(controllers.submissionDelete, {$scope: $scope});
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
  ])
  .provider('FormioAuth', [
    '$stateProvider',
    function ($stateProvider) {
      var anonState = 'auth.login';
      var anonRole = false;
      var appUrl = '';
      var authState = 'home';
      var forceAuth = false;
      var registered = false;
      // These are needed to check permissions against specific forms.
      var formAccess = {};
      return {
        setForceAuth: function (force) {
          forceAuth = force;
        },
        setStates: function (anon, auth) {
          anonState = anon;
          authState = auth;
        },
        setAnonRole: function(role) {
          anonRole = role;
        },
        setAppUrl: function(url) {
          appUrl = url;
        },
        register: function (name, resource, path) {
          if (!registered) {
            registered = true;
            $stateProvider.state('auth', {
              abstract: true,
              url: '/auth',
              templateUrl: 'views/user/auth.html'
            });
          }

          if (!path) {
            path = name;
          }
          $stateProvider
            .state('auth.' + name, {
              url: '/' + path,
              parent: 'auth',
              templateUrl: 'views/user/' + name.toLowerCase() + '.html',
              controller: ['$scope', '$state', '$rootScope', function ($scope, $state, $rootScope) {
                $scope.$on('formSubmission', function (err, submission) {
                  if (!submission) {
                    return;
                  }
                  $rootScope.setUser(submission, resource);
                  $state.go(authState);
                });
              }]
            })
        },
        $get: [
          'Formio',
          'FormioAlerts',
          '$rootScope',
          '$state',
          function (Formio,
                    FormioAlerts,
                    $rootScope,
                    $state) {
            return {
              init: function () {
                // Format the roles and access for easy usage.
                (new Formio(appUrl + '/form')).loadForms({params:{limit: 9999999}}).then(function (forms) {
                  forms.forEach(function(form) {
                    formAccess[form.name] = {};
                    form.submissionAccess.forEach(function(access) {
                      formAccess[form.name][access.type] = access.roles;
                    });
                  });
                });
                $rootScope.user = {};
                $rootScope.isRole = function (role) {
                  return $rootScope.role === role.toLowerCase();
                };
                $rootScope.setUser = function (user, role) {
                  if (user) {
                    $rootScope.user = user;
                    localStorage.setItem('formioAppUser', angular.toJson(user));
                  }
                  else {
                    $rootScope.user = null;
                    localStorage.removeItem('formioAppUser');
                    localStorage.removeItem('formioUser');
                    localStorage.removeItem('formioToken');
                  }

                  if (!role) {
                    $rootScope.role = null;
                    localStorage.removeItem('formioAppRole');
                  }
                  else {
                    $rootScope.role = role.toLowerCase();
                    localStorage.setItem('formioAppRole', role);
                  }

                  $rootScope.authenticated = !!Formio.getToken();
                  $rootScope.$emit('user', {
                    user: $rootScope.user,
                    role: $rootScope.role
                  });
                };

                $rootScope.hasAccess = function(form, permission) {
                  // Check that the formAccess has been initialized.
                  if (!formAccess[form] || !formAccess[form][permission]) {
                    return false;
                  }
                  var hasAccess = false;
                  // Check for anonymous users. Must set anonRole.
                  if (!$rootScope.user) {
                    hasAccess = formAccess[form][permission].indexOf(anonRole) !== -1;
                  }
                  else {
                    // Check the user's roles for access.
                    $rootScope.user.roles.forEach(function(role) {
                      if (formAccess[form][permission].indexOf(role) !== -1) {
                        hasAccess = true;
                      }
                    });
                  }
                  return hasAccess;
                };

                // Set the current user object and role.
                var user = localStorage.getItem('formioAppUser');
                $rootScope.setUser(
                  user ? angular.fromJson(user) : null,
                  localStorage.getItem('formioAppRole')
                );

                if (!$rootScope.user) {
                  Formio.currentUser().then(function (user) {
                    $rootScope.setUser(user, localStorage.getItem('formioRole'));
                  });
                }

                var logoutError = function () {
                  $state.go(anonState, {}, {reload: true});
                  FormioAlerts.addAlert({
                    type: 'danger',
                    message: 'Your session has expired. Please log in again.'
                  });
                };

                $rootScope.$on('formio.sessionExpired', logoutError);

                // Trigger when a logout occurs.
                $rootScope.logout = function () {
                  $rootScope.setUser(null, null);
                  Formio.logout().then(function () {
                    $state.go(anonState, {}, {reload: true});
                  }).catch(logoutError);
                };

                // Ensure they are logged.
                $rootScope.$on('$stateChangeStart', function (event, toState) {
                  $rootScope.authenticated = !!Formio.getToken();
                  if (forceAuth) {
                    if (toState.name.substr(0, 4) === 'auth') {
                      return;
                    }
                    if (!$rootScope.authenticated) {
                      event.preventDefault();
                      $state.go(anonState, {}, {reload: true});
                    }
                  }
                });

                // Set the alerts
                $rootScope.$on('$stateChangeSuccess', function () {
                  $rootScope.alerts = FormioAlerts.getAlerts();
                });
              }
            };
          }
        ]
      };
    }
  ])
  .factory('FormioAlerts', [
    '$rootScope',
    function ($rootScope) {
      var alerts = [];
      return {
        addAlert: function (alert) {
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
  ])
  .run([
    '$templateCache',
    '$rootScope',
    '$state',
    function ($templateCache,
              $rootScope,
              $state) {
      // Determine the active state.
      $rootScope.isActive = function (state) {
        return $state.current.name.indexOf(state) !== -1;
      };

      /**** RESOURCE TEMPLATES *******/
      $templateCache.put('formio-helper/resource/resource.html',
        "<h2>{{ currentResource.name | capitalize }}</h2>\n<ul class=\"nav nav-tabs\">\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.view')}\"><a ui-sref=\"{{ currentResource.name }}.view()\">View</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.edit')}\"><a ui-sref=\"{{ currentResource.name }}.edit()\">Edit</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.delete')}\"><a ui-sref=\"{{ currentResource.name }}.delete()\">Delete</a></li>\n</ul>\n<div ui-view></div>\n"
      );

      $templateCache.put('formio-helper/resource/create.html',
        "<h3>New {{ currentResource.name | capitalize }}</h3>\n<hr></hr>\n<formio src=\"currentResource.formUrl\" submission=\"submission\" hide-components=\"hideComponents\"></formio>\n"
      );

      $templateCache.put('formio-helper/resource/delete.html',
        "<formio-delete src=\"currentResource.submissionUrl\" resource-name=\"resourceName\"></formio-delete>\n"
      );

      $templateCache.put('formio-helper/resource/edit.html',
        "<formio src=\"currentResource.submissionUrl\"></formio>\n"
      );

      $templateCache.put('formio-helper/resource/index.html',
        "<formio-grid src=\"currentResource.formUrl\" columns=\"currentResource.columns\" grid-options=\"currentResource.gridOptions\"></formio-grid><br/>\n<a ui-sref=\"{{ currentResource.name }}Create()\" class=\"btn btn-primary\"><span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> New {{ currentResource.name | capitalize }}</a>\n"
      );

      $templateCache.put('formio-helper/resource/view.html',
        "<formio src=\"currentResource.submissionUrl\" read-only=\"true\"></formio>\n"
      );

      /**** FORM TEMPLATES *******/
      $templateCache.put('formio-helper/form/list.html',
        "<ul class=\"list-group\">\n    <li class=\"list-group-item\" ng-repeat=\"form in forms | orderBy: 'title'\"><a ui-sref=\"{{ base }}form.view({formId: form._id})\">{{ form.title }}</a></li>\n</ul>\n"
      );

      $templateCache.put('formio-helper/form/index.html',
        "<formio-forms src=\"formsSrc\" tag=\"formsTag\" base=\"formBase\"></formio-forms>\n"
      );

      $templateCache.put('formio-helper/form/form.html',
        "<ul class=\"nav nav-tabs\">\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.view')}\"><a ui-sref=\"{{ formBase }}form.view()\">Form</a></li>\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submissions')}\"><a ui-sref=\"{{ formBase }}form.submissions()\">Submissions</a></li>\n</ul>\n<div ui-view style=\"margin-top:20px;\"></div>\n"
      );

      $templateCache.put('formio-helper/form/view.html',
        "<formio form=\"currentForm.form\" form-action=\"currentForm.url + '/submission'\" submission=\"submission\"></formio>\n"
      );

      /**** SUBMISSION TEMPLATES *******/
      $templateCache.put('formio-helper/submission/index.html',
        "<formio-grid src=\"currentForm.url\" query=\"submissionQuery\" columns=\"submissionColumns\"></formio-grid>\n\n"
      );

      $templateCache.put('formio-helper/submission/submission.html',
        "<ul class=\"nav nav-pills\">\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.view')}\"><a ui-sref=\"{{ formBase }}form.submission.view()\">View</a></li>\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.edit')}\"><a ui-sref=\"{{ formBase }}form.submission.edit()\">Edit</a></li>\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.delete')}\"><a ui-sref=\"{{ formBase }}form.submission.delete()\">Delete</a></li>\n</ul>\n<div ui-view style=\"margin-top:20px;\"></div>\n"
      );

      $templateCache.put('formio-helper/submission/view.html',
        "<formio form=\"currentForm.form\" submission=\"currentSubmission.submission\" read-only=\"true\"></formio>\n"
      );

      $templateCache.put('formio-helper/submission/edit.html',
        "<formio form=\"currentForm.form\" submission=\"currentSubmission.submission\" form-action=\"currentSubmission.url\"></formio>\n"
      );

      $templateCache.put('formio-helper/submission/delete.html',
        "<formio-delete src=\"currentSubmission.url\"></formio-delete>\n"
      );
    }
  ]);
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbmctZm9ybWlvLWhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5hbmd1bGFyLm1vZHVsZSgnbmdGb3JtaW9IZWxwZXInLCBbJ2Zvcm1pbycsICduZ0Zvcm1pb0dyaWQnLCAndWkucm91dGVyJ10pXG4gIC5maWx0ZXIoJ2NhcGl0YWxpemUnLCBbZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfLmNhcGl0YWxpemU7XG4gIH1dKVxuICAuZmlsdGVyKCd0cnVuY2F0ZScsIFtmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCwgb3B0cykge1xuICAgICAgaWYgKF8uaXNOdW1iZXIob3B0cykpIHtcbiAgICAgICAgb3B0cyA9IHtsZW5ndGg6IG9wdHN9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIF8udHJ1bmNhdGUoaW5wdXQsIG9wdHMpO1xuICAgIH07XG4gIH1dKVxuICAuZGlyZWN0aXZlKFwiZmlsZXJlYWRcIiwgW1xuICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgZmlsZXJlYWQ6IFwiPVwiXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuICAgICAgICAgIGVsZW1lbnQuYmluZChcImNoYW5nZVwiLCBmdW5jdGlvbiAoY2hhbmdlRXZlbnQpIHtcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uIChsb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5maWxlcmVhZCA9IGpRdWVyeShsb2FkRXZlbnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGNoYW5nZUV2ZW50LnRhcmdldC5maWxlc1swXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICBdKVxuICAucHJvdmlkZXIoJ0Zvcm1pb1Jlc291cmNlJywgW1xuICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24gKG5hbWUsIHVybCwgb3B0aW9ucykge1xuICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgIHJlc291cmNlc1tuYW1lXSA9IG9wdGlvbnMudGl0bGUgfHwgbmFtZTtcbiAgICAgICAgICB2YXIgcGFyZW50ID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5wYXJlbnQpID8gb3B0aW9ucy5wYXJlbnQgOiBudWxsO1xuICAgICAgICAgIHZhciBxdWVyeUlkID0gbmFtZSArICdJZCc7XG4gICAgICAgICAgdmFyIHF1ZXJ5ID0gZnVuY3Rpb24gKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgICAgICAgcXVlcnlbcXVlcnlJZF0gPSBzdWJtaXNzaW9uLl9pZDtcbiAgICAgICAgICAgIHJldHVybiBxdWVyeTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdmFyIHRlbXBsYXRlcyA9IChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGVzKSA/IG9wdGlvbnMudGVtcGxhdGVzIDoge307XG4gICAgICAgICAgdmFyIGNvbnRyb2xsZXJzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5jb250cm9sbGVycykgPyBvcHRpb25zLmNvbnRyb2xsZXJzIDoge307XG4gICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0gb3B0aW9ucy5xdWVyeSA/IG9wdGlvbnMucXVlcnkgOiAnJztcbiAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnSW5kZXgnLCB7XG4gICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArIHF1ZXJ5UGFyYW1zLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuaW5kZXgsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuaW5kZXggPyB0ZW1wbGF0ZXMuaW5kZXggOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlJZDogcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybVVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgZ3JpZE9wdGlvbnM6IHt9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbigncm93VmlldycsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvblZpZXcnLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLnZpZXcnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvbkVkaXQnLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLmVkaXQnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvbkRlbGV0ZScsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcuZGVsZXRlJywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuaW5kZXgsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJ0NyZWF0ZScsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2NyZWF0ZS8nICsgbmFtZSArIHF1ZXJ5UGFyYW1zLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuY3JlYXRlLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmNyZWF0ZSA/IHRlbXBsYXRlcy5jcmVhdGUgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9jcmVhdGUuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gb3B0aW9ucy5kZWZhdWx0VmFsdWUgPyBvcHRpb25zLmRlZmF1bHRWYWx1ZSA6IHtkYXRhOiB7fX07XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuY3JlYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuY3JlYXRlLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlID0gKGN0cmwuaGFuZGxlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaGlkZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZUNvbXBvbmVudHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZUNvbXBvbmVudHMucHVzaChwYXJlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEF1dG8gcG9wdWxhdGUgdGhlIHBhcmVudCBlbnRpdHkgd2l0aCB0aGUgbmV3IGRhdGEuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZVtwYXJlbnRdLmxvYWRTdWJtaXNzaW9uUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChlbnRpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbi5kYXRhW3BhcmVudF0gPSBlbnRpdHk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKG5hbWUsIHtcbiAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArICcvOicgKyBxdWVyeUlkLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuYWJzdHJhY3QgPyB0ZW1wbGF0ZXMuYWJzdHJhY3QgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9yZXNvdXJjZS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgJyRodHRwJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRodHRwKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvblVybCA9IHVybDtcbiAgICAgICAgICAgICAgICAgIHZhciBlbmRwb2ludCA9IG9wdGlvbnMuZW5kcG9pbnQ7XG4gICAgICAgICAgICAgICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQgKz0gJy8nICsgJHN0YXRlUGFyYW1zW3F1ZXJ5SWRdO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25VcmwgKz0gJy9zdWJtaXNzaW9uLycgKyAkc3RhdGVQYXJhbXNbcXVlcnlJZF07XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSAkc2NvcGVbbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvblVybDogc3VibWlzc2lvblVybCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWlvOiAobmV3IEZvcm1pbyhzdWJtaXNzaW9uVXJsKSksXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgZm9ybToge30sXG4gICAgICAgICAgICAgICAgICAgIGhyZWY6ICcvIy8nICsgbmFtZSArICcvJyArICRzdGF0ZVBhcmFtc1txdWVyeUlkXSArICcvJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnQgPyAkc2NvcGVbcGFyZW50XSA6IHtocmVmOiAnLyMvJywgbmFtZTogJ2hvbWUnfVxuICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkRm9ybVByb21pc2UgPSAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm1pby5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5mb3JtID0gJHNjb3BlW25hbWVdLmZvcm0gPSBmb3JtO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGV5IHByb3ZpZGUgdGhlaXIgb3duIGVuZHBvaW50IGZvciBkYXRhLlxuICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkU3VibWlzc2lvblByb21pc2UgPSAkaHR0cC5nZXQoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAneC1qd3QtdG9rZW4nOiBGb3JtaW8uZ2V0VG9rZW4oKVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5yZXNvdXJjZSA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkU3VibWlzc2lvblByb21pc2UgPSAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm1pby5sb2FkU3VibWlzc2lvbigpLnRoZW4oZnVuY3Rpb24gKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLnJlc291cmNlID0gJHNjb3BlW25hbWVdLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmFic3RyYWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmFic3RyYWN0LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUobmFtZSArICcudmlldycsIHtcbiAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy52aWV3LFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnZpZXcgPyB0ZW1wbGF0ZXMudmlldyA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMudmlldykge1xuICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy52aWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUobmFtZSArICcuZWRpdCcsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2VkaXQnLFxuICAgICAgICAgICAgICBwYXJlbnQ6IG5hbWUsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuZWRpdCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5lZGl0ID8gdGVtcGxhdGVzLmVkaXQgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZWRpdCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmVkaXQsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLmRlbGV0ZScsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2RlbGV0ZScsXG4gICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5kZWxldGUsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuZGVsZXRlID8gdGVtcGxhdGVzLmRlbGV0ZSA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc291cmNlTmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuZGVsZXRlLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlID0gKGN0cmwuaGFuZGxlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2RlbGV0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudCAhPT0gJ2hvbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28ocGFyZW50ICsgJy52aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJywgbnVsbCwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICdJbmRleCcpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAkZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc291cmNlcztcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pXG4gIC5kaXJlY3RpdmUoJ2Zvcm1pb0Zvcm1zJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHNyYzogJz0nLFxuICAgICAgICBiYXNlOiAnPScsXG4gICAgICAgIHRhZzogJz0/J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvLWhlbHBlci9mb3JtL2xpc3QuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICdGb3JtaW8nLCBmdW5jdGlvbiAoJHNjb3BlLCBGb3JtaW8pIHtcbiAgICAgICAgJHNjb3BlLmZvcm1zID0gW107XG4gICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgdHlwZTogJ2Zvcm0nLFxuICAgICAgICAgIGxpbWl0OiA5OTk5OTk5XG4gICAgICAgIH07XG4gICAgICAgIGlmICgkc2NvcGUudGFnKSB7XG4gICAgICAgICAgcGFyYW1zLnRhZ3MgPSAkc2NvcGUudGFnO1xuICAgICAgICB9XG4gICAgICAgIChuZXcgRm9ybWlvKCRzY29wZS5zcmMpKS5sb2FkRm9ybXMoe3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbiAoZm9ybXMpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybXMgPSBmb3JtcztcbiAgICAgICAgfSk7XG4gICAgICB9XVxuICAgIH07XG4gIH0pXG4gIC5wcm92aWRlcignRm9ybWlvRm9ybXMnLCBbXG4gICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAobmFtZSwgdXJsLCBvcHRpb25zKSB7XG4gICAgICAgICAgdmFyIHRlbXBsYXRlcyA9IChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGVzKSA/IG9wdGlvbnMudGVtcGxhdGVzIDoge307XG4gICAgICAgICAgdmFyIGNvbnRyb2xsZXJzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5jb250cm9sbGVycykgPyBvcHRpb25zLmNvbnRyb2xsZXJzIDoge307XG4gICAgICAgICAgdmFyIGJhc2VQYXRoID0gbmFtZSA/IG5hbWUgKyAnLicgOiAnJztcbiAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm1JbmRleCcsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2Zvcm1zJyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5pbmRleCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5pbmRleCA/IHRlbXBsYXRlcy5pbmRleCA6ICdmb3JtaW8taGVscGVyL2Zvcm0vaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJ0Zvcm1pbycsICckY29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZvcm1pbywgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybUJhc2UgPSBiYXNlUGF0aDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybXNTcmMgPSB1cmwgKyAnL2Zvcm0nO1xuICAgICAgICAgICAgICAgICRzY29wZS5mb3Jtc1RhZyA9IG9wdGlvbnMudGFnO1xuICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5pbmRleCkge1xuICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuaW5kZXgsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybScsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2Zvcm0vOmZvcm1JZCcsXG4gICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmZvcm0gPyB0ZW1wbGF0ZXMuZm9ybSA6ICdmb3JtaW8taGVscGVyL2Zvcm0vZm9ybS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgZm9ybVVybCA9IHVybCArICcvZm9ybS8nICsgJHN0YXRlUGFyYW1zLmZvcm1JZDtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtQmFzZSA9IGJhc2VQYXRoO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGZvcm1VcmwsXG4gICAgICAgICAgICAgICAgICAgIGZvcm06IHt9XG4gICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0uZm9ybWlvID0gKG5ldyBGb3JtaW8oZm9ybVVybCkpO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLnByb21pc2UgPSAkc2NvcGUuY3VycmVudEZvcm0uZm9ybWlvLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0uZm9ybSA9IGZvcm07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtO1xuICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5mb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmZvcm0sIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnZpZXcnLCB7XG4gICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnZpZXcsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMudmlldyA/IHRlbXBsYXRlcy52aWV3IDogJ2Zvcm1pby1oZWxwZXIvZm9ybS92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA9IHtkYXRhOiB7fX07XG4gICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0ucHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChyZXNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24uZGF0YVtvcHRpb25zLmZpZWxkXSA9IHJlc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMuaGlkZUZpZWxkcygkc2NvcGUuY3VycmVudEZvcm0uZm9ybSwgW29wdGlvbnMuZmllbGRdKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMudmlldywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnLCB7XG4gICAgICAgICAgICAgIHVybDogJy9zdWJtaXNzaW9ucycsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvbnMsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbnMgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbnMgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uUXVlcnkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uQ29sdW1ucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZmllbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25RdWVyeVsnZGF0YS4nICsgb3B0aW9ucy5maWVsZCArICcuX2lkJ10gPSAkc3RhdGVQYXJhbXNbbmFtZSArICdJZCddO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgc3VibWlzc2lvbiB3aGVuIHRoZXkgY2xpY2sgb24gdGhlIHJvdy5cbiAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3Jvd1ZpZXcnLCBmdW5jdGlvbiAoZXZlbnQsIGVudGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgZm9ybUlkOiBlbnRpdHkuZm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uSWQ6IGVudGl0eS5faWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgLy8gV2FpdCB1bnRpbCB0aGUgY3VycmVudCBmb3JtIGlzIGxvYWRlZC5cbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5wcm9taXNlLnRoZW4oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudChmb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5rZXkgfHwgIWNvbXBvbmVudC5pbnB1dCB8fCAhY29tcG9uZW50LnRhYmxlVmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCAmJiAoY29tcG9uZW50LmtleSA9PT0gb3B0aW9ucy5maWVsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25Db2x1bW5zLnB1c2goY29tcG9uZW50LmtleSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSByZWxvYWQgdGhlIGRhdGEgZ3JpZC5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3JlbG9hZEdyaWQnKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbnMsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24nLCB7XG4gICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICB1cmw6ICcvc3VibWlzc2lvbi86c3VibWlzc2lvbklkJyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb24gPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbiA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vc3VibWlzc2lvbi5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJHNjb3BlLmN1cnJlbnRGb3JtLnVybCArICcvc3VibWlzc2lvbi8nICsgJHN0YXRlUGFyYW1zLnN1Ym1pc3Npb25JZCxcbiAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbjoge31cbiAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBmb3JtaW8gb2JqZWN0LlxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLmZvcm1pbyA9IChuZXcgRm9ybWlvKCRzY29wZS5jdXJyZW50U3VibWlzc2lvbi51cmwpKTtcblxuICAgICAgICAgICAgICAgICAgLy8gTG9hZCB0aGUgY3VycmVudCBzdWJtaXNzaW9uLlxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnByb21pc2UgPSAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uZm9ybWlvLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbiAoc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvbiA9IHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNvbnRyb2xsZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9uLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnLCB7XG4gICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25WaWV3LFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25WaWV3ID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25WaWV3IDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25WaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25WaWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLmVkaXQnLCB7XG4gICAgICAgICAgICAgIHVybDogJy9lZGl0JyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uRWRpdCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9uRWRpdCA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uRWRpdCA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25FZGl0KSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25FZGl0LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLmRlbGV0ZScsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2RlbGV0ZScsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvbkRlbGV0ZSxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9uRGVsZXRlID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25EZWxldGUgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZGVsZXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9ucycpO1xuICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jyk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25EZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbkRlbGV0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgICAkZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc291cmNlcztcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pXG4gIC5wcm92aWRlcignRm9ybWlvQXV0aCcsIFtcbiAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICAgdmFyIGFub25TdGF0ZSA9ICdhdXRoLmxvZ2luJztcbiAgICAgIHZhciBhbm9uUm9sZSA9IGZhbHNlO1xuICAgICAgdmFyIGFwcFVybCA9ICcnO1xuICAgICAgdmFyIGF1dGhTdGF0ZSA9ICdob21lJztcbiAgICAgIHZhciBmb3JjZUF1dGggPSBmYWxzZTtcbiAgICAgIHZhciByZWdpc3RlcmVkID0gZmFsc2U7XG4gICAgICAvLyBUaGVzZSBhcmUgbmVlZGVkIHRvIGNoZWNrIHBlcm1pc3Npb25zIGFnYWluc3Qgc3BlY2lmaWMgZm9ybXMuXG4gICAgICB2YXIgZm9ybUFjY2VzcyA9IHt9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2V0Rm9yY2VBdXRoOiBmdW5jdGlvbiAoZm9yY2UpIHtcbiAgICAgICAgICBmb3JjZUF1dGggPSBmb3JjZTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0U3RhdGVzOiBmdW5jdGlvbiAoYW5vbiwgYXV0aCkge1xuICAgICAgICAgIGFub25TdGF0ZSA9IGFub247XG4gICAgICAgICAgYXV0aFN0YXRlID0gYXV0aDtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0QW5vblJvbGU6IGZ1bmN0aW9uKHJvbGUpIHtcbiAgICAgICAgICBhbm9uUm9sZSA9IHJvbGU7XG4gICAgICAgIH0sXG4gICAgICAgIHNldEFwcFVybDogZnVuY3Rpb24odXJsKSB7XG4gICAgICAgICAgYXBwVXJsID0gdXJsO1xuICAgICAgICB9LFxuICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24gKG5hbWUsIHJlc291cmNlLCBwYXRoKSB7XG4gICAgICAgICAgaWYgKCFyZWdpc3RlcmVkKSB7XG4gICAgICAgICAgICByZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhdXRoJywge1xuICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgdXJsOiAnL2F1dGgnLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvYXV0aC5odG1sJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgICAgICBwYXRoID0gbmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnYXV0aC4nICsgbmFtZSwge1xuICAgICAgICAgICAgICB1cmw6ICcvJyArIHBhdGgsXG4gICAgICAgICAgICAgIHBhcmVudDogJ2F1dGgnLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvJyArIG5hbWUudG9Mb3dlckNhc2UoKSArICcuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRzdGF0ZScsICckcm9vdFNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCAkcm9vdFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXJyLCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIXN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKHN1Ym1pc3Npb24sIHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhdXRoU3RhdGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgJGdldDogW1xuICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICdGb3JtaW9BbGVydHMnLFxuICAgICAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICBmdW5jdGlvbiAoRm9ybWlvLFxuICAgICAgICAgICAgICAgICAgICBGb3JtaW9BbGVydHMsXG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIEZvcm1hdCB0aGUgcm9sZXMgYW5kIGFjY2VzcyBmb3IgZWFzeSB1c2FnZS5cbiAgICAgICAgICAgICAgICAobmV3IEZvcm1pbyhhcHBVcmwgKyAnL2Zvcm0nKSkubG9hZEZvcm1zKHtwYXJhbXM6e2xpbWl0OiA5OTk5OTk5fX0pLnRoZW4oZnVuY3Rpb24gKGZvcm1zKSB7XG4gICAgICAgICAgICAgICAgICBmb3Jtcy5mb3JFYWNoKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgZm9ybUFjY2Vzc1tmb3JtLm5hbWVdID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvcm0uc3VibWlzc2lvbkFjY2Vzcy5mb3JFYWNoKGZ1bmN0aW9uKGFjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgIGZvcm1BY2Nlc3NbZm9ybS5uYW1lXVthY2Nlc3MudHlwZV0gPSBhY2Nlc3Mucm9sZXM7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0ge307XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5pc1JvbGUgPSBmdW5jdGlvbiAocm9sZSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuICRyb290U2NvcGUucm9sZSA9PT0gcm9sZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyID0gZnVuY3Rpb24gKHVzZXIsIHJvbGUpIHtcbiAgICAgICAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdmb3JtaW9BcHBVc2VyJywgYW5ndWxhci50b0pzb24odXNlcikpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9BcHBVc2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9Vc2VyJyk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9Ub2tlbicpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoIXJvbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5yb2xlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb0FwcFJvbGUnKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdmb3JtaW9BcHBSb2xlJywgcm9sZSk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYXV0aGVudGljYXRlZCA9ICEhRm9ybWlvLmdldFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCd1c2VyJywge1xuICAgICAgICAgICAgICAgICAgICB1c2VyOiAkcm9vdFNjb3BlLnVzZXIsXG4gICAgICAgICAgICAgICAgICAgIHJvbGU6ICRyb290U2NvcGUucm9sZVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuaGFzQWNjZXNzID0gZnVuY3Rpb24oZm9ybSwgcGVybWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgZm9ybUFjY2VzcyBoYXMgYmVlbiBpbml0aWFsaXplZC5cbiAgICAgICAgICAgICAgICAgIGlmICghZm9ybUFjY2Vzc1tmb3JtXSB8fCAhZm9ybUFjY2Vzc1tmb3JtXVtwZXJtaXNzaW9uXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB2YXIgaGFzQWNjZXNzID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgYW5vbnltb3VzIHVzZXJzLiBNdXN0IHNldCBhbm9uUm9sZS5cbiAgICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS51c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0FjY2VzcyA9IGZvcm1BY2Nlc3NbZm9ybV1bcGVybWlzc2lvbl0uaW5kZXhPZihhbm9uUm9sZSkgIT09IC0xO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIHRoZSB1c2VyJ3Mgcm9sZXMgZm9yIGFjY2Vzcy5cbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyLnJvbGVzLmZvckVhY2goZnVuY3Rpb24ocm9sZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3JtQWNjZXNzW2Zvcm1dW3Blcm1pc3Npb25dLmluZGV4T2Yocm9sZSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNBY2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gaGFzQWNjZXNzO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QgYW5kIHJvbGUuXG4gICAgICAgICAgICAgICAgdmFyIHVzZXIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvQXBwVXNlcicpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihcbiAgICAgICAgICAgICAgICAgIHVzZXIgPyBhbmd1bGFyLmZyb21Kc29uKHVzZXIpIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9BcHBSb2xlJylcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLnVzZXIpIHtcbiAgICAgICAgICAgICAgICAgIEZvcm1pby5jdXJyZW50VXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKHVzZXIsIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Sb2xlJykpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGxvZ291dEVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgIEZvcm1pb0FsZXJ0cy5hZGRBbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91ciBzZXNzaW9uIGhhcyBleHBpcmVkLiBQbGVhc2UgbG9nIGluIGFnYWluLidcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgbG9nb3V0RXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB3aGVuIGEgbG9nb3V0IG9jY3Vycy5cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgIEZvcm1pby5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGxvZ291dEVycm9yKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHRoZXkgYXJlIGxvZ2dlZC5cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYXV0aGVudGljYXRlZCA9ICEhRm9ybWlvLmdldFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoZm9yY2VBdXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b1N0YXRlLm5hbWUuc3Vic3RyKDAsIDQpID09PSAnYXV0aCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLmF1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgYWxlcnRzXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmFsZXJ0cyA9IEZvcm1pb0FsZXJ0cy5nZXRBbGVydHMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG4gICAgfVxuICBdKVxuICAuZmFjdG9yeSgnRm9ybWlvQWxlcnRzJywgW1xuICAgICckcm9vdFNjb3BlJyxcbiAgICBmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuICAgICAgdmFyIGFsZXJ0cyA9IFtdO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYWRkQWxlcnQ6IGZ1bmN0aW9uIChhbGVydCkge1xuICAgICAgICAgICRyb290U2NvcGUuYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgIGlmIChhbGVydC5lbGVtZW50KSB7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJyNmb3JtLWdyb3VwLScgKyBhbGVydC5lbGVtZW50KS5hZGRDbGFzcygnaGFzLWVycm9yJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0QWxlcnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHRlbXBBbGVydHMgPSBhbmd1bGFyLmNvcHkoYWxlcnRzKTtcbiAgICAgICAgICBhbGVydHMubGVuZ3RoID0gMDtcbiAgICAgICAgICBhbGVydHMgPSBbXTtcbiAgICAgICAgICByZXR1cm4gdGVtcEFsZXJ0cztcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcjogZnVuY3Rpb24gc2hvd0Vycm9yKGVycm9yKSB7XG4gICAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQWxlcnQoe1xuICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgZWxlbWVudDogZXJyb3IucGF0aFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVycm9ycyA9IGVycm9yLmhhc093blByb3BlcnR5KCdlcnJvcnMnKSA/IGVycm9yLmVycm9ycyA6IGVycm9yLmRhdGEuZXJyb3JzO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGVycm9ycywgc2hvd0Vycm9yLmJpbmQodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pXG4gIC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJyRyb290U2NvcGUnLFxuICAgICckc3RhdGUnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSxcbiAgICAgICAgICAgICAgJHJvb3RTY29wZSxcbiAgICAgICAgICAgICAgJHN0YXRlKSB7XG4gICAgICAvLyBEZXRlcm1pbmUgdGhlIGFjdGl2ZSBzdGF0ZS5cbiAgICAgICRyb290U2NvcGUuaXNBY3RpdmUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuICRzdGF0ZS5jdXJyZW50Lm5hbWUuaW5kZXhPZihzdGF0ZSkgIT09IC0xO1xuICAgICAgfTtcblxuICAgICAgLyoqKiogUkVTT1VSQ0UgVEVNUExBVEVTICoqKioqKiovXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvcmVzb3VyY2UuaHRtbCcsXG4gICAgICAgIFwiPGgyPnt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIHwgY2FwaXRhbGl6ZSB9fTwvaDI+XFxuPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXRhYnNcXFwiPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLnZpZXcnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LnZpZXcoKVxcXCI+VmlldzwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmVkaXQnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LmVkaXQoKVxcXCI+RWRpdDwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmRlbGV0ZScpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgY3VycmVudFJlc291cmNlLm5hbWUgfX0uZGVsZXRlKClcXFwiPkRlbGV0ZTwvYT48L2xpPlxcbjwvdWw+XFxuPGRpdiB1aS12aWV3PjwvZGl2PlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvY3JlYXRlLmh0bWwnLFxuICAgICAgICBcIjxoMz5OZXcge3sgY3VycmVudFJlc291cmNlLm5hbWUgfCBjYXBpdGFsaXplIH19PC9oMz5cXG48aHI+PC9ocj5cXG48Zm9ybWlvIHNyYz1cXFwiY3VycmVudFJlc291cmNlLmZvcm1VcmxcXFwiIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiIGhpZGUtY29tcG9uZW50cz1cXFwiaGlkZUNvbXBvbmVudHNcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZGVsZXRlLmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tZGVsZXRlIHNyYz1cXFwiY3VycmVudFJlc291cmNlLnN1Ym1pc3Npb25VcmxcXFwiIHJlc291cmNlLW5hbWU9XFxcInJlc291cmNlTmFtZVxcXCI+PC9mb3JtaW8tZGVsZXRlPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZWRpdC5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvIHNyYz1cXFwiY3VycmVudFJlc291cmNlLnN1Ym1pc3Npb25VcmxcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvaW5kZXguaHRtbCcsXG4gICAgICAgIFwiPGZvcm1pby1ncmlkIHNyYz1cXFwiY3VycmVudFJlc291cmNlLmZvcm1VcmxcXFwiIGNvbHVtbnM9XFxcImN1cnJlbnRSZXNvdXJjZS5jb2x1bW5zXFxcIiBncmlkLW9wdGlvbnM9XFxcImN1cnJlbnRSZXNvdXJjZS5ncmlkT3B0aW9uc1xcXCI+PC9mb3JtaW8tZ3JpZD48YnIvPlxcbjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19Q3JlYXRlKClcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+IE5ldyB7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2E+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS92aWV3Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8gc3JjPVxcXCJjdXJyZW50UmVzb3VyY2Uuc3VibWlzc2lvblVybFxcXCIgcmVhZC1vbmx5PVxcXCJ0cnVlXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgLyoqKiogRk9STSBURU1QTEFURVMgKioqKioqKi9cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL2xpc3QuaHRtbCcsXG4gICAgICAgIFwiPHVsIGNsYXNzPVxcXCJsaXN0LWdyb3VwXFxcIj5cXG4gICAgPGxpIGNsYXNzPVxcXCJsaXN0LWdyb3VwLWl0ZW1cXFwiIG5nLXJlcGVhdD1cXFwiZm9ybSBpbiBmb3JtcyB8IG9yZGVyQnk6ICd0aXRsZSdcXFwiPjxhIHVpLXNyZWY9XFxcInt7IGJhc2UgfX1mb3JtLnZpZXcoe2Zvcm1JZDogZm9ybS5faWR9KVxcXCI+e3sgZm9ybS50aXRsZSB9fTwvYT48L2xpPlxcbjwvdWw+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL2luZGV4Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tZm9ybXMgc3JjPVxcXCJmb3Jtc1NyY1xcXCIgdGFnPVxcXCJmb3Jtc1RhZ1xcXCIgYmFzZT1cXFwiZm9ybUJhc2VcXFwiPjwvZm9ybWlvLWZvcm1zPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvZm9ybS9mb3JtLmh0bWwnLFxuICAgICAgICBcIjx1bCBjbGFzcz1cXFwibmF2IG5hdi10YWJzXFxcIj5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS52aWV3Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0udmlldygpXFxcIj5Gb3JtPC9hPjwvbGk+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbnMnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9ucygpXFxcIj5TdWJtaXNzaW9uczwvYT48L2xpPlxcbjwvdWw+XFxuPGRpdiB1aS12aWV3IHN0eWxlPVxcXCJtYXJnaW4tdG9wOjIwcHg7XFxcIj48L2Rpdj5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vdmlldy5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvIGZvcm09XFxcImN1cnJlbnRGb3JtLmZvcm1cXFwiIGZvcm0tYWN0aW9uPVxcXCJjdXJyZW50Rm9ybS51cmwgKyAnL3N1Ym1pc3Npb24nXFxcIiBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgLyoqKiogU1VCTUlTU0lPTiBURU1QTEFURVMgKioqKioqKi9cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2luZGV4Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tZ3JpZCBzcmM9XFxcImN1cnJlbnRGb3JtLnVybFxcXCIgcXVlcnk9XFxcInN1Ym1pc3Npb25RdWVyeVxcXCIgY29sdW1ucz1cXFwic3VibWlzc2lvbkNvbHVtbnNcXFwiPjwvZm9ybWlvLWdyaWQ+XFxuXFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL3N1Ym1pc3Npb24uaHRtbCcsXG4gICAgICAgIFwiPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXBpbGxzXFxcIj5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9uLnZpZXcoKVxcXCI+VmlldzwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb24uZWRpdCcpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnN1Ym1pc3Npb24uZWRpdCgpXFxcIj5FZGl0PC9hPjwvbGk+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbi5kZWxldGUnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9uLmRlbGV0ZSgpXFxcIj5EZWxldGU8L2E+PC9saT5cXG48L3VsPlxcbjxkaXYgdWktdmlldyBzdHlsZT1cXFwibWFyZ2luLXRvcDoyMHB4O1xcXCI+PC9kaXY+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL3ZpZXcuaHRtbCcsXG4gICAgICAgIFwiPGZvcm1pbyBmb3JtPVxcXCJjdXJyZW50Rm9ybS5mb3JtXFxcIiBzdWJtaXNzaW9uPVxcXCJjdXJyZW50U3VibWlzc2lvbi5zdWJtaXNzaW9uXFxcIiByZWFkLW9ubHk9XFxcInRydWVcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9lZGl0Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8gZm9ybT1cXFwiY3VycmVudEZvcm0uZm9ybVxcXCIgc3VibWlzc2lvbj1cXFwiY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvblxcXCIgZm9ybS1hY3Rpb249XFxcImN1cnJlbnRTdWJtaXNzaW9uLnVybFxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvLWRlbGV0ZSBzcmM9XFxcImN1cnJlbnRTdWJtaXNzaW9uLnVybFxcXCI+PC9mb3JtaW8tZGVsZXRlPlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7Il19
