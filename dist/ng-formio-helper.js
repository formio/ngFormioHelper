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
                  var handle = false;
                  if (options.field) {
                    $scope.currentForm.promise.then(function () {
                      $scope.currentResource.loadSubmissionPromise.then(function (resource) {
                        $scope.submission.data[options.field] = resource;
                        FormioUtils.hideFields($scope.currentForm.form, [options.field]);
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
  ])
  .provider('FormioAuth', [
    '$stateProvider',
    function ($stateProvider) {
      var anonState = 'auth.login';
      var authState = 'home';
      var forceAuth = false;
      var registered = false;
      return {
        setForceAuth: function (force) {
          forceAuth = force;
        },
        setStates: function (anon, auth) {
          anonState = anon;
          authState = auth;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbmctZm9ybWlvLWhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5hbmd1bGFyLm1vZHVsZSgnbmdGb3JtaW9IZWxwZXInLCBbJ2Zvcm1pbycsICduZ0Zvcm1pb0dyaWQnLCAndWkucm91dGVyJ10pXG4gIC5maWx0ZXIoJ2NhcGl0YWxpemUnLCBbZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfLmNhcGl0YWxpemU7XG4gIH1dKVxuICAuZmlsdGVyKCd0cnVuY2F0ZScsIFtmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChpbnB1dCwgb3B0cykge1xuICAgICAgaWYgKF8uaXNOdW1iZXIob3B0cykpIHtcbiAgICAgICAgb3B0cyA9IHtsZW5ndGg6IG9wdHN9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIF8udHJ1bmNhdGUoaW5wdXQsIG9wdHMpO1xuICAgIH07XG4gIH1dKVxuICAuZGlyZWN0aXZlKFwiZmlsZXJlYWRcIiwgW1xuICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgZmlsZXJlYWQ6IFwiPVwiXG4gICAgICAgIH0sXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuICAgICAgICAgIGVsZW1lbnQuYmluZChcImNoYW5nZVwiLCBmdW5jdGlvbiAoY2hhbmdlRXZlbnQpIHtcbiAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uIChsb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS5maWxlcmVhZCA9IGpRdWVyeShsb2FkRXZlbnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGNoYW5nZUV2ZW50LnRhcmdldC5maWxlc1swXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICBdKVxuICAucHJvdmlkZXIoJ0Zvcm1pb1Jlc291cmNlJywgW1xuICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICByZXR1cm4ge1xuICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24gKG5hbWUsIHVybCwgb3B0aW9ucykge1xuICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgIHJlc291cmNlc1tuYW1lXSA9IG9wdGlvbnMudGl0bGUgfHwgbmFtZTtcbiAgICAgICAgICB2YXIgcGFyZW50ID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5wYXJlbnQpID8gb3B0aW9ucy5wYXJlbnQgOiBudWxsO1xuICAgICAgICAgIHZhciBxdWVyeUlkID0gbmFtZSArICdJZCc7XG4gICAgICAgICAgdmFyIHF1ZXJ5ID0gZnVuY3Rpb24gKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgICAgICAgcXVlcnlbcXVlcnlJZF0gPSBzdWJtaXNzaW9uLl9pZDtcbiAgICAgICAgICAgIHJldHVybiBxdWVyeTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdmFyIHRlbXBsYXRlcyA9IChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGVzKSA/IG9wdGlvbnMudGVtcGxhdGVzIDoge307XG4gICAgICAgICAgdmFyIGNvbnRyb2xsZXJzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5jb250cm9sbGVycykgPyBvcHRpb25zLmNvbnRyb2xsZXJzIDoge307XG4gICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0gb3B0aW9ucy5xdWVyeSA/IG9wdGlvbnMucXVlcnkgOiAnJztcbiAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnSW5kZXgnLCB7XG4gICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArIHF1ZXJ5UGFyYW1zLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuaW5kZXgsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuaW5kZXggPyB0ZW1wbGF0ZXMuaW5kZXggOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlJZDogcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybVVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgZ3JpZE9wdGlvbnM6IHt9XG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbigncm93VmlldycsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvblZpZXcnLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLnZpZXcnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvbkVkaXQnLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLmVkaXQnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvbkRlbGV0ZScsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcuZGVsZXRlJywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuaW5kZXgsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJ0NyZWF0ZScsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2NyZWF0ZS8nICsgbmFtZSArIHF1ZXJ5UGFyYW1zLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuY3JlYXRlLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmNyZWF0ZSA/IHRlbXBsYXRlcy5jcmVhdGUgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9jcmVhdGUuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gb3B0aW9ucy5kZWZhdWx0VmFsdWUgPyBvcHRpb25zLmRlZmF1bHRWYWx1ZSA6IHtkYXRhOiB7fX07XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuY3JlYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuY3JlYXRlLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlID0gKGN0cmwuaGFuZGxlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaGlkZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZUNvbXBvbmVudHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuaGlkZUNvbXBvbmVudHMucHVzaChwYXJlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEF1dG8gcG9wdWxhdGUgdGhlIHBhcmVudCBlbnRpdHkgd2l0aCB0aGUgbmV3IGRhdGEuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZVtwYXJlbnRdLmxvYWRTdWJtaXNzaW9uUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChlbnRpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbi5kYXRhW3BhcmVudF0gPSBlbnRpdHk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKG5hbWUsIHtcbiAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArICcvOicgKyBxdWVyeUlkLFxuICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuYWJzdHJhY3QgPyB0ZW1wbGF0ZXMuYWJzdHJhY3QgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9yZXNvdXJjZS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgJyRodHRwJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRodHRwKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvblVybCA9IHVybDtcbiAgICAgICAgICAgICAgICAgIHZhciBlbmRwb2ludCA9IG9wdGlvbnMuZW5kcG9pbnQ7XG4gICAgICAgICAgICAgICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQgKz0gJy8nICsgJHN0YXRlUGFyYW1zW3F1ZXJ5SWRdO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25VcmwgKz0gJy9zdWJtaXNzaW9uLycgKyAkc3RhdGVQYXJhbXNbcXVlcnlJZF07XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSAkc2NvcGVbbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvblVybDogc3VibWlzc2lvblVybCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWlvOiAobmV3IEZvcm1pbyhzdWJtaXNzaW9uVXJsKSksXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgZm9ybToge30sXG4gICAgICAgICAgICAgICAgICAgIGhyZWY6ICcvIy8nICsgbmFtZSArICcvJyArICRzdGF0ZVBhcmFtc1txdWVyeUlkXSArICcvJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnQgPyAkc2NvcGVbcGFyZW50XSA6IHtocmVmOiAnLyMvJywgbmFtZTogJ2hvbWUnfVxuICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkRm9ybVByb21pc2UgPSAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm1pby5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5mb3JtID0gJHNjb3BlW25hbWVdLmZvcm0gPSBmb3JtO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAvLyBJZiB0aGV5IHByb3ZpZGUgdGhlaXIgb3duIGVuZHBvaW50IGZvciBkYXRhLlxuICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkU3VibWlzc2lvblByb21pc2UgPSAkaHR0cC5nZXQoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAneC1qd3QtdG9rZW4nOiBGb3JtaW8uZ2V0VG9rZW4oKVxuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5yZXNvdXJjZSA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkU3VibWlzc2lvblByb21pc2UgPSAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm1pby5sb2FkU3VibWlzc2lvbigpLnRoZW4oZnVuY3Rpb24gKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLnJlc291cmNlID0gJHNjb3BlW25hbWVdLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmFic3RyYWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmFic3RyYWN0LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUobmFtZSArICcudmlldycsIHtcbiAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy52aWV3LFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnZpZXcgPyB0ZW1wbGF0ZXMudmlldyA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMudmlldykge1xuICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy52aWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUobmFtZSArICcuZWRpdCcsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2VkaXQnLFxuICAgICAgICAgICAgICBwYXJlbnQ6IG5hbWUsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuZWRpdCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5lZGl0ID8gdGVtcGxhdGVzLmVkaXQgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZWRpdCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmVkaXQsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLmRlbGV0ZScsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2RlbGV0ZScsXG4gICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5kZWxldGUsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuZGVsZXRlID8gdGVtcGxhdGVzLmRlbGV0ZSA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc291cmNlTmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuZGVsZXRlLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlID0gKGN0cmwuaGFuZGxlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2RlbGV0ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudCAhPT0gJ2hvbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28ocGFyZW50ICsgJy52aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJywgbnVsbCwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICdJbmRleCcpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICAkZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc291cmNlcztcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pXG4gIC5kaXJlY3RpdmUoJ2Zvcm1pb0Zvcm1zJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHNyYzogJz0nLFxuICAgICAgICBiYXNlOiAnPScsXG4gICAgICAgIHRhZzogJz0/J1xuICAgICAgfSxcbiAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvLWhlbHBlci9mb3JtL2xpc3QuaHRtbCcsXG4gICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICdGb3JtaW8nLCBmdW5jdGlvbiAoJHNjb3BlLCBGb3JtaW8pIHtcbiAgICAgICAgJHNjb3BlLmZvcm1zID0gW107XG4gICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgdHlwZTogJ2Zvcm0nLFxuICAgICAgICAgIGxpbWl0OiA5OTk5OTk5XG4gICAgICAgIH07XG4gICAgICAgIGlmICgkc2NvcGUudGFnKSB7XG4gICAgICAgICAgcGFyYW1zLnRhZ3MgPSAkc2NvcGUudGFnO1xuICAgICAgICB9XG4gICAgICAgIChuZXcgRm9ybWlvKCRzY29wZS5zcmMpKS5sb2FkRm9ybXMoe3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbiAoZm9ybXMpIHtcbiAgICAgICAgICAkc2NvcGUuZm9ybXMgPSBmb3JtcztcbiAgICAgICAgfSk7XG4gICAgICB9XVxuICAgIH07XG4gIH0pXG4gIC5wcm92aWRlcignRm9ybWlvRm9ybXMnLCBbXG4gICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAobmFtZSwgdXJsLCBvcHRpb25zKSB7XG4gICAgICAgICAgdmFyIHRlbXBsYXRlcyA9IChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGVzKSA/IG9wdGlvbnMudGVtcGxhdGVzIDoge307XG4gICAgICAgICAgdmFyIGNvbnRyb2xsZXJzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5jb250cm9sbGVycykgPyBvcHRpb25zLmNvbnRyb2xsZXJzIDoge307XG4gICAgICAgICAgdmFyIGJhc2VQYXRoID0gbmFtZSA/IG5hbWUgKyAnLicgOiAnJztcbiAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm1JbmRleCcsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2Zvcm1zJyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5pbmRleCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5pbmRleCA/IHRlbXBsYXRlcy5pbmRleCA6ICdmb3JtaW8taGVscGVyL2Zvcm0vaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJ0Zvcm1pbycsICckY29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZvcm1pbywgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybUJhc2UgPSBiYXNlUGF0aDtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybXNTcmMgPSB1cmwgKyAnL2Zvcm0nO1xuICAgICAgICAgICAgICAgICRzY29wZS5mb3Jtc1RhZyA9IG9wdGlvbnMudGFnO1xuICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5pbmRleCkge1xuICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuaW5kZXgsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybScsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2Zvcm0vOmZvcm1JZCcsXG4gICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmZvcm0gPyB0ZW1wbGF0ZXMuZm9ybSA6ICdmb3JtaW8taGVscGVyL2Zvcm0vZm9ybS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgZm9ybVVybCA9IHVybCArICcvZm9ybS8nICsgJHN0YXRlUGFyYW1zLmZvcm1JZDtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtQmFzZSA9IGJhc2VQYXRoO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGZvcm1VcmwsXG4gICAgICAgICAgICAgICAgICAgIGZvcm06IHt9XG4gICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0uZm9ybWlvID0gKG5ldyBGb3JtaW8oZm9ybVVybCkpO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLnByb21pc2UgPSAkc2NvcGUuY3VycmVudEZvcm0uZm9ybWlvLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0uZm9ybSA9IGZvcm07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtO1xuICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5mb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmZvcm0sIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnZpZXcnLCB7XG4gICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnZpZXcsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMudmlldyA/IHRlbXBsYXRlcy52aWV3IDogJ2Zvcm1pby1oZWxwZXIvZm9ybS92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA9IHtkYXRhOiB7fX07XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0ucHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZS50aGVuKGZ1bmN0aW9uIChyZXNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24uZGF0YVtvcHRpb25zLmZpZWxkXSA9IHJlc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMuaGlkZUZpZWxkcygkc2NvcGUuY3VycmVudEZvcm0uZm9ybSwgW29wdGlvbnMuZmllbGRdKTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMudmlldykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnZpZXcsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnLCB7XG4gICAgICAgICAgICAgIHVybDogJy9zdWJtaXNzaW9ucycsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvbnMsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbnMgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbnMgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uUXVlcnkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uQ29sdW1ucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZmllbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25RdWVyeVsnZGF0YS4nICsgb3B0aW9ucy5maWVsZCArICcuX2lkJ10gPSAkc3RhdGVQYXJhbXNbbmFtZSArICdJZCddO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgc3VibWlzc2lvbiB3aGVuIHRoZXkgY2xpY2sgb24gdGhlIHJvdy5cbiAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3Jvd1ZpZXcnLCBmdW5jdGlvbiAoZXZlbnQsIGVudGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgZm9ybUlkOiBlbnRpdHkuZm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uSWQ6IGVudGl0eS5faWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgLy8gV2FpdCB1bnRpbCB0aGUgY3VycmVudCBmb3JtIGlzIGxvYWRlZC5cbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5wcm9taXNlLnRoZW4oZnVuY3Rpb24gKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudChmb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5rZXkgfHwgIWNvbXBvbmVudC5pbnB1dCB8fCAhY29tcG9uZW50LnRhYmxlVmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCAmJiAoY29tcG9uZW50LmtleSA9PT0gb3B0aW9ucy5maWVsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25Db2x1bW5zLnB1c2goY29tcG9uZW50LmtleSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSByZWxvYWQgdGhlIGRhdGEgZ3JpZC5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3JlbG9hZEdyaWQnKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbnMsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24nLCB7XG4gICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICB1cmw6ICcvc3VibWlzc2lvbi86c3VibWlzc2lvbklkJyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb24gPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbiA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vc3VibWlzc2lvbi5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24gPSB7XG4gICAgICAgICAgICAgICAgICAgIHVybDogJHNjb3BlLmN1cnJlbnRGb3JtLnVybCArICcvc3VibWlzc2lvbi8nICsgJHN0YXRlUGFyYW1zLnN1Ym1pc3Npb25JZCxcbiAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbjoge1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHt9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBmb3JtaW8gb2JqZWN0LlxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLmZvcm1pbyA9IChuZXcgRm9ybWlvKCRzY29wZS5jdXJyZW50U3VibWlzc2lvbi51cmwpKTtcblxuICAgICAgICAgICAgICAgICAgLy8gTG9hZCB0aGUgY3VycmVudCBzdWJtaXNzaW9uLlxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnByb21pc2UgPSAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uZm9ybWlvLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbiAoc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvbiA9IHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNvbnRyb2xsZXIuXG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9uLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnLCB7XG4gICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25WaWV3LFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25WaWV3ID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25WaWV3IDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25WaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25WaWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLmVkaXQnLCB7XG4gICAgICAgICAgICAgIHVybDogJy9lZGl0JyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uRWRpdCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9uRWRpdCA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uRWRpdCA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25FZGl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbkVkaXQsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvbiA9IHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24uZGVsZXRlJywge1xuICAgICAgICAgICAgICB1cmw6ICcvZGVsZXRlJyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uRGVsZXRlLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25EZWxldGUgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbkRlbGV0ZSA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZGVsZXRlLmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbkRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25EZWxldGUsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZGVsZXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb25zJyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2NhbmNlbCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgICAkZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc291cmNlcztcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pXG4gIC5wcm92aWRlcignRm9ybWlvQXV0aCcsIFtcbiAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICAgdmFyIGFub25TdGF0ZSA9ICdhdXRoLmxvZ2luJztcbiAgICAgIHZhciBhdXRoU3RhdGUgPSAnaG9tZSc7XG4gICAgICB2YXIgZm9yY2VBdXRoID0gZmFsc2U7XG4gICAgICB2YXIgcmVnaXN0ZXJlZCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2V0Rm9yY2VBdXRoOiBmdW5jdGlvbiAoZm9yY2UpIHtcbiAgICAgICAgICBmb3JjZUF1dGggPSBmb3JjZTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0U3RhdGVzOiBmdW5jdGlvbiAoYW5vbiwgYXV0aCkge1xuICAgICAgICAgIGFub25TdGF0ZSA9IGFub247XG4gICAgICAgICAgYXV0aFN0YXRlID0gYXV0aDtcbiAgICAgICAgfSxcbiAgICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChuYW1lLCByZXNvdXJjZSwgcGF0aCkge1xuICAgICAgICAgIGlmICghcmVnaXN0ZXJlZCkge1xuICAgICAgICAgICAgcmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYXV0aCcsIHtcbiAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgIHVybDogJy9hdXRoJyxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICd2aWV3cy91c2VyL2F1dGguaHRtbCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghcGF0aCkge1xuICAgICAgICAgICAgcGF0aCA9IG5hbWU7XG4gICAgICAgICAgfVxuICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUoJ2F1dGguJyArIG5hbWUsIHtcbiAgICAgICAgICAgICAgdXJsOiAnLycgKyBwYXRoLFxuICAgICAgICAgICAgICBwYXJlbnQ6ICdhdXRoJyxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICd2aWV3cy91c2VyLycgKyBuYW1lLnRvTG93ZXJDYXNlKCkgKyAnLmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckc3RhdGUnLCAnJHJvb3RTY29wZScsIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZSwgJHJvb3RTY29wZSkge1xuICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24gKGVyciwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgaWYgKCFzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihzdWJtaXNzaW9uLCByZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYXV0aFN0YXRlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG4gICAgICAgICRnZXQ6IFtcbiAgICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgICAnRm9ybWlvQWxlcnRzJyxcbiAgICAgICAgICAnJHJvb3RTY29wZScsXG4gICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgZnVuY3Rpb24gKEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgRm9ybWlvQWxlcnRzLFxuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAkc3RhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSB7fTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmlzUm9sZSA9IGZ1bmN0aW9uIChyb2xlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5yb2xlID09PSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIgPSBmdW5jdGlvbiAodXNlciwgcm9sZSkge1xuICAgICAgICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb0FwcFVzZXInLCBhbmd1bGFyLnRvSnNvbih1c2VyKSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb0FwcFVzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1VzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1Rva2VuJyk7XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIGlmICghcm9sZSkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvQXBwUm9sZScpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUucm9sZSA9IHJvbGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb0FwcFJvbGUnLCByb2xlKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hdXRoZW50aWNhdGVkID0gISFGb3JtaW8uZ2V0VG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3VzZXInLCB7XG4gICAgICAgICAgICAgICAgICAgIHVzZXI6ICRyb290U2NvcGUudXNlcixcbiAgICAgICAgICAgICAgICAgICAgcm9sZTogJHJvb3RTY29wZS5yb2xlXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBjdXJyZW50IHVzZXIgb2JqZWN0IGFuZCByb2xlLlxuICAgICAgICAgICAgICAgIHZhciB1c2VyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb0FwcFVzZXInKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIoXG4gICAgICAgICAgICAgICAgICB1c2VyID8gYW5ndWxhci5mcm9tSnNvbih1c2VyKSA6IG51bGwsXG4gICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvQXBwUm9sZScpXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS51c2VyKSB7XG4gICAgICAgICAgICAgICAgICBGb3JtaW8uY3VycmVudFVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcih1c2VyLCBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvUm9sZScpKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBsb2dvdXRFcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICBGb3JtaW9BbGVydHMuYWRkQWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdXIgc2Vzc2lvbiBoYXMgZXhwaXJlZC4gUGxlYXNlIGxvZyBpbiBhZ2Fpbi4nXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2Zvcm1pby5zZXNzaW9uRXhwaXJlZCcsIGxvZ291dEVycm9yKTtcblxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgd2hlbiBhIGxvZ291dCBvY2N1cnMuXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIobnVsbCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICBGb3JtaW8ubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICB9KS5jYXRjaChsb2dvdXRFcnJvcik7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB0aGV5IGFyZSBsb2dnZWQuXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmF1dGhlbnRpY2F0ZWQgPSAhIUZvcm1pby5nZXRUb2tlbigpO1xuICAgICAgICAgICAgICAgICAgaWYgKGZvcmNlQXV0aCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9TdGF0ZS5uYW1lLnN1YnN0cigwLCA0KSA9PT0gJ2F1dGgnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS5hdXRoZW50aWNhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYW5vblN0YXRlLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGFsZXJ0c1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hbGVydHMgPSBGb3JtaW9BbGVydHMuZ2V0QWxlcnRzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9O1xuICAgIH1cbiAgXSlcbiAgLmZhY3RvcnkoJ0Zvcm1pb0FsZXJ0cycsIFtcbiAgICAnJHJvb3RTY29wZScsXG4gICAgZnVuY3Rpb24gKCRyb290U2NvcGUpIHtcbiAgICAgIHZhciBhbGVydHMgPSBbXTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFkZEFsZXJ0OiBmdW5jdGlvbiAoYWxlcnQpIHtcbiAgICAgICAgICAkcm9vdFNjb3BlLmFsZXJ0cy5wdXNoKGFsZXJ0KTtcbiAgICAgICAgICBpZiAoYWxlcnQuZWxlbWVudCkge1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KCcjZm9ybS1ncm91cC0nICsgYWxlcnQuZWxlbWVudCkuYWRkQ2xhc3MoJ2hhcy1lcnJvcicpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFsZXJ0cy5wdXNoKGFsZXJ0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldEFsZXJ0czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciB0ZW1wQWxlcnRzID0gYW5ndWxhci5jb3B5KGFsZXJ0cyk7XG4gICAgICAgICAgYWxlcnRzLmxlbmd0aCA9IDA7XG4gICAgICAgICAgYWxlcnRzID0gW107XG4gICAgICAgICAgcmV0dXJuIHRlbXBBbGVydHM7XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uIHNob3dFcnJvcihlcnJvcikge1xuICAgICAgICAgIGlmIChlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICB0aGlzLmFkZEFsZXJ0KHtcbiAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIGVsZW1lbnQ6IGVycm9yLnBhdGhcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBlcnJvcnMgPSBlcnJvci5oYXNPd25Qcm9wZXJ0eSgnZXJyb3JzJykgPyBlcnJvci5lcnJvcnMgOiBlcnJvci5kYXRhLmVycm9ycztcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChlcnJvcnMsIHNob3dFcnJvci5iaW5kKHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICBdKVxuICAucnVuKFtcbiAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICckcm9vdFNjb3BlJyxcbiAgICAnJHN0YXRlJyxcbiAgICBmdW5jdGlvbiAoJHRlbXBsYXRlQ2FjaGUsXG4gICAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAgICRzdGF0ZSkge1xuICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBhY3RpdmUgc3RhdGUuXG4gICAgICAkcm9vdFNjb3BlLmlzQWN0aXZlID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiAkc3RhdGUuY3VycmVudC5uYW1lLmluZGV4T2Yoc3RhdGUpICE9PSAtMTtcbiAgICAgIH07XG5cbiAgICAgIC8qKioqIFJFU09VUkNFIFRFTVBMQVRFUyAqKioqKioqL1xuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICBcIjxoMj57eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2gyPlxcbjx1bCBjbGFzcz1cXFwibmF2IG5hdi10YWJzXFxcIj5cXG4gIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGN1cnJlbnRSZXNvdXJjZS5uYW1lICsgJy52aWV3Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fS52aWV3KClcXFwiPlZpZXc8L2E+PC9saT5cXG4gIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGN1cnJlbnRSZXNvdXJjZS5uYW1lICsgJy5lZGl0Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fS5lZGl0KClcXFwiPkVkaXQ8L2E+PC9saT5cXG4gIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGN1cnJlbnRSZXNvdXJjZS5uYW1lICsgJy5kZWxldGUnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LmRlbGV0ZSgpXFxcIj5EZWxldGU8L2E+PC9saT5cXG48L3VsPlxcbjxkaXYgdWktdmlldz48L2Rpdj5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2NyZWF0ZS5odG1sJyxcbiAgICAgICAgXCI8aDM+TmV3IHt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIHwgY2FwaXRhbGl6ZSB9fTwvaDM+XFxuPGhyPjwvaHI+XFxuPGZvcm1pbyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5mb3JtVXJsXFxcIiBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIiBoaWRlLWNvbXBvbmVudHM9XFxcImhpZGVDb21wb25lbnRzXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvLWRlbGV0ZSBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIiByZXNvdXJjZS1uYW1lPVxcXCJyZXNvdXJjZU5hbWVcXFwiPjwvZm9ybWlvLWRlbGV0ZT5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2VkaXQuaHRtbCcsXG4gICAgICAgIFwiPGZvcm1pbyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2luZGV4Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tZ3JpZCBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5mb3JtVXJsXFxcIiBjb2x1bW5zPVxcXCJjdXJyZW50UmVzb3VyY2UuY29sdW1uc1xcXCIgZ3JpZC1vcHRpb25zPVxcXCJjdXJyZW50UmVzb3VyY2UuZ3JpZE9wdGlvbnNcXFwiPjwvZm9ybWlvLWdyaWQ+PGJyLz5cXG48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fUNyZWF0ZSgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPiBOZXcge3sgY3VycmVudFJlc291cmNlLm5hbWUgfCBjYXBpdGFsaXplIH19PC9hPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2Uvdmlldy5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvIHNyYz1cXFwiY3VycmVudFJlc291cmNlLnN1Ym1pc3Npb25VcmxcXFwiIHJlYWQtb25seT1cXFwidHJ1ZVxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgIC8qKioqIEZPUk0gVEVNUExBVEVTICoqKioqKiovXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvZm9ybS9saXN0Lmh0bWwnLFxuICAgICAgICBcIjx1bCBjbGFzcz1cXFwibGlzdC1ncm91cFxcXCI+XFxuICAgIDxsaSBjbGFzcz1cXFwibGlzdC1ncm91cC1pdGVtXFxcIiBuZy1yZXBlYXQ9XFxcImZvcm0gaW4gZm9ybXMgfCBvcmRlckJ5OiAndGl0bGUnXFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBiYXNlIH19Zm9ybS52aWV3KHtmb3JtSWQ6IGZvcm0uX2lkfSlcXFwiPnt7IGZvcm0udGl0bGUgfX08L2E+PC9saT5cXG48L3VsPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvZm9ybS9pbmRleC5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvLWZvcm1zIHNyYz1cXFwiZm9ybXNTcmNcXFwiIHRhZz1cXFwiZm9ybXNUYWdcXFwiIGJhc2U9XFxcImZvcm1CYXNlXFxcIj48L2Zvcm1pby1mb3Jtcz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vZm9ybS5odG1sJyxcbiAgICAgICAgXCI8dWwgY2xhc3M9XFxcIm5hdiBuYXYtdGFic1xcXCI+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0udmlldycpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnZpZXcoKVxcXCI+Rm9ybTwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb25zJyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbnMoKVxcXCI+U3VibWlzc2lvbnM8L2E+PC9saT5cXG48L3VsPlxcbjxkaXYgdWktdmlldyBzdHlsZT1cXFwibWFyZ2luLXRvcDoyMHB4O1xcXCI+PC9kaXY+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL3ZpZXcuaHRtbCcsXG4gICAgICAgIFwiPGZvcm1pbyBmb3JtPVxcXCJjdXJyZW50Rm9ybS5mb3JtXFxcIiBmb3JtLWFjdGlvbj1cXFwiY3VycmVudEZvcm0udXJsICsgJy9zdWJtaXNzaW9uJ1xcXCIgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgIC8qKioqIFNVQk1JU1NJT04gVEVNUExBVEVTICoqKioqKiovXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9pbmRleC5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvLWdyaWQgc3JjPVxcXCJjdXJyZW50Rm9ybS51cmxcXFwiIHF1ZXJ5PVxcXCJzdWJtaXNzaW9uUXVlcnlcXFwiIGNvbHVtbnM9XFxcInN1Ym1pc3Npb25Db2x1bW5zXFxcIj48L2Zvcm1pby1ncmlkPlxcblxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9zdWJtaXNzaW9uLmh0bWwnLFxuICAgICAgICBcIjx1bCBjbGFzcz1cXFwibmF2IG5hdi1waWxsc1xcXCI+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbi52aWV3KClcXFwiPlZpZXc8L2E+PC9saT5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS5zdWJtaXNzaW9uLmVkaXQnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9uLmVkaXQoKVxcXCI+RWRpdDwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb24uZGVsZXRlJyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbi5kZWxldGUoKVxcXCI+RGVsZXRlPC9hPjwvbGk+XFxuPC91bD5cXG48ZGl2IHVpLXZpZXcgc3R5bGU9XFxcIm1hcmdpbi10b3A6MjBweDtcXFwiPjwvZGl2PlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi92aWV3Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8gZm9ybT1cXFwiY3VycmVudEZvcm0uZm9ybVxcXCIgc3VibWlzc2lvbj1cXFwiY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvblxcXCIgcmVhZC1vbmx5PVxcXCJ0cnVlXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZWRpdC5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvIGZvcm09XFxcImN1cnJlbnRGb3JtLmZvcm1cXFwiIHN1Ym1pc3Npb249XFxcImN1cnJlbnRTdWJtaXNzaW9uLnN1Ym1pc3Npb25cXFwiIGZvcm0tYWN0aW9uPVxcXCJjdXJyZW50U3VibWlzc2lvbi51cmxcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9kZWxldGUuaHRtbCcsXG4gICAgICAgIFwiPGZvcm1pby1kZWxldGUgc3JjPVxcXCJjdXJyZW50U3VibWlzc2lvbi51cmxcXFwiPjwvZm9ybWlvLWRlbGV0ZT5cXG5cIlxuICAgICAgKTtcbiAgICB9XG4gIF0pOyJdfQ==
