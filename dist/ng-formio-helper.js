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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbmctZm9ybWlvLWhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmFuZ3VsYXIubW9kdWxlKCduZ0Zvcm1pb0hlbHBlcicsIFsnZm9ybWlvJywgJ25nRm9ybWlvR3JpZCcsICd1aS5yb3V0ZXInXSlcbiAgLmZpbHRlcignY2FwaXRhbGl6ZScsIFtmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF8uY2FwaXRhbGl6ZTtcbiAgfV0pXG4gIC5maWx0ZXIoJ3RydW5jYXRlJywgW2Z1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGlucHV0LCBvcHRzKSB7XG4gICAgICBpZiAoXy5pc051bWJlcihvcHRzKSkge1xuICAgICAgICBvcHRzID0ge2xlbmd0aDogb3B0c307XG4gICAgICB9XG4gICAgICByZXR1cm4gXy50cnVuY2F0ZShpbnB1dCwgb3B0cyk7XG4gICAgfTtcbiAgfV0pXG4gIC5kaXJlY3RpdmUoXCJmaWxlcmVhZFwiLCBbXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICBmaWxlcmVhZDogXCI9XCJcbiAgICAgICAgfSxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgICAgZWxlbWVudC5iaW5kKFwiY2hhbmdlXCIsIGZ1bmN0aW9uIChjaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24gKGxvYWRFdmVudCkge1xuICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLmZpbGVyZWFkID0galF1ZXJ5KGxvYWRFdmVudC50YXJnZXQucmVzdWx0KTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoY2hhbmdlRXZlbnQudGFyZ2V0LmZpbGVzWzBdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pXG4gIC5wcm92aWRlcignRm9ybWlvUmVzb3VyY2UnLCBbXG4gICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICBmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbiAobmFtZSwgdXJsLCBvcHRpb25zKSB7XG4gICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgcmVzb3VyY2VzW25hbWVdID0gb3B0aW9ucy50aXRsZSB8fCBuYW1lO1xuICAgICAgICAgIHZhciBwYXJlbnQgPSAob3B0aW9ucyAmJiBvcHRpb25zLnBhcmVudCkgPyBvcHRpb25zLnBhcmVudCA6IG51bGw7XG4gICAgICAgICAgdmFyIHF1ZXJ5SWQgPSBuYW1lICsgJ0lkJztcbiAgICAgICAgICB2YXIgcXVlcnkgPSBmdW5jdGlvbiAoc3VibWlzc2lvbikge1xuICAgICAgICAgICAgdmFyIHF1ZXJ5ID0ge307XG4gICAgICAgICAgICBxdWVyeVtxdWVyeUlkXSA9IHN1Ym1pc3Npb24uX2lkO1xuICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICB2YXIgdGVtcGxhdGVzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy50ZW1wbGF0ZXMpID8gb3B0aW9ucy50ZW1wbGF0ZXMgOiB7fTtcbiAgICAgICAgICB2YXIgY29udHJvbGxlcnMgPSAob3B0aW9ucyAmJiBvcHRpb25zLmNvbnRyb2xsZXJzKSA/IG9wdGlvbnMuY29udHJvbGxlcnMgOiB7fTtcbiAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSBvcHRpb25zLnF1ZXJ5ID8gb3B0aW9ucy5xdWVyeSA6ICcnO1xuICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUobmFtZSArICdJbmRleCcsIHtcbiAgICAgICAgICAgICAgdXJsOiAnLycgKyBuYW1lICsgcXVlcnlQYXJhbXMsXG4gICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5pbmRleCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5pbmRleCA/IHRlbXBsYXRlcy5pbmRleCA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICBxdWVyeUlkOiBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICBmb3JtVXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgIGNvbHVtbnM6IFtdLFxuICAgICAgICAgICAgICAgICAgICBncmlkT3B0aW9uczoge31cbiAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdyb3dWaWV3JywgZnVuY3Rpb24gKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhuYW1lICsgJy52aWV3JywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXNzaW9uVmlldycsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXNzaW9uRWRpdCcsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcuZWRpdCcsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXNzaW9uRGVsZXRlJywgZnVuY3Rpb24gKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhuYW1lICsgJy5kZWxldGUnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5pbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5pbmRleCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnQ3JlYXRlJywge1xuICAgICAgICAgICAgICB1cmw6ICcvY3JlYXRlLycgKyBuYW1lICsgcXVlcnlQYXJhbXMsXG4gICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5jcmVhdGUsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuY3JlYXRlID8gdGVtcGxhdGVzLmNyZWF0ZSA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2NyZWF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlJZDogcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybVVybDogdXJsXG4gICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24gPSBvcHRpb25zLmRlZmF1bHRWYWx1ZSA/IG9wdGlvbnMuZGVmYXVsdFZhbHVlIDoge2RhdGE6IHt9fTtcbiAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5jcmVhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN0cmwgPSAkY29udHJvbGxlcihjb250cm9sbGVycy5jcmVhdGUsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoISRzY29wZS5oaWRlQ29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5oaWRlQ29tcG9uZW50cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5oaWRlQ29tcG9uZW50cy5wdXNoKHBhcmVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXV0byBwb3B1bGF0ZSB0aGUgcGFyZW50IGVudGl0eSB3aXRoIHRoZSBuZXcgZGF0YS5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlW3BhcmVudF0ubG9hZFN1Ym1pc3Npb25Qcm9taXNlLnRoZW4oZnVuY3Rpb24gKGVudGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uLmRhdGFbcGFyZW50XSA9IGVudGl0eTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhuYW1lICsgJy52aWV3JywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUobmFtZSwge1xuICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgdXJsOiAnLycgKyBuYW1lICsgJy86JyArIHF1ZXJ5SWQsXG4gICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5hYnN0cmFjdCA/IHRlbXBsYXRlcy5hYnN0cmFjdCA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAnJGh0dHAnLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGh0dHApIHtcbiAgICAgICAgICAgICAgICAgIHZhciBzdWJtaXNzaW9uVXJsID0gdXJsO1xuICAgICAgICAgICAgICAgICAgdmFyIGVuZHBvaW50ID0gb3B0aW9ucy5lbmRwb2ludDtcbiAgICAgICAgICAgICAgICAgIGlmIChlbmRwb2ludCkge1xuICAgICAgICAgICAgICAgICAgICBlbmRwb2ludCArPSAnLycgKyAkc3RhdGVQYXJhbXNbcXVlcnlJZF07XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvblVybCArPSAnL3N1Ym1pc3Npb24vJyArICRzdGF0ZVBhcmFtc1txdWVyeUlkXTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZSA9ICRzY29wZVtuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlJZDogcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybVVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uVXJsOiBzdWJtaXNzaW9uVXJsLFxuICAgICAgICAgICAgICAgICAgICBmb3JtaW86IChuZXcgRm9ybWlvKHN1Ym1pc3Npb25VcmwpKSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2U6IHt9LFxuICAgICAgICAgICAgICAgICAgICBmb3JtOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgaHJlZjogJy8jLycgKyBuYW1lICsgJy8nICsgJHN0YXRlUGFyYW1zW3F1ZXJ5SWRdICsgJy8nLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/ICRzY29wZVtwYXJlbnRdIDoge2hyZWY6ICcvIy8nLCBuYW1lOiAnaG9tZSd9XG4gICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRGb3JtUHJvbWlzZSA9ICRzY29wZS5jdXJyZW50UmVzb3VyY2UuZm9ybWlvLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm0gPSAkc2NvcGVbbmFtZV0uZm9ybSA9IGZvcm07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtO1xuICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIC8vIElmIHRoZXkgcHJvdmlkZSB0aGVpciBvd24gZW5kcG9pbnQgZm9yIGRhdGEuXG4gICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5lbmRwb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZSA9ICRodHRwLmdldChlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICd4LWp3dC10b2tlbic6IEZvcm1pby5nZXRUb2tlbigpXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLnJlc291cmNlID0gcmVzdWx0LmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZSA9ICRzY29wZS5jdXJyZW50UmVzb3VyY2UuZm9ybWlvLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbiAoc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UucmVzb3VyY2UgPSAkc2NvcGVbbmFtZV0uc3VibWlzc2lvbiA9IHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuYWJzdHJhY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuYWJzdHJhY3QsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJy52aWV3Jywge1xuICAgICAgICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgICAgICAgcGFyZW50OiBuYW1lLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnZpZXcsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMudmlldyA/IHRlbXBsYXRlcy52aWV3IDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2Uvdmlldy5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnZpZXcsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJy5lZGl0Jywge1xuICAgICAgICAgICAgICB1cmw6ICcvZWRpdCcsXG4gICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5lZGl0LFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmVkaXQgPyB0ZW1wbGF0ZXMuZWRpdCA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5lZGl0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuZWRpdCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhuYW1lICsgJy52aWV3JywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUobmFtZSArICcuZGVsZXRlJywge1xuICAgICAgICAgICAgICB1cmw6ICcvZGVsZXRlJyxcbiAgICAgICAgICAgICAgcGFyZW50OiBuYW1lLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmRlbGV0ZSxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5kZWxldGUgPyB0ZW1wbGF0ZXMuZGVsZXRlIDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZGVsZXRlLmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUucmVzb3VyY2VOYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5kZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN0cmwgPSAkY29udHJvbGxlcihjb250cm9sbGVycy5kZWxldGUsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZGVsZXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnQgJiYgcGFyZW50ICE9PSAnaG9tZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhwYXJlbnQgKyAnLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnLCBudWxsLCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignY2FuY2VsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhuYW1lICsgJ0luZGV4Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgICRnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb3VyY2VzO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgXSlcbiAgLmRpcmVjdGl2ZSgnZm9ybWlvRm9ybXMnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgc2NvcGU6IHtcbiAgICAgICAgc3JjOiAnPScsXG4gICAgICAgIGJhc2U6ICc9JyxcbiAgICAgICAgdGFnOiAnPT8nXG4gICAgICB9LFxuICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8taGVscGVyL2Zvcm0vbGlzdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJ0Zvcm1pbycsIGZ1bmN0aW9uICgkc2NvcGUsIEZvcm1pbykge1xuICAgICAgICAkc2NvcGUuZm9ybXMgPSBbXTtcbiAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICB0eXBlOiAnZm9ybScsXG4gICAgICAgICAgbGltaXQ6IDk5OTk5OTlcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKCRzY29wZS50YWcpIHtcbiAgICAgICAgICBwYXJhbXMudGFncyA9ICRzY29wZS50YWc7XG4gICAgICAgIH1cbiAgICAgICAgKG5ldyBGb3JtaW8oJHNjb3BlLnNyYykpLmxvYWRGb3Jtcyh7cGFyYW1zOiBwYXJhbXN9KS50aGVuKGZ1bmN0aW9uIChmb3Jtcykge1xuICAgICAgICAgICRzY29wZS5mb3JtcyA9IGZvcm1zO1xuICAgICAgICB9KTtcbiAgICAgIH1dXG4gICAgfTtcbiAgfSlcbiAgLnByb3ZpZGVyKCdGb3JtaW9Gb3JtcycsIFtcbiAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgIGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uIChuYW1lLCB1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgdGVtcGxhdGVzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy50ZW1wbGF0ZXMpID8gb3B0aW9ucy50ZW1wbGF0ZXMgOiB7fTtcbiAgICAgICAgICB2YXIgY29udHJvbGxlcnMgPSAob3B0aW9ucyAmJiBvcHRpb25zLmNvbnRyb2xsZXJzKSA/IG9wdGlvbnMuY29udHJvbGxlcnMgOiB7fTtcbiAgICAgICAgICB2YXIgYmFzZVBhdGggPSBuYW1lID8gbmFtZSArICcuJyA6ICcnO1xuICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybUluZGV4Jywge1xuICAgICAgICAgICAgICB1cmw6ICcvZm9ybXMnLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmluZGV4LFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmluZGV4ID8gdGVtcGxhdGVzLmluZGV4IDogJ2Zvcm1pby1oZWxwZXIvZm9ybS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnRm9ybWlvJywgJyRjb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRm9ybWlvLCAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICRzY29wZS5mb3JtQmFzZSA9IGJhc2VQYXRoO1xuICAgICAgICAgICAgICAgICRzY29wZS5mb3Jtc1NyYyA9IHVybCArICcvZm9ybSc7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1zVGFnID0gb3B0aW9ucy50YWc7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5pbmRleCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtJywge1xuICAgICAgICAgICAgICB1cmw6ICcvZm9ybS86Zm9ybUlkJyxcbiAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuZm9ybSA/IHRlbXBsYXRlcy5mb3JtIDogJ2Zvcm1pby1oZWxwZXIvZm9ybS9mb3JtLmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBmb3JtVXJsID0gdXJsICsgJy9mb3JtLycgKyAkc3RhdGVQYXJhbXMuZm9ybUlkO1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1CYXNlID0gYmFzZVBhdGg7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0gPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHVybDogZm9ybVVybCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybToge31cbiAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5mb3JtaW8gPSAobmV3IEZvcm1pbyhmb3JtVXJsKSk7XG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0ucHJvbWlzZSA9ICRzY29wZS5jdXJyZW50Rm9ybS5mb3JtaW8ubG9hZEZvcm0oKS50aGVuKGZ1bmN0aW9uIChmb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5mb3JtID0gZm9ybTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm07XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuZm9ybSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0udmlldycsIHtcbiAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMudmlldyxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy52aWV3ID8gdGVtcGxhdGVzLnZpZXcgOiAnZm9ybWlvLWhlbHBlci9mb3JtL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAnRm9ybWlvVXRpbHMnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0ge2RhdGE6IHt9fTtcbiAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmZpZWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5wcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UubG9hZFN1Ym1pc3Npb25Qcm9taXNlLnRoZW4oZnVuY3Rpb24gKHJlc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbi5kYXRhW29wdGlvbnMuZmllbGRdID0gcmVzb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscy5oaWRlRmllbGRzKCRzY29wZS5jdXJyZW50Rm9ybS5mb3JtLCBbb3B0aW9ucy5maWVsZF0pO1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMudmlldywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9ucycpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9ucycsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL3N1Ym1pc3Npb25zJyxcbiAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9ucyxcbiAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9ucyA/IHRlbXBsYXRlcy5zdWJtaXNzaW9ucyA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgICAnRm9ybWlvVXRpbHMnLFxuICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKCRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb1V0aWxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25RdWVyeSA9IHt9O1xuICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25Db2x1bW5zID0gW107XG4gICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvblF1ZXJ5WydkYXRhLicgKyBvcHRpb25zLmZpZWxkICsgJy5faWQnXSA9ICRzdGF0ZVBhcmFtc1tuYW1lICsgJ0lkJ107XG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBzdWJtaXNzaW9uIHdoZW4gdGhleSBjbGljayBvbiB0aGUgcm93LlxuICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbigncm93VmlldycsIGZ1bmN0aW9uIChldmVudCwgZW50aXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24udmlldycsIHtcbiAgICAgICAgICAgICAgICAgICAgICBmb3JtSWQ6IGVudGl0eS5mb3JtLFxuICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25JZDogZW50aXR5Ll9pZFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAvLyBXYWl0IHVudGlsIHRoZSBjdXJyZW50IGZvcm0gaXMgbG9hZGVkLlxuICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLnByb21pc2UudGhlbihmdW5jdGlvbiAoZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscy5lYWNoQ29tcG9uZW50KGZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24gKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50LmtleSB8fCAhY29tcG9uZW50LmlucHV0IHx8ICFjb21wb25lbnQudGFibGVWaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmZpZWxkICYmIChjb21wb25lbnQua2V5ID09PSBvcHRpb25zLmZpZWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbkNvbHVtbnMucHVzaChjb21wb25lbnQua2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHJlbG9hZCB0aGUgZGF0YSBncmlkLlxuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncmVsb2FkR3JpZCcpO1xuICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9ucykge1xuICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9ucywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbicsIHtcbiAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgIHVybDogJy9zdWJtaXNzaW9uLzpzdWJtaXNzaW9uSWQnLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb24sXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbiA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uIDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9zdWJtaXNzaW9uLmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiAkc2NvcGUuY3VycmVudEZvcm0udXJsICsgJy9zdWJtaXNzaW9uLycgKyAkc3RhdGVQYXJhbXMuc3VibWlzc2lvbklkLFxuICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uOiB7fVxuICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIGZvcm1pbyBvYmplY3QuXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uZm9ybWlvID0gKG5ldyBGb3JtaW8oJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnVybCkpO1xuXG4gICAgICAgICAgICAgICAgICAvLyBMb2FkIHRoZSBjdXJyZW50IHN1Ym1pc3Npb24uXG4gICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24ucHJvbWlzZSA9ICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5mb3JtaW8ubG9hZFN1Ym1pc3Npb24oKS50aGVuKGZ1bmN0aW9uIChzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5zdWJtaXNzaW9uID0gc3VibWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY29udHJvbGxlci5cbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb24sIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24udmlldycsIHtcbiAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvblZpZXcsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvblZpZXcgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvblZpZXcgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvblZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvblZpZXcsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24uZWRpdCcsIHtcbiAgICAgICAgICAgICAgdXJsOiAnL2VkaXQnLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25FZGl0LFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25FZGl0ID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25FZGl0IDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAoJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbkVkaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN0cmwgPSAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9uRWRpdCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uIChldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5zdWJtaXNzaW9uID0gc3VibWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi5kZWxldGUnLCB7XG4gICAgICAgICAgICAgIHVybDogJy9kZWxldGUnLFxuICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25EZWxldGUsXG4gICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbkRlbGV0ZSA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uRGVsZXRlIDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9uRGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbkRlbGV0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdkZWxldGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignY2FuY2VsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24udmlldycpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0sXG4gICAgICAgICRnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gcmVzb3VyY2VzO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgXSlcbiAgLnByb3ZpZGVyKCdGb3JtaW9BdXRoJywgW1xuICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICB2YXIgYW5vblN0YXRlID0gJ2F1dGgubG9naW4nO1xuICAgICAgdmFyIGF1dGhTdGF0ZSA9ICdob21lJztcbiAgICAgIHZhciBmb3JjZUF1dGggPSBmYWxzZTtcbiAgICAgIHZhciByZWdpc3RlcmVkID0gZmFsc2U7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzZXRGb3JjZUF1dGg6IGZ1bmN0aW9uIChmb3JjZSkge1xuICAgICAgICAgIGZvcmNlQXV0aCA9IGZvcmNlO1xuICAgICAgICB9LFxuICAgICAgICBzZXRTdGF0ZXM6IGZ1bmN0aW9uIChhbm9uLCBhdXRoKSB7XG4gICAgICAgICAgYW5vblN0YXRlID0gYW5vbjtcbiAgICAgICAgICBhdXRoU3RhdGUgPSBhdXRoO1xuICAgICAgICB9LFxuICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24gKG5hbWUsIHJlc291cmNlLCBwYXRoKSB7XG4gICAgICAgICAgaWYgKCFyZWdpc3RlcmVkKSB7XG4gICAgICAgICAgICByZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhdXRoJywge1xuICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgdXJsOiAnL2F1dGgnLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvYXV0aC5odG1sJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgICAgICBwYXRoID0gbmFtZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgIC5zdGF0ZSgnYXV0aC4nICsgbmFtZSwge1xuICAgICAgICAgICAgICB1cmw6ICcvJyArIHBhdGgsXG4gICAgICAgICAgICAgIHBhcmVudDogJ2F1dGgnLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvJyArIG5hbWUudG9Mb3dlckNhc2UoKSArICcuaHRtbCcsXG4gICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRzdGF0ZScsICckcm9vdFNjb3BlJywgZnVuY3Rpb24gKCRzY29wZSwgJHN0YXRlLCAkcm9vdFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbiAoZXJyLCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIXN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKHN1Ym1pc3Npb24sIHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhdXRoU3RhdGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgICAgJGdldDogW1xuICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICdGb3JtaW9BbGVydHMnLFxuICAgICAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICBmdW5jdGlvbiAoRm9ybWlvLFxuICAgICAgICAgICAgICAgICAgICBGb3JtaW9BbGVydHMsXG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9IHt9O1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuaXNSb2xlID0gZnVuY3Rpb24gKHJvbGUpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAkcm9vdFNjb3BlLnJvbGUgPT09IHJvbGUudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlciA9IGZ1bmN0aW9uICh1c2VyLCByb2xlKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZm9ybWlvQXBwVXNlcicsIGFuZ3VsYXIudG9Kc29uKHVzZXIpKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvQXBwVXNlcicpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVXNlcicpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVG9rZW4nKTtcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKCFyb2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUucm9sZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9BcHBSb2xlJyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5yb2xlID0gcm9sZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZm9ybWlvQXBwUm9sZScsIHJvbGUpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmF1dGhlbnRpY2F0ZWQgPSAhIUZvcm1pby5nZXRUb2tlbigpO1xuICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgndXNlcicsIHtcbiAgICAgICAgICAgICAgICAgICAgdXNlcjogJHJvb3RTY29wZS51c2VyLFxuICAgICAgICAgICAgICAgICAgICByb2xlOiAkcm9vdFNjb3BlLnJvbGVcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QgYW5kIHJvbGUuXG4gICAgICAgICAgICAgICAgdmFyIHVzZXIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvQXBwVXNlcicpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihcbiAgICAgICAgICAgICAgICAgIHVzZXIgPyBhbmd1bGFyLmZyb21Kc29uKHVzZXIpIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9BcHBSb2xlJylcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLnVzZXIpIHtcbiAgICAgICAgICAgICAgICAgIEZvcm1pby5jdXJyZW50VXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKHVzZXIsIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Sb2xlJykpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGxvZ291dEVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgIEZvcm1pb0FsZXJ0cy5hZGRBbGVydCh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91ciBzZXNzaW9uIGhhcyBleHBpcmVkLiBQbGVhc2UgbG9nIGluIGFnYWluLidcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgbG9nb3V0RXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB3aGVuIGEgbG9nb3V0IG9jY3Vycy5cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgIEZvcm1pby5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGxvZ291dEVycm9yKTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHRoZXkgYXJlIGxvZ2dlZC5cbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYXV0aGVudGljYXRlZCA9ICEhRm9ybWlvLmdldFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICBpZiAoZm9yY2VBdXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b1N0YXRlLm5hbWUuc3Vic3RyKDAsIDQpID09PSAnYXV0aCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLmF1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgYWxlcnRzXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmFsZXJ0cyA9IEZvcm1pb0FsZXJ0cy5nZXRBbGVydHMoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH07XG4gICAgfVxuICBdKVxuICAuZmFjdG9yeSgnRm9ybWlvQWxlcnRzJywgW1xuICAgICckcm9vdFNjb3BlJyxcbiAgICBmdW5jdGlvbiAoJHJvb3RTY29wZSkge1xuICAgICAgdmFyIGFsZXJ0cyA9IFtdO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYWRkQWxlcnQ6IGZ1bmN0aW9uIChhbGVydCkge1xuICAgICAgICAgICRyb290U2NvcGUuYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgIGlmIChhbGVydC5lbGVtZW50KSB7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJyNmb3JtLWdyb3VwLScgKyBhbGVydC5lbGVtZW50KS5hZGRDbGFzcygnaGFzLWVycm9yJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZ2V0QWxlcnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIHRlbXBBbGVydHMgPSBhbmd1bGFyLmNvcHkoYWxlcnRzKTtcbiAgICAgICAgICBhbGVydHMubGVuZ3RoID0gMDtcbiAgICAgICAgICBhbGVydHMgPSBbXTtcbiAgICAgICAgICByZXR1cm4gdGVtcEFsZXJ0cztcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcjogZnVuY3Rpb24gc2hvd0Vycm9yKGVycm9yKSB7XG4gICAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkQWxlcnQoe1xuICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgZWxlbWVudDogZXJyb3IucGF0aFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVycm9ycyA9IGVycm9yLmhhc093blByb3BlcnR5KCdlcnJvcnMnKSA/IGVycm9yLmVycm9ycyA6IGVycm9yLmRhdGEuZXJyb3JzO1xuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGVycm9ycywgc2hvd0Vycm9yLmJpbmQodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIF0pXG4gIC5ydW4oW1xuICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgJyRyb290U2NvcGUnLFxuICAgICckc3RhdGUnLFxuICAgIGZ1bmN0aW9uICgkdGVtcGxhdGVDYWNoZSxcbiAgICAgICAgICAgICAgJHJvb3RTY29wZSxcbiAgICAgICAgICAgICAgJHN0YXRlKSB7XG4gICAgICAvLyBEZXRlcm1pbmUgdGhlIGFjdGl2ZSBzdGF0ZS5cbiAgICAgICRyb290U2NvcGUuaXNBY3RpdmUgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuICRzdGF0ZS5jdXJyZW50Lm5hbWUuaW5kZXhPZihzdGF0ZSkgIT09IC0xO1xuICAgICAgfTtcblxuICAgICAgLyoqKiogUkVTT1VSQ0UgVEVNUExBVEVTICoqKioqKiovXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvcmVzb3VyY2UuaHRtbCcsXG4gICAgICAgIFwiPGgyPnt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIHwgY2FwaXRhbGl6ZSB9fTwvaDI+XFxuPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXRhYnNcXFwiPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLnZpZXcnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LnZpZXcoKVxcXCI+VmlldzwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmVkaXQnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LmVkaXQoKVxcXCI+RWRpdDwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmRlbGV0ZScpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgY3VycmVudFJlc291cmNlLm5hbWUgfX0uZGVsZXRlKClcXFwiPkRlbGV0ZTwvYT48L2xpPlxcbjwvdWw+XFxuPGRpdiB1aS12aWV3PjwvZGl2PlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvY3JlYXRlLmh0bWwnLFxuICAgICAgICBcIjxoMz5OZXcge3sgY3VycmVudFJlc291cmNlLm5hbWUgfCBjYXBpdGFsaXplIH19PC9oMz5cXG48aHI+PC9ocj5cXG48Zm9ybWlvIHNyYz1cXFwiY3VycmVudFJlc291cmNlLmZvcm1VcmxcXFwiIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiIGhpZGUtY29tcG9uZW50cz1cXFwiaGlkZUNvbXBvbmVudHNcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZGVsZXRlLmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tZGVsZXRlIHNyYz1cXFwiY3VycmVudFJlc291cmNlLnN1Ym1pc3Npb25VcmxcXFwiIHJlc291cmNlLW5hbWU9XFxcInJlc291cmNlTmFtZVxcXCI+PC9mb3JtaW8tZGVsZXRlPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZWRpdC5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvIHNyYz1cXFwiY3VycmVudFJlc291cmNlLnN1Ym1pc3Npb25VcmxcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvaW5kZXguaHRtbCcsXG4gICAgICAgIFwiPGZvcm1pby1ncmlkIHNyYz1cXFwiY3VycmVudFJlc291cmNlLmZvcm1VcmxcXFwiIGNvbHVtbnM9XFxcImN1cnJlbnRSZXNvdXJjZS5jb2x1bW5zXFxcIiBncmlkLW9wdGlvbnM9XFxcImN1cnJlbnRSZXNvdXJjZS5ncmlkT3B0aW9uc1xcXCI+PC9mb3JtaW8tZ3JpZD48YnIvPlxcbjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19Q3JlYXRlKClcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+IE5ldyB7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2E+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS92aWV3Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8gc3JjPVxcXCJjdXJyZW50UmVzb3VyY2Uuc3VibWlzc2lvblVybFxcXCIgcmVhZC1vbmx5PVxcXCJ0cnVlXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgLyoqKiogRk9STSBURU1QTEFURVMgKioqKioqKi9cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL2xpc3QuaHRtbCcsXG4gICAgICAgIFwiPHVsIGNsYXNzPVxcXCJsaXN0LWdyb3VwXFxcIj5cXG4gICAgPGxpIGNsYXNzPVxcXCJsaXN0LWdyb3VwLWl0ZW1cXFwiIG5nLXJlcGVhdD1cXFwiZm9ybSBpbiBmb3JtcyB8IG9yZGVyQnk6ICd0aXRsZSdcXFwiPjxhIHVpLXNyZWY9XFxcInt7IGJhc2UgfX1mb3JtLnZpZXcoe2Zvcm1JZDogZm9ybS5faWR9KVxcXCI+e3sgZm9ybS50aXRsZSB9fTwvYT48L2xpPlxcbjwvdWw+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL2luZGV4Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tZm9ybXMgc3JjPVxcXCJmb3Jtc1NyY1xcXCIgdGFnPVxcXCJmb3Jtc1RhZ1xcXCIgYmFzZT1cXFwiZm9ybUJhc2VcXFwiPjwvZm9ybWlvLWZvcm1zPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvZm9ybS9mb3JtLmh0bWwnLFxuICAgICAgICBcIjx1bCBjbGFzcz1cXFwibmF2IG5hdi10YWJzXFxcIj5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS52aWV3Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0udmlldygpXFxcIj5Gb3JtPC9hPjwvbGk+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbnMnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9ucygpXFxcIj5TdWJtaXNzaW9uczwvYT48L2xpPlxcbjwvdWw+XFxuPGRpdiB1aS12aWV3IHN0eWxlPVxcXCJtYXJnaW4tdG9wOjIwcHg7XFxcIj48L2Rpdj5cXG5cIlxuICAgICAgKTtcblxuICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vdmlldy5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvIGZvcm09XFxcImN1cnJlbnRGb3JtLmZvcm1cXFwiIGZvcm0tYWN0aW9uPVxcXCJjdXJyZW50Rm9ybS51cmwgKyAnL3N1Ym1pc3Npb24nXFxcIiBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgKTtcblxuICAgICAgLyoqKiogU1VCTUlTU0lPTiBURU1QTEFURVMgKioqKioqKi9cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2luZGV4Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8tZ3JpZCBzcmM9XFxcImN1cnJlbnRGb3JtLnVybFxcXCIgcXVlcnk9XFxcInN1Ym1pc3Npb25RdWVyeVxcXCIgY29sdW1ucz1cXFwic3VibWlzc2lvbkNvbHVtbnNcXFwiPjwvZm9ybWlvLWdyaWQ+XFxuXFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL3N1Ym1pc3Npb24uaHRtbCcsXG4gICAgICAgIFwiPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXBpbGxzXFxcIj5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9uLnZpZXcoKVxcXCI+VmlldzwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb24uZWRpdCcpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnN1Ym1pc3Npb24uZWRpdCgpXFxcIj5FZGl0PC9hPjwvbGk+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbi5kZWxldGUnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9uLmRlbGV0ZSgpXFxcIj5EZWxldGU8L2E+PC9saT5cXG48L3VsPlxcbjxkaXYgdWktdmlldyBzdHlsZT1cXFwibWFyZ2luLXRvcDoyMHB4O1xcXCI+PC9kaXY+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL3ZpZXcuaHRtbCcsXG4gICAgICAgIFwiPGZvcm1pbyBmb3JtPVxcXCJjdXJyZW50Rm9ybS5mb3JtXFxcIiBzdWJtaXNzaW9uPVxcXCJjdXJyZW50U3VibWlzc2lvbi5zdWJtaXNzaW9uXFxcIiByZWFkLW9ubHk9XFxcInRydWVcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICApO1xuXG4gICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9lZGl0Lmh0bWwnLFxuICAgICAgICBcIjxmb3JtaW8gZm9ybT1cXFwiY3VycmVudEZvcm0uZm9ybVxcXCIgc3VibWlzc2lvbj1cXFwiY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvblxcXCIgZm9ybS1hY3Rpb249XFxcImN1cnJlbnRTdWJtaXNzaW9uLnVybFxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICk7XG5cbiAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgXCI8Zm9ybWlvLWRlbGV0ZSBzcmM9XFxcImN1cnJlbnRTdWJtaXNzaW9uLnVybFxcXCI+PC9mb3JtaW8tZGVsZXRlPlxcblwiXG4gICAgICApO1xuICAgIH1cbiAgXSk7Il19
