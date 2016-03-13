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
                "<h3>New {{ currentResource.name | capitalize }}</h3>\n<hr></hr>\n<formio src=\"currentResource.formUrl\" submission=\"submission\"></formio>\n"
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbmctZm9ybWlvLWhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmFuZ3VsYXIubW9kdWxlKCduZ0Zvcm1pb0hlbHBlcicsIFsnZm9ybWlvJywgJ25nRm9ybWlvR3JpZCcsICd1aS5yb3V0ZXInXSlcbiAgICAuZmlsdGVyKCdjYXBpdGFsaXplJywgW2Z1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXy5jYXBpdGFsaXplO1xuICAgIH1dKVxuICAgIC5maWx0ZXIoJ3RydW5jYXRlJywgW2Z1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQsIG9wdHMpIHtcbiAgICAgICAgICAgIGlmKF8uaXNOdW1iZXIob3B0cykpIHtcbiAgICAgICAgICAgICAgICBvcHRzID0ge2xlbmd0aDogb3B0c307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gXy50cnVuY2F0ZShpbnB1dCwgb3B0cyk7XG4gICAgICAgIH07XG4gICAgfV0pXG4gICAgLmRpcmVjdGl2ZShcImZpbGVyZWFkXCIsIFtcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICBmaWxlcmVhZDogXCI9XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKGNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbiAobG9hZEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZXJlYWQgPSBqUXVlcnkobG9hZEV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGNoYW5nZUV2ZW50LnRhcmdldC5maWxlc1swXSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5wcm92aWRlcignRm9ybWlvUmVzb3VyY2UnLCBbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCB1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc1tuYW1lXSA9IG9wdGlvbnMudGl0bGUgfHwgbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IChvcHRpb25zICYmIG9wdGlvbnMucGFyZW50KSA/IG9wdGlvbnMucGFyZW50IDogbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5SWQgPSBuYW1lICsgJ0lkJztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVtxdWVyeUlkXSA9IHN1Ym1pc3Npb24uX2lkO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZXMgPSAob3B0aW9ucyAmJiBvcHRpb25zLnRlbXBsYXRlcykgPyBvcHRpb25zLnRlbXBsYXRlcyA6IHt9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29udHJvbGxlcnMgPSAob3B0aW9ucyAmJiBvcHRpb25zLmNvbnRyb2xsZXJzKSA/IG9wdGlvbnMuY29udHJvbGxlcnMgOiB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0gb3B0aW9ucy5xdWVyeSA/IG9wdGlvbnMucXVlcnkgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJ0luZGV4Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArIHF1ZXJ5UGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuaW5kZXggPyB0ZW1wbGF0ZXMuaW5kZXggOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVyeUlkOiBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW5zOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBncmlkT3B0aW9uczoge31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdyb3dWaWV3JywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvblZpZXcnLCBmdW5jdGlvbihldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhuYW1lICsgJy52aWV3JywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3N1Ym1pc3Npb25FZGl0JywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcuZWRpdCcsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXNzaW9uRGVsZXRlJywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcuZGVsZXRlJywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuaW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5pbmRleCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnQ3JlYXRlJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9jcmVhdGUvJyArIG5hbWUgKyBxdWVyeVBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5jcmVhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5jcmVhdGUgPyB0ZW1wbGF0ZXMuY3JlYXRlIDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvY3JlYXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVVybDogdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24gPSBvcHRpb25zLmRlZmF1bHRWYWx1ZSA/IG9wdGlvbnMuZGVmYXVsdFZhbHVlIDoge2RhdGE6IHt9fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5jcmVhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmNyZWF0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlID0gKGN0cmwuaGFuZGxlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbihldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArICcvOicgKyBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmFic3RyYWN0ID8gdGVtcGxhdGVzLmFic3RyYWN0IDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvcmVzb3VyY2UuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGh0dHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkaHR0cFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdWJtaXNzaW9uVXJsID0gdXJsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZHBvaW50ID0gb3B0aW9ucy5lbmRwb2ludDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmRwb2ludCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZHBvaW50ICs9ICcvJyArICRzdGF0ZVBhcmFtc1txdWVyeUlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25VcmwgKz0gJy9zdWJtaXNzaW9uLycgKyAkc3RhdGVQYXJhbXNbcXVlcnlJZF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSAkc2NvcGVbbmFtZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVyeUlkOiBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uVXJsOiBzdWJtaXNzaW9uVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1pbzogKG5ldyBGb3JtaW8oc3VibWlzc2lvblVybCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBocmVmOiAnLyMvJyArIG5hbWUgKyAnLycgKyAkc3RhdGVQYXJhbXNbcXVlcnlJZF0gKyAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnQgPyAkc2NvcGVbcGFyZW50XSA6IHtocmVmOiAnLyMvJywgbmFtZTogJ2hvbWUnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkRm9ybVByb21pc2UgPSAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm1pby5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UuZm9ybSA9ICRzY29wZVtuYW1lXS5mb3JtID0gZm9ybTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiB0aGV5IHByb3ZpZGUgdGhlaXIgb3duIGVuZHBvaW50IGZvciBkYXRhLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZW5kcG9pbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZSA9ICRodHRwLmdldChlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAneC1qd3QtdG9rZW4nOiBGb3JtaW8uZ2V0VG9rZW4oKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5yZXNvdXJjZSA9IHJlc3VsdC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0LmRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZSA9ICRzY29wZS5jdXJyZW50UmVzb3VyY2UuZm9ybWlvLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UucmVzb3VyY2UgPSAkc2NvcGVbbmFtZV0uc3VibWlzc2lvbiA9IHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuYWJzdHJhY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5hYnN0cmFjdCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLnZpZXcnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMudmlldyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnZpZXcgPyB0ZW1wbGF0ZXMudmlldyA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy52aWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSArICcuZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZWRpdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuZWRpdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmVkaXQgPyB0ZW1wbGF0ZXMuZWRpdCA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZWRpdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjdHJsID0gJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuZWRpdCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlID0gKGN0cmwuaGFuZGxlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbihldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSArICcuZGVsZXRlJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9kZWxldGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmRlbGV0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmRlbGV0ZSA/IHRlbXBsYXRlcy5kZWxldGUgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVzb3VyY2VOYW1lID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5kZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmRlbGV0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlID0gKGN0cmwuaGFuZGxlIHx8IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZGVsZXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnQgJiYgcGFyZW50ICE9PSAnaG9tZScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhwYXJlbnQgKyAnLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScsIG51bGwsIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAkZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuZGlyZWN0aXZlKCdmb3JtaW9Gb3JtcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgIHNyYzogJz0nLFxuICAgICAgICAgICAgICAgIGJhc2U6ICc9JyxcbiAgICAgICAgICAgICAgICB0YWc6ICc9PydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby1oZWxwZXIvZm9ybS9saXN0Lmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnRm9ybWlvJywgZnVuY3Rpb24oJHNjb3BlLCBGb3JtaW8pIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybXMgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9ybSdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmICgkc2NvcGUudGFnKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy50YWdzID0gJHNjb3BlLnRhZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKG5ldyBGb3JtaW8oJHNjb3BlLnNyYykpLmxvYWRGb3Jtcyh7cGFyYW1zOiBwYXJhbXN9KS50aGVuKGZ1bmN0aW9uKGZvcm1zKSB7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtcyA9IGZvcm1zO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICB9KVxuICAgIC5wcm92aWRlcignRm9ybWlvRm9ybXMnLCBbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICkge1xuICAgICAgICAgICAgdmFyIHJlc291cmNlcyA9IHt9O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgdXJsLCBvcHRpb25zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZXMgPSAob3B0aW9ucyAmJiBvcHRpb25zLnRlbXBsYXRlcykgPyBvcHRpb25zLnRlbXBsYXRlcyA6IHt9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29udHJvbGxlcnMgPSAob3B0aW9ucyAmJiBvcHRpb25zLmNvbnRyb2xsZXJzKSA/IG9wdGlvbnMuY29udHJvbGxlcnMgOiB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJhc2VQYXRoID0gbmFtZSA/IG5hbWUgKyAnLicgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtSW5kZXgnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2Zvcm1zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuaW5kZXggPyB0ZW1wbGF0ZXMuaW5kZXggOiAnZm9ybWlvLWhlbHBlci9mb3JtL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFsnJHNjb3BlJywgJ0Zvcm1pbycsICckY29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgRm9ybWlvLCAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybUJhc2UgPSBiYXNlUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1zU3JjID0gdXJsICsgJy9mb3JtJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1zVGFnID0gb3B0aW9ucy50YWc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5pbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuaW5kZXgsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZm9ybS86Zm9ybUlkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmZvcm0gPyB0ZW1wbGF0ZXMuZm9ybSA6ICdmb3JtaW8taGVscGVyL2Zvcm0vZm9ybS5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZvcm1VcmwgPSB1cmwgKyAnL2Zvcm0vJyArICRzdGF0ZVBhcmFtcy5mb3JtSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybUJhc2UgPSBiYXNlUGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogZm9ybVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLmZvcm1pbyA9IChuZXcgRm9ybWlvKGZvcm1VcmwpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5wcm9taXNlID0gJHNjb3BlLmN1cnJlbnRGb3JtLmZvcm1pby5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5mb3JtID0gZm9ybTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmZvcm0sIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnZpZXcnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy52aWV3LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMudmlldyA/IHRlbXBsYXRlcy52aWV3IDogJ2Zvcm1pby1oZWxwZXIvZm9ybS92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRm9ybWlvVXRpbHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb1V0aWxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24gPSB7ZGF0YToge319O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZmllbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0ucHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbi5kYXRhW29wdGlvbnMuZmllbGRdID0gcmVzb3VyY2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscy5oaWRlRmllbGRzKCRzY29wZS5jdXJyZW50Rm9ybS5mb3JtLCBbb3B0aW9ucy5maWVsZF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbnMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy52aWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9ucycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvc3VibWlzc2lvbnMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvbnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9ucyA/IHRlbXBsYXRlcy5zdWJtaXNzaW9ucyA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRm9ybWlvVXRpbHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uUXVlcnkgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uQ29sdW1ucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZmllbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvblF1ZXJ5WydkYXRhLicgKyBvcHRpb25zLmZpZWxkICsgJy5faWQnXSA9ICRzdGF0ZVBhcmFtc1tuYW1lICsgJ0lkJ107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBzdWJtaXNzaW9uIHdoZW4gdGhleSBjbGljayBvbiB0aGUgcm93LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbigncm93VmlldycsIGZ1bmN0aW9uKGV2ZW50LCBlbnRpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1JZDogZW50aXR5LmZvcm0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb25JZDogZW50aXR5Ll9pZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFdhaXQgdW50aWwgdGhlIGN1cnJlbnQgZm9ybSBpcyBsb2FkZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0ucHJvbWlzZS50aGVuKGZ1bmN0aW9uKGZvcm0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9VdGlscy5lYWNoQ29tcG9uZW50KGZvcm0uY29tcG9uZW50cywgZnVuY3Rpb24oY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50LmtleSB8fCAhY29tcG9uZW50LmlucHV0IHx8ICFjb21wb25lbnQudGFibGVWaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuZmllbGQgJiYgKGNvbXBvbmVudC5rZXkgPT09IG9wdGlvbnMuZmllbGQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25Db2x1bW5zLnB1c2goY29tcG9uZW50LmtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2UgcmVsb2FkIHRoZSBkYXRhIGdyaWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3JlbG9hZEdyaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9ucywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbicsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvc3VibWlzc2lvbi86c3VibWlzc2lvbklkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9uID8gdGVtcGxhdGVzLnN1Ym1pc3Npb24gOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL3N1Ym1pc3Npb24uaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGb3JtaW8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICRzY29wZS5jdXJyZW50Rm9ybS51cmwgKyAnL3N1Ym1pc3Npb24vJyArICRzdGF0ZVBhcmFtcy5zdWJtaXNzaW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Ym1pc3Npb246IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIHRoZSBmb3JtaW8gb2JqZWN0LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5mb3JtaW8gPSAobmV3IEZvcm1pbygkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24udXJsKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIHRoZSBjdXJyZW50IHN1Ym1pc3Npb24uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnByb21pc2UgPSAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uZm9ybWlvLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5zdWJtaXNzaW9uID0gc3VibWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRoZSBjb250cm9sbGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb24sIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvblZpZXcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5zdWJtaXNzaW9uVmlldyA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uVmlldyA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vdmlldy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25WaWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25WaWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24uZWRpdCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2VkaXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25FZGl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25FZGl0ID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25FZGl0IDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbkVkaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbkVkaXQsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24uZGVsZXRlJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZGVsZXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uRGVsZXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25EZWxldGUgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbkRlbGV0ZSA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZGVsZXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2RlbGV0ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9ucycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignY2FuY2VsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24udmlldycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25EZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbkRlbGV0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvdXJjZXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLnByb3ZpZGVyKCdGb3JtaW9BdXRoJywgW1xuICAgICAgICAnJHN0YXRlUHJvdmlkZXInLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICkge1xuICAgICAgICAgICAgdmFyIGFub25TdGF0ZSA9ICdhdXRoLmxvZ2luJztcbiAgICAgICAgICAgIHZhciBhdXRoU3RhdGUgPSAnaG9tZSc7XG4gICAgICAgICAgICB2YXIgZm9yY2VBdXRoID0gZmFsc2U7XG4gICAgICAgICAgICB2YXIgcmVnaXN0ZXJlZCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzZXRGb3JjZUF1dGg6IGZ1bmN0aW9uKGZvcmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvcmNlQXV0aCA9IGZvcmNlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0U3RhdGVzOiBmdW5jdGlvbihhbm9uLCBhdXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFub25TdGF0ZSA9IGFub247XG4gICAgICAgICAgICAgICAgICAgIGF1dGhTdGF0ZSA9IGF1dGg7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgcmVzb3VyY2UsIHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWdpc3RlcmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWdpc3RlcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhdXRoJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9hdXRoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvYXV0aC5odG1sJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhdGgpIHsgcGF0aCA9IG5hbWU7IH1cbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZSgnYXV0aC4nICsgbmFtZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nICsgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6ICdhdXRoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvJyArIG5hbWUudG9Mb3dlckNhc2UoKSArICcuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJHN0YXRlJywgJyRyb290U2NvcGUnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJHJvb3RTY29wZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uKGVyciwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWJtaXNzaW9uKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKHN1Ym1pc3Npb24sIHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhdXRoU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICRnZXQ6IFtcbiAgICAgICAgICAgICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgICAgICAgICAgICdGb3JtaW9BbGVydHMnLFxuICAgICAgICAgICAgICAgICAgICAnJHJvb3RTY29wZScsXG4gICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb0FsZXJ0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5pc1JvbGUgPSBmdW5jdGlvbihyb2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5yb2xlID09PSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlciA9IGZ1bmN0aW9uKHVzZXIsIHJvbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZm9ybWlvQXBwVXNlcicsIGFuZ3VsYXIudG9Kc29uKHVzZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb0FwcFVzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVXNlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9Ub2tlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJvbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9BcHBSb2xlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb0FwcFJvbGUnLCByb2xlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hdXRoZW50aWNhdGVkID0gISFGb3JtaW8uZ2V0VG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3VzZXInLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcjogJHJvb3RTY29wZS51c2VyLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvbGU6ICRyb290U2NvcGUucm9sZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBjdXJyZW50IHVzZXIgb2JqZWN0IGFuZCByb2xlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdXNlciA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9BcHBVc2VyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXIgPyBhbmd1bGFyLmZyb21Kc29uKHVzZXIpIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9BcHBSb2xlJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISRyb290U2NvcGUudXNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvLmN1cnJlbnRVc2VyKCkudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKHVzZXIsIGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdmb3JtaW9Sb2xlJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbG9nb3V0RXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9BbGVydHMuYWRkQWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdZb3VyIHNlc3Npb24gaGFzIGV4cGlyZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2Zvcm1pby5zZXNzaW9uRXhwaXJlZCcsIGxvZ291dEVycm9yKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHdoZW4gYSBsb2dvdXQgb2NjdXJzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGxvZ291dEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgdGhleSBhcmUgbG9nZ2VkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbihldmVudCwgdG9TdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hdXRoZW50aWNhdGVkID0gISFGb3JtaW8uZ2V0VG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3JjZUF1dGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9TdGF0ZS5uYW1lLnN1YnN0cigwLCA0KSA9PT0gJ2F1dGgnKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS5hdXRoZW50aWNhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUsIHt9LCB7cmVsb2FkOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGFsZXJ0c1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hbGVydHMgPSBGb3JtaW9BbGVydHMuZ2V0QWxlcnRzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuZmFjdG9yeSgnRm9ybWlvQWxlcnRzJywgW1xuICAgICAgICAnJHJvb3RTY29wZScsXG4gICAgICAgIGZ1bmN0aW9uIChcbiAgICAgICAgICAgICRyb290U2NvcGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB2YXIgYWxlcnRzID0gW107XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGFkZEFsZXJ0OiBmdW5jdGlvbiAoYWxlcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hbGVydHMucHVzaChhbGVydCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbGVydC5lbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoJyNmb3JtLWdyb3VwLScgKyBhbGVydC5lbGVtZW50KS5hZGRDbGFzcygnaGFzLWVycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGVydHMucHVzaChhbGVydCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGdldEFsZXJ0czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcEFsZXJ0cyA9IGFuZ3VsYXIuY29weShhbGVydHMpO1xuICAgICAgICAgICAgICAgICAgICBhbGVydHMubGVuZ3RoID0gMDtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZW1wQWxlcnRzO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25FcnJvcjogZnVuY3Rpb24gc2hvd0Vycm9yKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvci5tZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFsZXJ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZGFuZ2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQ6IGVycm9yLnBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9ycyA9IGVycm9yLmhhc093blByb3BlcnR5KCdlcnJvcnMnKSA/IGVycm9yLmVycm9ycyA6IGVycm9yLmRhdGEuZXJyb3JzO1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGVycm9ycywgc2hvd0Vycm9yLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLnJ1bihbXG4gICAgICAgICckdGVtcGxhdGVDYWNoZScsXG4gICAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUsXG4gICAgICAgICAgICAkcm9vdFNjb3BlLFxuICAgICAgICAgICAgJHN0YXRlXG4gICAgICAgICkge1xuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBhY3RpdmUgc3RhdGUuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLmlzQWN0aXZlID0gZnVuY3Rpb24oc3RhdGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHN0YXRlLmN1cnJlbnQubmFtZS5pbmRleE9mKHN0YXRlKSAhPT0gLTE7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvKioqKiBSRVNPVVJDRSBURU1QTEFURVMgKioqKioqKi9cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9yZXNvdXJjZS5odG1sJyxcbiAgICAgICAgICAgICAgICBcIjxoMj57eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2gyPlxcbjx1bCBjbGFzcz1cXFwibmF2IG5hdi10YWJzXFxcIj5cXG4gIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGN1cnJlbnRSZXNvdXJjZS5uYW1lICsgJy52aWV3Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fS52aWV3KClcXFwiPlZpZXc8L2E+PC9saT5cXG4gIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGN1cnJlbnRSZXNvdXJjZS5uYW1lICsgJy5lZGl0Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fS5lZGl0KClcXFwiPkVkaXQ8L2E+PC9saT5cXG4gIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGN1cnJlbnRSZXNvdXJjZS5uYW1lICsgJy5kZWxldGUnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LmRlbGV0ZSgpXFxcIj5EZWxldGU8L2E+PC9saT5cXG48L3VsPlxcbjxkaXYgdWktdmlldz48L2Rpdj5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2NyZWF0ZS5odG1sJyxcbiAgICAgICAgICAgICAgICBcIjxoMz5OZXcge3sgY3VycmVudFJlc291cmNlLm5hbWUgfCBjYXBpdGFsaXplIH19PC9oMz5cXG48aHI+PC9ocj5cXG48Zm9ybWlvIHNyYz1cXFwiY3VycmVudFJlc291cmNlLmZvcm1VcmxcXFwiIHN1Ym1pc3Npb249XFxcInN1Ym1pc3Npb25cXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZGVsZXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGZvcm1pby1kZWxldGUgc3JjPVxcXCJjdXJyZW50UmVzb3VyY2Uuc3VibWlzc2lvblVybFxcXCIgcmVzb3VyY2UtbmFtZT1cXFwicmVzb3VyY2VOYW1lXFxcIj48L2Zvcm1pby1kZWxldGU+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGZvcm1pbyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGZvcm1pby1ncmlkIHNyYz1cXFwiY3VycmVudFJlc291cmNlLmZvcm1VcmxcXFwiIGNvbHVtbnM9XFxcImN1cnJlbnRSZXNvdXJjZS5jb2x1bW5zXFxcIiBncmlkLW9wdGlvbnM9XFxcImN1cnJlbnRSZXNvdXJjZS5ncmlkT3B0aW9uc1xcXCI+PC9mb3JtaW8tZ3JpZD48YnIvPlxcbjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19Q3JlYXRlKClcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+IE5ldyB7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2E+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGZvcm1pbyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIiByZWFkLW9ubHk9XFxcInRydWVcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAvKioqKiBGT1JNIFRFTVBMQVRFUyAqKioqKioqL1xuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vbGlzdC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8dWwgY2xhc3M9XFxcImxpc3QtZ3JvdXBcXFwiPlxcbiAgICA8bGkgY2xhc3M9XFxcImxpc3QtZ3JvdXAtaXRlbVxcXCIgbmctcmVwZWF0PVxcXCJmb3JtIGluIGZvcm1zXFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBiYXNlIH19Zm9ybS52aWV3KHtmb3JtSWQ6IGZvcm0uX2lkfSlcXFwiPnt7IGZvcm0udGl0bGUgfX08L2E+PC9saT5cXG48L3VsPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvZm9ybS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8Zm9ybWlvLWZvcm1zIHNyYz1cXFwiZm9ybXNTcmNcXFwiIHRhZz1cXFwiZm9ybXNUYWdcXFwiIGJhc2U9XFxcImZvcm1CYXNlXFxcIj48L2Zvcm1pby1mb3Jtcz5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vZm9ybS5odG1sJyxcbiAgICAgICAgICAgICAgXCI8dWwgY2xhc3M9XFxcIm5hdiBuYXYtdGFic1xcXCI+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0udmlldycpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnZpZXcoKVxcXCI+Rm9ybTwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb25zJyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbnMoKVxcXCI+U3VibWlzc2lvbnM8L2E+PC9saT5cXG48L3VsPlxcbjxkaXYgdWktdmlldyBzdHlsZT1cXFwibWFyZ2luLXRvcDoyMHB4O1xcXCI+PC9kaXY+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgIFwiPGZvcm1pbyBmb3JtPVxcXCJjdXJyZW50Rm9ybS5mb3JtXFxcIiBmb3JtLWFjdGlvbj1cXFwiY3VycmVudEZvcm0udXJsICsgJy9zdWJtaXNzaW9uJ1xcXCIgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8qKioqIFNVQk1JU1NJT04gVEVNUExBVEVTICoqKioqKiovXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8Zm9ybWlvLWdyaWQgc3JjPVxcXCJjdXJyZW50Rm9ybS51cmxcXFwiIHF1ZXJ5PVxcXCJzdWJtaXNzaW9uUXVlcnlcXFwiIGNvbHVtbnM9XFxcInN1Ym1pc3Npb25Db2x1bW5zXFxcIj48L2Zvcm1pby1ncmlkPlxcblxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9zdWJtaXNzaW9uLmh0bWwnLFxuICAgICAgICAgICAgICBcIjx1bCBjbGFzcz1cXFwibmF2IG5hdi1waWxsc1xcXCI+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbi52aWV3KClcXFwiPlZpZXc8L2E+PC9saT5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS5zdWJtaXNzaW9uLmVkaXQnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9uLmVkaXQoKVxcXCI+RWRpdDwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb24uZGVsZXRlJyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbi5kZWxldGUoKVxcXCI+RGVsZXRlPC9hPjwvbGk+XFxuPC91bD5cXG48ZGl2IHVpLXZpZXcgc3R5bGU9XFxcIm1hcmdpbi10b3A6MjBweDtcXFwiPjwvZGl2PlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICBcIjxmb3JtaW8gZm9ybT1cXFwiY3VycmVudEZvcm0uZm9ybVxcXCIgc3VibWlzc2lvbj1cXFwiY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvblxcXCIgcmVhZC1vbmx5PVxcXCJ0cnVlXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8Zm9ybWlvIGZvcm09XFxcImN1cnJlbnRGb3JtLmZvcm1cXFwiIHN1Ym1pc3Npb249XFxcImN1cnJlbnRTdWJtaXNzaW9uLnN1Ym1pc3Npb25cXFwiIGZvcm0tYWN0aW9uPVxcXCJjdXJyZW50U3VibWlzc2lvbi51cmxcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgIFwiPGZvcm1pby1kZWxldGUgc3JjPVxcXCJjdXJyZW50U3VibWlzc2lvbi51cmxcXFwiPjwvZm9ybWlvLWRlbGV0ZT5cXG5cIlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIF0pOyJdfQ==
