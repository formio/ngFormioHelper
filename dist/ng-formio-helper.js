(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

angular.module('ngFormioHelper', ['formio', 'ngFormioGrid', 'ui.router'])
    .filter('capitalize', [function() {
        return _.capitalize;
    }])
    .filter('truncate', [function() {
        return function(input, opts) {
            if(_.isNumber(opts)) {
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
        function(
            $stateProvider
        ) {
            var resources = {};
            return {
                register: function(name, url, options) {
                    options = options || {};
                    resources[name] = options.title || name;
                    var parent = (options && options.parent) ? options.parent : null;
                    var queryId = name + 'Id';
                    var query = function(submission) {
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
                                function(
                                  $scope,
                                  $state,
                                  $controller
                                ) {
                                    $scope.currentResource = {
                                        name: name,
                                        queryId: queryId,
                                        formUrl: url,
                                        columns: [],
                                        gridOptions: {}
                                    };
                                    $scope.$on('rowView', function(event, submission) {
                                        $state.go(name + '.view', query(submission));
                                    });
                                    $scope.$on('submissionView', function(event, submission) {
                                        $state.go(name + '.view', query(submission));
                                    });

                                    $scope.$on('submissionEdit', function(event, submission) {
                                        $state.go(name + '.edit', query(submission));
                                    });

                                    $scope.$on('submissionDelete', function(event, submission) {
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
                                function(
                                  $scope,
                                  $state,
                                  $controller
                                ) {
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
                                        $scope[parent].loadSubmissionPromise.then(function(entity) {
                                            $scope.submission.data[parent] = entity;
                                        });
                                    }
                                    if (!handle) {
                                        $scope.$on('formSubmission', function(event, submission) {
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
                                function(
                                  $scope,
                                  $stateParams,
                                  Formio,
                                  $controller,
                                  $http
                                ) {
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

                                    $scope.currentResource.loadFormPromise = $scope.currentResource.formio.loadForm().then(function(form) {
                                        $scope.currentResource.form = $scope[name].form = form;
                                        return form;
                                    });

                                    // If they provide their own endpoint for data.
                                    if (options.endpoint) {
                                        $scope.currentResource.loadSubmissionPromise = $http.get(endpoint, {
                                            headers: {
                                                'x-jwt-token': Formio.getToken()
                                            }
                                        }).then(function(result) {
                                            $scope.currentResource.resource = result.data;
                                            return result.data;
                                        });
                                    }
                                    else {
                                        $scope.currentResource.loadSubmissionPromise = $scope.currentResource.formio.loadSubmission().then(function(submission) {
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
                                function(
                                  $scope,
                                  $controller
                                ) {
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
                                function(
                                  $scope,
                                  $state,
                                  $controller
                                ) {
                                    var handle = false;
                                    if (controllers.edit) {
                                        var ctrl = $controller(controllers.edit, {$scope: $scope});
                                        handle = (ctrl.handle || false);
                                    }
                                    if (!handle) {
                                        $scope.$on('formSubmission', function(event, submission) {
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
                                function(
                                  $scope,
                                  $state,
                                  $controller
                                ) {
                                    var handle = false;
                                    $scope.resourceName = name;
                                    if (controllers.delete) {
                                        var ctrl = $controller(controllers.delete, {$scope: $scope});
                                        handle = (ctrl.handle || false);
                                    }
                                    if (!handle) {
                                        $scope.$on('delete', function() {
                                            if (parent && parent !== 'home') {
                                                $state.go(parent + '.view');
                                            }
                                            else {
                                                $state.go('home', null, {reload: true});
                                            }
                                        });
                                    }
                                }
                            ]
                        });
                },
                $get: function() {
                    return resources;
                }
            };
        }
    ])
    .directive('formioForms', function() {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                src: '=',
                base: '=',
                tag: '=?'
            },
            templateUrl: 'formio-helper/form/list.html',
            controller: ['$scope', 'Formio', function($scope, Formio) {
                $scope.forms = [];
                var params = {
                    type: 'form'
                };
                if ($scope.tag) {
                    params.tags = $scope.tag;
                }
                (new Formio($scope.src)).loadForms({params: params}).then(function(forms) {
                    $scope.forms = forms;
                });
            }]
        };
    })
    .provider('FormioForms', [
        '$stateProvider',
        function(
          $stateProvider
        ) {
            var resources = {};
            return {
                register: function(name, url, options) {
                    var templates = (options && options.templates) ? options.templates : {};
                    var controllers = (options && options.controllers) ? options.controllers : {};
                    var basePath = name ? name + '.' : '';
                    $stateProvider
                        .state(basePath + 'formIndex', {
                            url: '/forms',
                            params: options.params && options.params.index,
                            templateUrl: templates.index ? templates.index : 'formio-helper/form/index.html',
                            controller: ['$scope', 'Formio', '$controller', function($scope, Formio, $controller) {
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
                                function(
                                  $scope,
                                  $stateParams,
                                  Formio,
                                  $controller
                                ) {
                                    var formUrl = url + '/form/' + $stateParams.formId;
                                    $scope.formBase = basePath;
                                    $scope.currentForm = {
                                        name: name,
                                        url: formUrl,
                                        form: {}
                                    };

                                    $scope.currentForm.formio = (new Formio(formUrl));
                                    $scope.currentForm.promise = $scope.currentForm.formio.loadForm().then(function(form) {
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
                                function(
                                  $scope,
                                  $state,
                                  FormioUtils,
                                  $controller
                                ) {
                                    $scope.submission = {data: {}};
                                    if (options.field) {
                                        $scope.currentForm.promise.then(function() {
                                            $scope.currentResource.loadSubmissionPromise.then(function(resource) {
                                                $scope.submission.data[options.field] = resource;
                                                FormioUtils.hideFields($scope.currentForm.form, [options.field]);
                                            });
                                        });
                                    }
                                    $scope.$on('formSubmission', function() {
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
                                function(
                                  $scope,
                                  $state,
                                  $stateParams,
                                  FormioUtils,
                                  $controller
                                ) {
                                    $scope.submissionQuery = {};
                                    $scope.submissionColumns = [];
                                    if (options.field) {
                                        $scope.submissionQuery['data.' + options.field + '._id'] = $stateParams[name + 'Id'];
                                    }

                                    // Go to the submission when they click on the row.
                                    $scope.$on('rowView', function(event, entity) {
                                        $state.go(basePath + 'form.submission.view', {
                                            formId: entity.form,
                                            submissionId: entity._id
                                        });
                                    });

                                    // Wait until the current form is loaded.
                                    $scope.currentForm.promise.then(function(form) {
                                        FormioUtils.eachComponent(form.components, function(component) {
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
                              function(
                                $scope,
                                $stateParams,
                                Formio,
                                $controller
                              ) {
                                  $scope.currentSubmission = {
                                      url: $scope.currentForm.url + '/submission/' + $stateParams.submissionId,
                                      submission: {}
                                  };

                                  // Store the formio object.
                                  $scope.currentSubmission.formio = (new Formio($scope.currentSubmission.url));

                                  // Load the current submission.
                                  $scope.currentSubmission.promise = $scope.currentSubmission.formio.loadSubmission().then(function(submission) {
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
                              function(
                                $scope,
                                $controller
                              ) {
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
                              function(
                                $scope,
                                $state,
                                $controller
                              ) {
                                  $scope.$on('formSubmission', function(event, submission) {
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
                              function(
                                $scope,
                                $state,
                                $controller
                              ) {
                                  $scope.$on('delete', function() {
                                      $state.go(basePath + 'form.submissions');
                                  });

                                  $scope.$on('cancel', function() {
                                      $state.go(basePath + 'form.submission.view');
                                  });

                                  if (controllers.submissionDelete) {
                                      $controller(controllers.submissionDelete, {$scope: $scope});
                                  }
                              }
                          ]
                        })
                },
                $get: function() {
                    return resources;
                }
            };
        }
    ])
    .provider('FormioAuth', [
        '$stateProvider',
        function(
            $stateProvider
        ) {
            var anonState = 'auth.login';
            var authState = 'home';
            var forceAuth = false;
            var registered = false;
            return {
                setForceAuth: function(force) {
                    forceAuth = force;
                },
                setStates: function(anon, auth) {
                    anonState = anon;
                    authState = auth;
                },
                register: function(name, resource, path) {
                    if (!registered) {
                        registered = true;
                        $stateProvider.state('auth', {
                            abstract: true,
                            url: '/auth',
                            templateUrl: 'views/user/auth.html'
                        });
                    }

                    if (!path) { path = name; }
                    $stateProvider
                        .state('auth.' + name, {
                            url: '/' + path,
                            parent: 'auth',
                            templateUrl: 'views/user/' + name.toLowerCase() + '.html',
                            controller: ['$scope', '$state', '$rootScope', function($scope, $state, $rootScope) {
                                $scope.$on('formSubmission', function(err, submission) {
                                    if (!submission) { return; }
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
                    function(
                        Formio,
                        FormioAlerts,
                        $rootScope,
                        $state
                    ) {
                        return {
                            init: function() {
                                $rootScope.user = {};
                                $rootScope.isRole = function(role) {
                                    return $rootScope.role === role.toLowerCase();
                                };
                                $rootScope.setUser = function(user, role) {
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
                                    Formio.currentUser().then(function(user) {
                                        $rootScope.setUser(user, localStorage.getItem('formioRole'));
                                    });
                                }

                                var logoutError = function() {
                                    $state.go(anonState, {}, {reload: true});
                                    FormioAlerts.addAlert({
                                        type: 'danger',
                                        message: 'Your session has expired. Please log in again.'
                                    });
                                };

                                $rootScope.$on('formio.sessionExpired', logoutError);

                                // Trigger when a logout occurs.
                                $rootScope.logout = function() {
                                    $rootScope.setUser(null, null);
                                    Formio.logout().then(function() {
                                        $state.go(anonState, {}, {reload: true});
                                    }).catch(logoutError);
                                };

                                // Ensure they are logged.
                                $rootScope.$on('$stateChangeStart', function(event, toState) {
                                    $rootScope.authenticated = !!Formio.getToken();
                                    if (forceAuth) {
                                        if (toState.name.substr(0, 4) === 'auth') { return; }
                                        if (!$rootScope.authenticated) {
                                            event.preventDefault();
                                            $state.go(anonState, {}, {reload: true});
                                        }
                                    }
                                });

                                // Set the alerts
                                $rootScope.$on('$stateChangeSuccess', function() {
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
        function (
            $rootScope
        ) {
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
        function(
            $templateCache,
            $rootScope,
            $state
        ) {
            // Determine the active state.
            $rootScope.isActive = function(state) {
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
              "<ul class=\"list-group\">\n    <li class=\"list-group-item\" ng-repeat=\"form in forms\"><a ui-sref=\"{{ base }}form.view({formId: form._id})\">{{ form.title }}</a></li>\n</ul>\n"
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbmctZm9ybWlvLWhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5hbmd1bGFyLm1vZHVsZSgnbmdGb3JtaW9IZWxwZXInLCBbJ2Zvcm1pbycsICduZ0Zvcm1pb0dyaWQnLCAndWkucm91dGVyJ10pXG4gICAgLmZpbHRlcignY2FwaXRhbGl6ZScsIFtmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIF8uY2FwaXRhbGl6ZTtcbiAgICB9XSlcbiAgICAuZmlsdGVyKCd0cnVuY2F0ZScsIFtmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGlucHV0LCBvcHRzKSB7XG4gICAgICAgICAgICBpZihfLmlzTnVtYmVyKG9wdHMpKSB7XG4gICAgICAgICAgICAgICAgb3B0cyA9IHtsZW5ndGg6IG9wdHN9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF8udHJ1bmNhdGUoaW5wdXQsIG9wdHMpO1xuICAgICAgICB9O1xuICAgIH1dKVxuICAgIC5kaXJlY3RpdmUoXCJmaWxlcmVhZFwiLCBbXG4gICAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZXJlYWQ6IFwiPVwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5iaW5kKFwiY2hhbmdlXCIsIGZ1bmN0aW9uIChjaGFuZ2VFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24gKGxvYWRFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLiRhcHBseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmZpbGVyZWFkID0galF1ZXJ5KGxvYWRFdmVudC50YXJnZXQucmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzVGV4dChjaGFuZ2VFdmVudC50YXJnZXQuZmlsZXNbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSlcbiAgICAucHJvdmlkZXIoJ0Zvcm1pb1Jlc291cmNlJywgW1xuICAgICAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgdXJsLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNbbmFtZV0gPSBvcHRpb25zLnRpdGxlIHx8IG5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnQgPSAob3B0aW9ucyAmJiBvcHRpb25zLnBhcmVudCkgPyBvcHRpb25zLnBhcmVudCA6IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeUlkID0gbmFtZSArICdJZCc7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9IGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlbcXVlcnlJZF0gPSBzdWJtaXNzaW9uLl9pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBxdWVyeTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGVzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy50ZW1wbGF0ZXMpID8gb3B0aW9ucy50ZW1wbGF0ZXMgOiB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5jb250cm9sbGVycykgPyBvcHRpb25zLmNvbnRyb2xsZXJzIDoge307XG4gICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeVBhcmFtcyA9IG9wdGlvbnMucXVlcnkgPyBvcHRpb25zLnF1ZXJ5IDogJyc7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSArICdJbmRleCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyArIG5hbWUgKyBxdWVyeVBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5pbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmluZGV4ID8gdGVtcGxhdGVzLmluZGV4IDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlJZDogcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtVXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uczogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JpZE9wdGlvbnM6IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbigncm93VmlldycsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLnZpZXcnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3N1Ym1pc3Npb25WaWV3JywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXNzaW9uRWRpdCcsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLmVkaXQnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvbkRlbGV0ZScsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLmRlbGV0ZScsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuaW5kZXgsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJ0NyZWF0ZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvY3JlYXRlLycgKyBuYW1lICsgcXVlcnlQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnQgPyBwYXJlbnQgOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuY3JlYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuY3JlYXRlID8gdGVtcGxhdGVzLmNyZWF0ZSA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2NyZWF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVyeUlkOiBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0gb3B0aW9ucy5kZWZhdWx0VmFsdWUgPyBvcHRpb25zLmRlZmF1bHRWYWx1ZSA6IHtkYXRhOiB7fX07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuY3JlYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN0cmwgPSAkY29udHJvbGxlcihjb250cm9sbGVycy5jcmVhdGUsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkc2NvcGUuaGlkZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmhpZGVDb21wb25lbnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5oaWRlQ29tcG9uZW50cy5wdXNoKHBhcmVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBdXRvIHBvcHVsYXRlIHRoZSBwYXJlbnQgZW50aXR5IHdpdGggdGhlIG5ldyBkYXRhLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZVtwYXJlbnRdLmxvYWRTdWJtaXNzaW9uUHJvbWlzZS50aGVuKGZ1bmN0aW9uKGVudGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbi5kYXRhW3BhcmVudF0gPSBlbnRpdHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLnZpZXcnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyArIG5hbWUgKyAnLzonICsgcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5hYnN0cmFjdCA/IHRlbXBsYXRlcy5hYnN0cmFjdCA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRodHRwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGh0dHBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvblVybCA9IHVybDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbmRwb2ludCA9IG9wdGlvbnMuZW5kcG9pbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludCArPSAnLycgKyAkc3RhdGVQYXJhbXNbcXVlcnlJZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uVXJsICs9ICcvc3VibWlzc2lvbi8nICsgJHN0YXRlUGFyYW1zW3F1ZXJ5SWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlID0gJHNjb3BlW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlJZDogcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtVXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvblVybDogc3VibWlzc2lvblVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtaW86IChuZXcgRm9ybWlvKHN1Ym1pc3Npb25VcmwpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZToge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybToge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHJlZjogJy8jLycgKyBuYW1lICsgJy8nICsgJHN0YXRlUGFyYW1zW3F1ZXJ5SWRdICsgJy8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gJHNjb3BlW3BhcmVudF0gOiB7aHJlZjogJy8jLycsIG5hbWU6ICdob21lJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UubG9hZEZvcm1Qcm9taXNlID0gJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5mb3JtaW8ubG9hZEZvcm0oKS50aGVuKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm0gPSAkc2NvcGVbbmFtZV0uZm9ybSA9IGZvcm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdGhleSBwcm92aWRlIHRoZWlyIG93biBlbmRwb2ludCBmb3IgZGF0YS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmVuZHBvaW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkU3VibWlzc2lvblByb21pc2UgPSAkaHR0cC5nZXQoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3gtand0LXRva2VuJzogRm9ybWlvLmdldFRva2VuKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UucmVzb3VyY2UgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkU3VibWlzc2lvblByb21pc2UgPSAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm1pby5sb2FkU3VibWlzc2lvbigpLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLnJlc291cmNlID0gJHNjb3BlW25hbWVdLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3VibWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmFic3RyYWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuYWJzdHJhY3QsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJy52aWV3Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnZpZXcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy52aWV3ID8gdGVtcGxhdGVzLnZpZXcgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMudmlldywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLmVkaXQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2VkaXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmVkaXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5lZGl0ID8gdGVtcGxhdGVzLmVkaXQgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmVkaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmVkaXQsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLnZpZXcnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLmRlbGV0ZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZGVsZXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5kZWxldGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5kZWxldGUgPyB0ZW1wbGF0ZXMuZGVsZXRlIDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZGVsZXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlc291cmNlTmFtZSA9IG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN0cmwgPSAkY29udHJvbGxlcihjb250cm9sbGVycy5kZWxldGUsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhbmRsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2RlbGV0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudCAhPT0gJ2hvbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28ocGFyZW50ICsgJy52aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnLCBudWxsLCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvdXJjZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmRpcmVjdGl2ZSgnZm9ybWlvRm9ybXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgICAgICBzcmM6ICc9JyxcbiAgICAgICAgICAgICAgICBiYXNlOiAnPScsXG4gICAgICAgICAgICAgICAgdGFnOiAnPT8nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdmb3JtaW8taGVscGVyL2Zvcm0vbGlzdC5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJ0Zvcm1pbycsIGZ1bmN0aW9uKCRzY29wZSwgRm9ybWlvKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1zID0gW107XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Zvcm0nXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAoJHNjb3BlLnRhZykge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMudGFncyA9ICRzY29wZS50YWc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChuZXcgRm9ybWlvKCRzY29wZS5zcmMpKS5sb2FkRm9ybXMoe3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbihmb3Jtcykge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybXMgPSBmb3JtcztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH07XG4gICAgfSlcbiAgICAucHJvdmlkZXIoJ0Zvcm1pb0Zvcm1zJywgW1xuICAgICAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIHVybCwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGVzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy50ZW1wbGF0ZXMpID8gb3B0aW9ucy50ZW1wbGF0ZXMgOiB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJzID0gKG9wdGlvbnMgJiYgb3B0aW9ucy5jb250cm9sbGVycykgPyBvcHRpb25zLmNvbnRyb2xsZXJzIDoge307XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYXNlUGF0aCA9IG5hbWUgPyBuYW1lICsgJy4nIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybUluZGV4Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9mb3JtcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5pbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmluZGV4ID8gdGVtcGxhdGVzLmluZGV4IDogJ2Zvcm1pby1oZWxwZXIvZm9ybS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICdGb3JtaW8nLCAnJGNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsIEZvcm1pbywgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1CYXNlID0gYmFzZVBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3Jtc1NyYyA9IHVybCArICcvZm9ybSc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3Jtc1RhZyA9IG9wdGlvbnMudGFnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmluZGV4LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2Zvcm0vOmZvcm1JZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5mb3JtID8gdGVtcGxhdGVzLmZvcm0gOiAnZm9ybWlvLWhlbHBlci9mb3JtL2Zvcm0uaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmb3JtVXJsID0gdXJsICsgJy9mb3JtLycgKyAkc3RhdGVQYXJhbXMuZm9ybUlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1CYXNlID0gYmFzZVBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGZvcm1VcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybToge31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5mb3JtaW8gPSAobmV3IEZvcm1pbyhmb3JtVXJsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0ucHJvbWlzZSA9ICRzY29wZS5jdXJyZW50Rm9ybS5mb3JtaW8ubG9hZEZvcm0oKS50aGVuKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0uZm9ybSA9IGZvcm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5mb3JtLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS52aWV3Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMudmlldyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnZpZXcgPyB0ZW1wbGF0ZXMudmlldyA6ICdmb3JtaW8taGVscGVyL2Zvcm0vdmlldy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uID0ge2RhdGE6IHt9fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmZpZWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLnByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkU3VibWlzc2lvblByb21pc2UudGhlbihmdW5jdGlvbihyZXNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24uZGF0YVtvcHRpb25zLmZpZWxkXSA9IHJlc291cmNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMuaGlkZUZpZWxkcygkc2NvcGUuY3VycmVudEZvcm0uZm9ybSwgW29wdGlvbnMuZmllbGRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb25zJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMudmlldywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3N1Ym1pc3Npb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbnMgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbnMgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0Zvcm1pb1V0aWxzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvblF1ZXJ5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbkNvbHVtbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmZpZWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25RdWVyeVsnZGF0YS4nICsgb3B0aW9ucy5maWVsZCArICcuX2lkJ10gPSAkc3RhdGVQYXJhbXNbbmFtZSArICdJZCddO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgc3VibWlzc2lvbiB3aGVuIHRoZXkgY2xpY2sgb24gdGhlIHJvdy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3Jvd1ZpZXcnLCBmdW5jdGlvbihldmVudCwgZW50aXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtSWQ6IGVudGl0eS5mb3JtLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uSWQ6IGVudGl0eS5faWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBXYWl0IHVudGlsIHRoZSBjdXJyZW50IGZvcm0gaXMgbG9hZGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLnByb21pc2UudGhlbihmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMuZWFjaENvbXBvbmVudChmb3JtLmNvbXBvbmVudHMsIGZ1bmN0aW9uKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5rZXkgfHwgIWNvbXBvbmVudC5pbnB1dCB8fCAhY29tcG9uZW50LnRhYmxlVmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmZpZWxkICYmIChjb21wb25lbnQua2V5ID09PSBvcHRpb25zLmZpZWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uQ29sdW1ucy5wdXNoKGNvbXBvbmVudC5rZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHJlbG9hZCB0aGUgZGF0YSBncmlkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdyZWxvYWRHcmlkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbnMsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24nLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL3N1Ym1pc3Npb24vOnN1Ym1pc3Npb25JZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbiA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uIDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9zdWJtaXNzaW9uLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAkc2NvcGUuY3VycmVudEZvcm0udXJsICsgJy9zdWJtaXNzaW9uLycgKyAkc3RhdGVQYXJhbXMuc3VibWlzc2lvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSB0aGUgZm9ybWlvIG9iamVjdC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uZm9ybWlvID0gKG5ldyBGb3JtaW8oJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnVybCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCB0aGUgY3VycmVudCBzdWJtaXNzaW9uLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5wcm9taXNlID0gJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLmZvcm1pby5sb2FkU3VibWlzc2lvbigpLnRoZW4oZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvbiA9IHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0aGUgY29udHJvbGxlci5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9uLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24udmlldycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25WaWV3LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvblZpZXcgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvblZpZXcgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9uVmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9uVmlldywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLmVkaXQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9lZGl0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uRWRpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9uRWRpdCA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uRWRpdCA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5zdWJtaXNzaW9uID0gc3VibWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25FZGl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25FZGl0LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLmRlbGV0ZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2RlbGV0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvbkRlbGV0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9uRGVsZXRlID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25EZWxldGUgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdkZWxldGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2NhbmNlbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9uRGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25EZWxldGUsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICRnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb3VyY2VzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5wcm92aWRlcignRm9ybWlvQXV0aCcsIFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICApIHtcbiAgICAgICAgICAgIHZhciBhbm9uU3RhdGUgPSAnYXV0aC5sb2dpbic7XG4gICAgICAgICAgICB2YXIgYXV0aFN0YXRlID0gJ2hvbWUnO1xuICAgICAgICAgICAgdmFyIGZvcmNlQXV0aCA9IGZhbHNlO1xuICAgICAgICAgICAgdmFyIHJlZ2lzdGVyZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2V0Rm9yY2VBdXRoOiBmdW5jdGlvbihmb3JjZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3JjZUF1dGggPSBmb3JjZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldFN0YXRlczogZnVuY3Rpb24oYW5vbiwgYXV0aCkge1xuICAgICAgICAgICAgICAgICAgICBhbm9uU3RhdGUgPSBhbm9uO1xuICAgICAgICAgICAgICAgICAgICBhdXRoU3RhdGUgPSBhdXRoO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIHJlc291cmNlLCBwYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVnaXN0ZXJlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXJlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYXV0aCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvYXV0aCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICd2aWV3cy91c2VyL2F1dGguaHRtbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXRoKSB7IHBhdGggPSBuYW1lOyB9XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoJ2F1dGguJyArIG5hbWUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyArIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiAnYXV0aCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICd2aWV3cy91c2VyLycgKyBuYW1lLnRvTG93ZXJDYXNlKCkgKyAnLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJyRzdGF0ZScsICckcm9vdFNjb3BlJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRyb290U2NvcGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbihlcnIsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc3VibWlzc2lvbikgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihzdWJtaXNzaW9uLCByZXNvdXJjZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYXV0aFN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAkZ2V0OiBbXG4gICAgICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICAgICAnRm9ybWlvQWxlcnRzJyxcbiAgICAgICAgICAgICAgICAgICAgJyRyb290U2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9BbGVydHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuaXNSb2xlID0gZnVuY3Rpb24ocm9sZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRyb290U2NvcGUucm9sZSA9PT0gcm9sZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIgPSBmdW5jdGlvbih1c2VyLCByb2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb0FwcFVzZXInLCBhbmd1bGFyLnRvSnNvbih1c2VyKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9BcHBVc2VyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb1VzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVG9rZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyb2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5yb2xlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvQXBwUm9sZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5yb2xlID0gcm9sZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKCdmb3JtaW9BcHBSb2xlJywgcm9sZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYXV0aGVudGljYXRlZCA9ICEhRm9ybWlvLmdldFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCd1c2VyJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXI6ICRyb290U2NvcGUudXNlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb2xlOiAkcm9vdFNjb3BlLnJvbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgY3VycmVudCB1c2VyIG9iamVjdCBhbmQgcm9sZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHVzZXIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvQXBwVXNlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyID8gYW5ndWxhci5mcm9tSnNvbih1c2VyKSA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvQXBwUm9sZScpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLnVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pby5jdXJyZW50VXNlcigpLnRoZW4oZnVuY3Rpb24odXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcih1c2VyLCBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnZm9ybWlvUm9sZScpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxvZ291dEVycm9yID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYW5vblN0YXRlLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvQWxlcnRzLmFkZEFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnWW91ciBzZXNzaW9uIGhhcyBleHBpcmVkLiBQbGVhc2UgbG9nIGluIGFnYWluLidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCdmb3JtaW8uc2Vzc2lvbkV4cGlyZWQnLCBsb2dvdXRFcnJvcik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB3aGVuIGEgbG9nb3V0IG9jY3Vycy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihudWxsLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pby5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChsb2dvdXRFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHRoZXkgYXJlIGxvZ2dlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYXV0aGVudGljYXRlZCA9ICEhRm9ybWlvLmdldFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9yY2VBdXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvU3RhdGUubmFtZS5zdWJzdHIoMCwgNCkgPT09ICdhdXRoJykgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISRyb290U2NvcGUuYXV0aGVudGljYXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYW5vblN0YXRlLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBhbGVydHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN1Y2Nlc3MnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYWxlcnRzID0gRm9ybWlvQWxlcnRzLmdldEFsZXJ0cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmZhY3RvcnkoJ0Zvcm1pb0FsZXJ0cycsIFtcbiAgICAgICAgJyRyb290U2NvcGUnLFxuICAgICAgICBmdW5jdGlvbiAoXG4gICAgICAgICAgICAkcm9vdFNjb3BlXG4gICAgICAgICkge1xuICAgICAgICAgICAgdmFyIGFsZXJ0cyA9IFtdO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBhZGRBbGVydDogZnVuY3Rpb24gKGFsZXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWxlcnQuZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KCcjZm9ybS1ncm91cC0nICsgYWxlcnQuZWxlbWVudCkuYWRkQ2xhc3MoJ2hhcy1lcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBnZXRBbGVydHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBBbGVydHMgPSBhbmd1bGFyLmNvcHkoYWxlcnRzKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnRzLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGVtcEFsZXJ0cztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uIHNob3dFcnJvcihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbGVydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlcnJvci5wYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlcnJvcnMgPSBlcnJvci5oYXNPd25Qcm9wZXJ0eSgnZXJyb3JzJykgPyBlcnJvci5lcnJvcnMgOiBlcnJvci5kYXRhLmVycm9ycztcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChlcnJvcnMsIHNob3dFcnJvci5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5ydW4oW1xuICAgICAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICAgICAnJHJvb3RTY29wZScsXG4gICAgICAgICckc3RhdGUnLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLFxuICAgICAgICAgICAgJHJvb3RTY29wZSxcbiAgICAgICAgICAgICRzdGF0ZVxuICAgICAgICApIHtcbiAgICAgICAgICAgIC8vIERldGVybWluZSB0aGUgYWN0aXZlIHN0YXRlLlxuICAgICAgICAgICAgJHJvb3RTY29wZS5pc0FjdGl2ZSA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRzdGF0ZS5jdXJyZW50Lm5hbWUuaW5kZXhPZihzdGF0ZSkgIT09IC0xO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqKiogUkVTT1VSQ0UgVEVNUExBVEVTICoqKioqKiovXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvcmVzb3VyY2UuaHRtbCcsXG4gICAgICAgICAgICAgICAgXCI8aDI+e3sgY3VycmVudFJlc291cmNlLm5hbWUgfCBjYXBpdGFsaXplIH19PC9oMj5cXG48dWwgY2xhc3M9XFxcIm5hdiBuYXYtdGFic1xcXCI+XFxuICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShjdXJyZW50UmVzb3VyY2UubmFtZSArICcudmlldycpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgY3VycmVudFJlc291cmNlLm5hbWUgfX0udmlldygpXFxcIj5WaWV3PC9hPjwvbGk+XFxuICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShjdXJyZW50UmVzb3VyY2UubmFtZSArICcuZWRpdCcpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgY3VycmVudFJlc291cmNlLm5hbWUgfX0uZWRpdCgpXFxcIj5FZGl0PC9hPjwvbGk+XFxuICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShjdXJyZW50UmVzb3VyY2UubmFtZSArICcuZGVsZXRlJyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fS5kZWxldGUoKVxcXCI+RGVsZXRlPC9hPjwvbGk+XFxuPC91bD5cXG48ZGl2IHVpLXZpZXc+PC9kaXY+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9jcmVhdGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgXCI8aDM+TmV3IHt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIHwgY2FwaXRhbGl6ZSB9fTwvaDM+XFxuPGhyPjwvaHI+XFxuPGZvcm1pbyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5mb3JtVXJsXFxcIiBzdWJtaXNzaW9uPVxcXCJzdWJtaXNzaW9uXFxcIiBoaWRlLWNvbXBvbmVudHM9XFxcImhpZGVDb21wb25lbnRzXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2RlbGV0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICBcIjxmb3JtaW8tZGVsZXRlIHNyYz1cXFwiY3VycmVudFJlc291cmNlLnN1Ym1pc3Npb25VcmxcXFwiIHJlc291cmNlLW5hbWU9XFxcInJlc291cmNlTmFtZVxcXCI+PC9mb3JtaW8tZGVsZXRlPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgICBcIjxmb3JtaW8gc3JjPVxcXCJjdXJyZW50UmVzb3VyY2Uuc3VibWlzc2lvblVybFxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICBcIjxmb3JtaW8tZ3JpZCBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5mb3JtVXJsXFxcIiBjb2x1bW5zPVxcXCJjdXJyZW50UmVzb3VyY2UuY29sdW1uc1xcXCIgZ3JpZC1vcHRpb25zPVxcXCJjdXJyZW50UmVzb3VyY2UuZ3JpZE9wdGlvbnNcXFwiPjwvZm9ybWlvLWdyaWQ+PGJyLz5cXG48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fUNyZWF0ZSgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPiBOZXcge3sgY3VycmVudFJlc291cmNlLm5hbWUgfCBjYXBpdGFsaXplIH19PC9hPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2Uvdmlldy5odG1sJyxcbiAgICAgICAgICAgICAgICBcIjxmb3JtaW8gc3JjPVxcXCJjdXJyZW50UmVzb3VyY2Uuc3VibWlzc2lvblVybFxcXCIgcmVhZC1vbmx5PVxcXCJ0cnVlXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgLyoqKiogRk9STSBURU1QTEFURVMgKioqKioqKi9cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL2xpc3QuaHRtbCcsXG4gICAgICAgICAgICAgIFwiPHVsIGNsYXNzPVxcXCJsaXN0LWdyb3VwXFxcIj5cXG4gICAgPGxpIGNsYXNzPVxcXCJsaXN0LWdyb3VwLWl0ZW1cXFwiIG5nLXJlcGVhdD1cXFwiZm9ybSBpbiBmb3Jtc1xcXCI+PGEgdWktc3JlZj1cXFwie3sgYmFzZSB9fWZvcm0udmlldyh7Zm9ybUlkOiBmb3JtLl9pZH0pXFxcIj57eyBmb3JtLnRpdGxlIH19PC9hPjwvbGk+XFxuPC91bD5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgIFwiPGZvcm1pby1mb3JtcyBzcmM9XFxcImZvcm1zU3JjXFxcIiB0YWc9XFxcImZvcm1zVGFnXFxcIiBiYXNlPVxcXCJmb3JtQmFzZVxcXCI+PC9mb3JtaW8tZm9ybXM+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL2Zvcm0uaHRtbCcsXG4gICAgICAgICAgICAgIFwiPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXRhYnNcXFwiPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnZpZXcnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS52aWV3KClcXFwiPkZvcm08L2E+PC9saT5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS5zdWJtaXNzaW9ucycpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnN1Ym1pc3Npb25zKClcXFwiPlN1Ym1pc3Npb25zPC9hPjwvbGk+XFxuPC91bD5cXG48ZGl2IHVpLXZpZXcgc3R5bGU9XFxcIm1hcmdpbi10b3A6MjBweDtcXFwiPjwvZGl2PlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvZm9ybS92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICBcIjxmb3JtaW8gZm9ybT1cXFwiY3VycmVudEZvcm0uZm9ybVxcXCIgZm9ybS1hY3Rpb249XFxcImN1cnJlbnRGb3JtLnVybCArICcvc3VibWlzc2lvbidcXFwiIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAvKioqKiBTVUJNSVNTSU9OIFRFTVBMQVRFUyAqKioqKioqL1xuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgIFwiPGZvcm1pby1ncmlkIHNyYz1cXFwiY3VycmVudEZvcm0udXJsXFxcIiBxdWVyeT1cXFwic3VibWlzc2lvblF1ZXJ5XFxcIiBjb2x1bW5zPVxcXCJzdWJtaXNzaW9uQ29sdW1uc1xcXCI+PC9mb3JtaW8tZ3JpZD5cXG5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vc3VibWlzc2lvbi5odG1sJyxcbiAgICAgICAgICAgICAgXCI8dWwgY2xhc3M9XFxcIm5hdiBuYXYtcGlsbHNcXFwiPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb24udmlldycpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnN1Ym1pc3Npb24udmlldygpXFxcIj5WaWV3PC9hPjwvbGk+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbi5lZGl0Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbi5lZGl0KClcXFwiPkVkaXQ8L2E+PC9saT5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS5zdWJtaXNzaW9uLmRlbGV0ZScpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnN1Ym1pc3Npb24uZGVsZXRlKClcXFwiPkRlbGV0ZTwvYT48L2xpPlxcbjwvdWw+XFxuPGRpdiB1aS12aWV3IHN0eWxlPVxcXCJtYXJnaW4tdG9wOjIwcHg7XFxcIj48L2Rpdj5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vdmlldy5odG1sJyxcbiAgICAgICAgICAgICAgXCI8Zm9ybWlvIGZvcm09XFxcImN1cnJlbnRGb3JtLmZvcm1cXFwiIHN1Ym1pc3Npb249XFxcImN1cnJlbnRTdWJtaXNzaW9uLnN1Ym1pc3Npb25cXFwiIHJlYWQtb25seT1cXFwidHJ1ZVxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgIFwiPGZvcm1pbyBmb3JtPVxcXCJjdXJyZW50Rm9ybS5mb3JtXFxcIiBzdWJtaXNzaW9uPVxcXCJjdXJyZW50U3VibWlzc2lvbi5zdWJtaXNzaW9uXFxcIiBmb3JtLWFjdGlvbj1cXFwiY3VycmVudFN1Ym1pc3Npb24udXJsXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZGVsZXRlLmh0bWwnLFxuICAgICAgICAgICAgICBcIjxmb3JtaW8tZGVsZXRlIHNyYz1cXFwiY3VycmVudFN1Ym1pc3Npb24udXJsXFxcIj48L2Zvcm1pby1kZWxldGU+XFxuXCJcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICBdKTsiXX0=
