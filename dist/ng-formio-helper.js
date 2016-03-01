(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

angular.module('ngFormioHelper', ['formio', 'ui.router'])
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
                    resources[name] = options.title || name;
                    var parent = (options && options.parent) ? options.parent : null;
                    var queryId = name + 'Id';
                    var query = function(submission) {
                        var query = {};
                        query[queryId] = submission._id;
                        return query;
                    };
                    var controller = function(ctrl) {
                        return ['$scope', '$rootScope', '$state', '$stateParams', 'Formio', 'FormioUtils', '$controller', ctrl];
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
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
                                $scope.currentResource = {
                                    name: name,
                                    queryId: queryId,
                                    formUrl: url
                                };
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
                            })
                        })
                        .state(name + 'Create', {
                            url: '/create/' + name + queryParams,
                            parent: parent ? parent : null,
                            params: options.params && options.params.create,
                            templateUrl: templates.create ? templates.create : 'formio-helper/resource/create.html',
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
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
                            })
                        })
                        .state(name, {
                            abstract: true,
                            url: '/' + name + '/:' + queryId,
                            parent: parent ? parent : null,
                            templateUrl: templates.abstract ? templates.abstract : 'formio-helper/resource/resource.html',
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
                                var submissionUrl = url + '/submission/' + $stateParams[queryId];
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
                                $scope.currentResource.loadSubmissionPromise = $scope.currentResource.formio.loadSubmission().then(function(submission) {
                                    $scope.currentResource.resource = $scope[name].submission = submission;
                                    return submission;
                                });

                                if (controllers.abstract) {
                                    $controller(controllers.abstract, {$scope: $scope});
                                }
                            })
                        })
                        .state(name + '.view', {
                            url: '/',
                            parent: name,
                            params: options.params && options.params.view,
                            templateUrl: templates.view ? templates.view : 'formio-helper/resource/view.html',
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
                                if (controllers.view) {
                                    $controller(controllers.view, {$scope: $scope});
                                }
                            })
                        })
                        .state(name + '.edit', {
                            url: '/edit',
                            parent: name,
                            params: options.params && options.params.edit,
                            templateUrl: templates.edit ? templates.edit : 'formio-helper/resource/edit.html',
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
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
                            })
                        })
                        .state(name + '.delete', {
                            url: '/delete',
                            parent: name,
                            params: options.params && options.params.delete,
                            templateUrl: templates.delete ? templates.delete : 'formio-helper/resource/delete.html',
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
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
                            })
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
            $stateProvider.state('auth', {
                abstract: true,
                url: '/auth',
                templateUrl: 'views/user/auth.html'
            });
            return {
                setForceAuth: function(force) {
                    forceAuth = force;
                },
                setStates: function(anon, auth) {
                    anonState = anon;
                    authState = auth;
                },
                register: function(name, resource, path) {
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
                "<formio-submissions src=\"currentResource.formUrl\"></formio-submissions>\n<a ui-sref=\"{{ currentResource.name }}Create()\" class=\"btn btn-primary\"><span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> New {{ currentResource.name | capitalize }}</a>\n"
            );

            $templateCache.put('formio-helper/resource/view.html',
                "<formio src=\"currentResource.submissionUrl\" read-only=\"true\"></formio>\n"
            );

            /**** FORM TEMPLATES *******/
            $templateCache.put('formio-helper/form/list.html',
              "<ul class=\"list-group\">\n    <li class=\"list-group-item\" ng-repeat=\"form in forms\"><a ui-sref=\"{{ base }}form.view({formId: form._id})\">{{ form.title }}</a></li>\n</ul>"
            );

            $templateCache.put('formio-helper/form/index.html',
              "<formio-forms src=\"formsSrc\" tag=\"formsTag\" base=\"formBase\"></formio-forms>"
            );

            $templateCache.put('formio-helper/form/form.html',
              "<ul class=\"nav nav-tabs\">\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.view')}\"><a ui-sref=\"{{ formBase }}form.view()\">Form</a></li>\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submissions')}\"><a ui-sref=\"{{ formBase }}form.submissions()\">Submissions</a></li>\n</ul>\n<div ui-view style=\"margin-top:20px;\"></div>"
            );

            $templateCache.put('formio-helper/form/view.html',
              "<formio form=\"currentForm.form\" form-action=\"currentForm.url + '/submission'\" submission=\"submission\"></formio>"
            );

            /**** SUBMISSION TEMPLATES *******/
            $templateCache.put('formio-helper/submission/index.html',
              "<formio-grid src=\"currentForm.url\" query=\"submissionQuery\" columns=\"submissionColumns\"></formio-grid>"
            );

            $templateCache.put('formio-helper/submission/submission.html',
              "<ul class=\"nav nav-pills\">\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.view')}\"><a ui-sref=\"{{ formBase }}form.submission.view()\">View</a></li>\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.edit')}\"><a ui-sref=\"{{ formBase }}form.submission.edit()\">Edit</a></li>\n    <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.delete')}\"><a ui-sref=\"{{ formBase }}form.submission.delete()\">Delete</a></li>\n</ul>\n<div ui-view style=\"margin-top:20px;\"></div>"
            );

            $templateCache.put('formio-helper/submission/view.html',
              "<formio form=\"currentForm.form\" submission=\"currentSubmission.submission\" read-only=\"true\"></formio>"
            );

            $templateCache.put('formio-helper/submission/edit.html',
              "<formio form=\"currentForm.form\" submission=\"currentSubmission.submission\" form-action=\"currentSubmission.url\"></formio>"
            );

            $templateCache.put('formio-helper/submission/delete.html',
              "<formio-delete src=\"currentSubmission.url\"></formio-delete>"
            );
        }
    ]);
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbmctZm9ybWlvLWhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmFuZ3VsYXIubW9kdWxlKCduZ0Zvcm1pb0hlbHBlcicsIFsnZm9ybWlvJywgJ3VpLnJvdXRlciddKVxuICAgIC5maWx0ZXIoJ2NhcGl0YWxpemUnLCBbZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBfLmNhcGl0YWxpemU7XG4gICAgfV0pXG4gICAgLmZpbHRlcigndHJ1bmNhdGUnLCBbZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihpbnB1dCwgb3B0cykge1xuICAgICAgICAgICAgaWYoXy5pc051bWJlcihvcHRzKSkge1xuICAgICAgICAgICAgICAgIG9wdHMgPSB7bGVuZ3RoOiBvcHRzfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfLnRydW5jYXRlKGlucHV0LCBvcHRzKTtcbiAgICAgICAgfTtcbiAgICB9XSlcbiAgICAuZGlyZWN0aXZlKFwiZmlsZXJlYWRcIiwgW1xuICAgICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVyZWFkOiBcIj1cIlxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYmluZChcImNoYW5nZVwiLCBmdW5jdGlvbiAoY2hhbmdlRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uIChsb2FkRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS4kYXBwbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZS5maWxlcmVhZCA9IGpRdWVyeShsb2FkRXZlbnQudGFyZ2V0LnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc1RleHQoY2hhbmdlRXZlbnQudGFyZ2V0LmZpbGVzWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLnByb3ZpZGVyKCdGb3JtaW9SZXNvdXJjZScsIFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICApIHtcbiAgICAgICAgICAgIHZhciByZXNvdXJjZXMgPSB7fTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIHVybCwgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNbbmFtZV0gPSBvcHRpb25zLnRpdGxlIHx8IG5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnQgPSAob3B0aW9ucyAmJiBvcHRpb25zLnBhcmVudCkgPyBvcHRpb25zLnBhcmVudCA6IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeUlkID0gbmFtZSArICdJZCc7XG4gICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9IGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBxdWVyeSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlbcXVlcnlJZF0gPSBzdWJtaXNzaW9uLl9pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBxdWVyeTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXIgPSBmdW5jdGlvbihjdHJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWyckc2NvcGUnLCAnJHJvb3RTY29wZScsICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJywgJ0Zvcm1pbycsICdGb3JtaW9VdGlscycsICckY29udHJvbGxlcicsIGN0cmxdO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wbGF0ZXMgPSAob3B0aW9ucyAmJiBvcHRpb25zLnRlbXBsYXRlcykgPyBvcHRpb25zLnRlbXBsYXRlcyA6IHt9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29udHJvbGxlcnMgPSAob3B0aW9ucyAmJiBvcHRpb25zLmNvbnRyb2xsZXJzKSA/IG9wdGlvbnMuY29udHJvbGxlcnMgOiB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0gb3B0aW9ucy5xdWVyeSA/IG9wdGlvbnMucXVlcnkgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJ0luZGV4Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArIHF1ZXJ5UGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuaW5kZXggPyB0ZW1wbGF0ZXMuaW5kZXggOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBjb250cm9sbGVyKGZ1bmN0aW9uKCRzY29wZSwgJHJvb3RTY29wZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMsIEZvcm1pbywgRm9ybWlvVXRpbHMsICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnlJZDogcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1Vcmw6IHVybFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXNzaW9uVmlldycsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvbkVkaXQnLCBmdW5jdGlvbihldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLmVkaXQnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3N1Ym1pc3Npb25EZWxldGUnLCBmdW5jdGlvbihldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLmRlbGV0ZScsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5pbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuaW5kZXgsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSArICdDcmVhdGUnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2NyZWF0ZS8nICsgbmFtZSArIHF1ZXJ5UGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmNyZWF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmNyZWF0ZSA/IHRlbXBsYXRlcy5jcmVhdGUgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9jcmVhdGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogY29udHJvbGxlcihmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsICRzdGF0ZSwgJHN0YXRlUGFyYW1zLCBGb3JtaW8sIEZvcm1pb1V0aWxzLCAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtVXJsOiB1cmxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24gPSBvcHRpb25zLmRlZmF1bHRWYWx1ZSA/IG9wdGlvbnMuZGVmYXVsdFZhbHVlIDoge2RhdGE6IHt9fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuY3JlYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmNyZWF0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLnZpZXcnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyArIG5hbWUgKyAnLzonICsgcXVlcnlJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/IHBhcmVudCA6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5hYnN0cmFjdCA/IHRlbXBsYXRlcy5hYnN0cmFjdCA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IGNvbnRyb2xsZXIoZnVuY3Rpb24oJHNjb3BlLCAkcm9vdFNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcywgRm9ybWlvLCBGb3JtaW9VdGlscywgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN1Ym1pc3Npb25VcmwgPSB1cmwgKyAnL3N1Ym1pc3Npb24vJyArICRzdGF0ZVBhcmFtc1txdWVyeUlkXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZSA9ICRzY29wZVtuYW1lXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVyeUlkOiBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvblVybDogc3VibWlzc2lvblVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1pbzogKG5ldyBGb3JtaW8oc3VibWlzc2lvblVybCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2U6IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybToge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBocmVmOiAnLyMvJyArIG5hbWUgKyAnLycgKyAkc3RhdGVQYXJhbXNbcXVlcnlJZF0gKyAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudCA/ICRzY29wZVtwYXJlbnRdIDoge2hyZWY6ICcvIy8nLCBuYW1lOiAnaG9tZSd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5sb2FkRm9ybVByb21pc2UgPSAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm1pby5sb2FkRm9ybSgpLnRoZW4oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZS5mb3JtID0gJHNjb3BlW25hbWVdLmZvcm0gPSBmb3JtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZSA9ICRzY29wZS5jdXJyZW50UmVzb3VyY2UuZm9ybWlvLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLnJlc291cmNlID0gJHNjb3BlW25hbWVdLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5hYnN0cmFjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuYWJzdHJhY3QsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSArICcudmlldycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy52aWV3LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMudmlldyA/IHRlbXBsYXRlcy52aWV3IDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2Uvdmlldy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBjb250cm9sbGVyKGZ1bmN0aW9uKCRzY29wZSwgJHJvb3RTY29wZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMsIEZvcm1pbywgRm9ybWlvVXRpbHMsICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy52aWV3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy52aWV3LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLmVkaXQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnL2VkaXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmVkaXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5lZGl0ID8gdGVtcGxhdGVzLmVkaXQgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IGNvbnRyb2xsZXIoZnVuY3Rpb24oJHNjb3BlLCAkcm9vdFNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcywgRm9ybWlvLCBGb3JtaW9VdGlscywgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZWRpdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN0cmwgPSAkY29udHJvbGxlcihjb250cm9sbGVycy5lZGl0LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSArICcuZGVsZXRlJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9kZWxldGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmRlbGV0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmRlbGV0ZSA/IHRlbXBsYXRlcy5kZWxldGUgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogY29udHJvbGxlcihmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsICRzdGF0ZSwgJHN0YXRlUGFyYW1zLCBGb3JtaW8sIEZvcm1pb1V0aWxzLCAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5yZXNvdXJjZU5hbWUgPSBuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLmRlbGV0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdkZWxldGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudCAhPT0gJ2hvbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhwYXJlbnQgKyAnLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScsIG51bGwsIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICRnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb3VyY2VzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5kaXJlY3RpdmUoJ2Zvcm1pb0Zvcm1zJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICAgICAgcmVwbGFjZTogdHJ1ZSxcbiAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgc3JjOiAnPScsXG4gICAgICAgICAgICAgICAgYmFzZTogJz0nLFxuICAgICAgICAgICAgICAgIHRhZzogJz0/J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZm9ybWlvLWhlbHBlci9mb3JtL2xpc3QuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICdGb3JtaW8nLCBmdW5jdGlvbigkc2NvcGUsIEZvcm1pbykge1xuICAgICAgICAgICAgICAgICRzY29wZS5mb3JtcyA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb3JtJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKCRzY29wZS50YWcpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnRhZ3MgPSAkc2NvcGUudGFnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAobmV3IEZvcm1pbygkc2NvcGUuc3JjKSkubG9hZEZvcm1zKHtwYXJhbXM6IHBhcmFtc30pLnRoZW4oZnVuY3Rpb24oZm9ybXMpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZvcm1zID0gZm9ybXM7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgIH0pXG4gICAgLnByb3ZpZGVyKCdGb3JtaW9Gb3JtcycsIFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCB1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlcyA9IChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGVzKSA/IG9wdGlvbnMudGVtcGxhdGVzIDoge307XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb250cm9sbGVycyA9IChvcHRpb25zICYmIG9wdGlvbnMuY29udHJvbGxlcnMpID8gb3B0aW9ucy5jb250cm9sbGVycyA6IHt9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmFzZVBhdGggPSBuYW1lID8gbmFtZSArICcuJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm1JbmRleCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZm9ybXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5pbmRleCA/IHRlbXBsYXRlcy5pbmRleCA6ICdmb3JtaW8taGVscGVyL2Zvcm0vaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnRm9ybWlvJywgJyRjb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCBGb3JtaW8sICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtQmFzZSA9IGJhc2VQYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybXNTcmMgPSB1cmwgKyAnL2Zvcm0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuZm9ybXNUYWcgPSBvcHRpb25zLnRhZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLmluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5pbmRleCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9mb3JtLzpmb3JtSWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuZm9ybSA/IHRlbXBsYXRlcy5mb3JtIDogJ2Zvcm1pby1oZWxwZXIvZm9ybS9mb3JtLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzY29wZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZVBhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZm9ybVVybCA9IHVybCArICcvZm9ybS8nICsgJHN0YXRlUGFyYW1zLmZvcm1JZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5mb3JtQmFzZSA9IGJhc2VQYXRoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBmb3JtVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm06IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudEZvcm0uZm9ybWlvID0gKG5ldyBGb3JtaW8oZm9ybVVybCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLnByb21pc2UgPSAkc2NvcGUuY3VycmVudEZvcm0uZm9ybWlvLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRGb3JtLmZvcm0gPSBmb3JtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5mb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuZm9ybSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0udmlldycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnZpZXcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy52aWV3ID8gdGVtcGxhdGVzLnZpZXcgOiAnZm9ybWlvLWhlbHBlci9mb3JtL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvVXRpbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbiA9IHtkYXRhOiB7fX07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5wcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50UmVzb3VyY2UubG9hZFN1Ym1pc3Npb25Qcm9taXNlLnRoZW4oZnVuY3Rpb24ocmVzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uLmRhdGFbb3B0aW9ucy5maWVsZF0gPSByZXNvdXJjZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb1V0aWxzLmhpZGVGaWVsZHMoJHNjb3BlLmN1cnJlbnRGb3JtLmZvcm0sIFtvcHRpb25zLmZpZWxkXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9ucycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMudmlldykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnZpZXcsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb25zJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9zdWJtaXNzaW9ucycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25zID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25zIDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdGb3JtaW9VdGlscycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckY29udHJvbGxlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb1V0aWxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25RdWVyeSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb25Db2x1bW5zID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5zdWJtaXNzaW9uUXVlcnlbJ2RhdGEuJyArIG9wdGlvbnMuZmllbGQgKyAnLl9pZCddID0gJHN0YXRlUGFyYW1zW25hbWUgKyAnSWQnXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIHN1Ym1pc3Npb24gd2hlbiB0aGV5IGNsaWNrIG9uIHRoZSByb3cuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdyb3dWaWV3JywgZnVuY3Rpb24oZXZlbnQsIGVudGl0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24udmlldycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybUlkOiBlbnRpdHkuZm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbklkOiBlbnRpdHkuX2lkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2FpdCB1bnRpbCB0aGUgY3VycmVudCBmb3JtIGlzIGxvYWRlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5jdXJyZW50Rm9ybS5wcm9taXNlLnRoZW4oZnVuY3Rpb24oZm9ybSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb1V0aWxzLmVhY2hDb21wb25lbnQoZm9ybS5jb21wb25lbnRzLCBmdW5jdGlvbihjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnQua2V5IHx8ICFjb21wb25lbnQuaW5wdXQgfHwgIWNvbXBvbmVudC50YWJsZVZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5maWVsZCAmJiAoY29tcG9uZW50LmtleSA9PT0gb3B0aW9ucy5maWVsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuc3VibWlzc2lvbkNvbHVtbnMucHVzaChjb21wb25lbnQua2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSByZWxvYWQgdGhlIGRhdGEgZ3JpZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJGJyb2FkY2FzdCgncmVsb2FkR3JpZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9ucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb25zLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9zdWJtaXNzaW9uLzpzdWJtaXNzaW9uSWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb24gPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbiA6ICdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vc3VibWlzc2lvbi5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJHNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlUGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJHNjb3BlLmN1cnJlbnRGb3JtLnVybCArICcvc3VibWlzc2lvbi8nICsgJHN0YXRlUGFyYW1zLnN1Ym1pc3Npb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VibWlzc2lvbjoge31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgdGhlIGZvcm1pbyBvYmplY3QuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLmZvcm1pbyA9IChuZXcgRm9ybWlvKCRzY29wZS5jdXJyZW50U3VibWlzc2lvbi51cmwpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvYWQgdGhlIGN1cnJlbnQgc3VibWlzc2lvbi5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24ucHJvbWlzZSA9ICRzY29wZS5jdXJyZW50U3VibWlzc2lvbi5mb3JtaW8ubG9hZFN1Ym1pc3Npb24oKS50aGVuKGZ1bmN0aW9uKHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRTdWJtaXNzaW9uLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3VibWlzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNvbnRyb2xsZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRyb2xsZXJzLnN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvbiwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUoYmFzZVBhdGggKyAnZm9ybS5zdWJtaXNzaW9uLnZpZXcnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5zdWJtaXNzaW9uVmlldyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnN1Ym1pc3Npb25WaWV3ID8gdGVtcGxhdGVzLnN1Ym1pc3Npb25WaWV3IDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRjb250cm9sbGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvblZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIoY29udHJvbGxlcnMuc3VibWlzc2lvblZpZXcsIHskc2NvcGU6ICRzY29wZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZWRpdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuc3VibWlzc2lvbkVkaXQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbkVkaXQgPyB0ZW1wbGF0ZXMuc3VibWlzc2lvbkVkaXQgOiAnZm9ybWlvLWhlbHBlci9zdWJtaXNzaW9uL2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZm9ybVN1Ym1pc3Npb24nLCBmdW5jdGlvbihldmVudCwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvbiA9IHN1Ym1pc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb24udmlldycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250cm9sbGVycy5zdWJtaXNzaW9uRWRpdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9uRWRpdCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi5kZWxldGUnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9kZWxldGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLnN1Ym1pc3Npb25EZWxldGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuc3VibWlzc2lvbkRlbGV0ZSA/IHRlbXBsYXRlcy5zdWJtaXNzaW9uRGVsZXRlIDogJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckc2NvcGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnJGNvbnRyb2xsZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignZGVsZXRlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhiYXNlUGF0aCArICdmb3JtLnN1Ym1pc3Npb25zJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdjYW5jZWwnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGJhc2VQYXRoICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udHJvbGxlcnMuc3VibWlzc2lvbkRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVycy5zdWJtaXNzaW9uRGVsZXRlLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAkZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc291cmNlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSlcbiAgICAucHJvdmlkZXIoJ0Zvcm1pb0F1dGgnLCBbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB2YXIgYW5vblN0YXRlID0gJ2F1dGgubG9naW4nO1xuICAgICAgICAgICAgdmFyIGF1dGhTdGF0ZSA9ICdob21lJztcbiAgICAgICAgICAgIHZhciBmb3JjZUF1dGggPSBmYWxzZTtcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhdXRoJywge1xuICAgICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgIHVybDogJy9hdXRoJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvYXV0aC5odG1sJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHNldEZvcmNlQXV0aDogZnVuY3Rpb24oZm9yY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yY2VBdXRoID0gZm9yY2U7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXRTdGF0ZXM6IGZ1bmN0aW9uKGFub24sIGF1dGgpIHtcbiAgICAgICAgICAgICAgICAgICAgYW5vblN0YXRlID0gYW5vbjtcbiAgICAgICAgICAgICAgICAgICAgYXV0aFN0YXRlID0gYXV0aDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCByZXNvdXJjZSwgcGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhdGgpIHsgcGF0aCA9IG5hbWU7IH1cbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZSgnYXV0aC4nICsgbmFtZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nICsgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6ICdhdXRoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3ZpZXdzL3VzZXIvJyArIG5hbWUudG9Mb3dlckNhc2UoKSArICcuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogWyckc2NvcGUnLCAnJHN0YXRlJywgJyRyb290U2NvcGUnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJHJvb3RTY29wZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uKGVyciwgc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWJtaXNzaW9uKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKHN1Ym1pc3Npb24sIHJlc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhdXRoU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICRnZXQ6IFtcbiAgICAgICAgICAgICAgICAgICAgJ0Zvcm1pbycsXG4gICAgICAgICAgICAgICAgICAgICdGb3JtaW9BbGVydHMnLFxuICAgICAgICAgICAgICAgICAgICAnJHJvb3RTY29wZScsXG4gICAgICAgICAgICAgICAgICAgICckc3RhdGUnLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb0FsZXJ0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5pc1JvbGUgPSBmdW5jdGlvbihyb2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5yb2xlID09PSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlciA9IGZ1bmN0aW9uKHVzZXIsIHJvbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZm9ybWlvQXBwVXNlcicsIGFuZ3VsYXIudG9Kc29uKHVzZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb0FwcFVzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVXNlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9Ub2tlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJvbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9BcHBSb2xlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb0FwcFJvbGUnLCByb2xlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hdXRoZW50aWNhdGVkID0gISFGb3JtaW8uZ2V0VG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QgYW5kIHJvbGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1c2VyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb0FwcFVzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlciA/IGFuZ3VsYXIuZnJvbUpzb24odXNlcikgOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb0FwcFJvbGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS51c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8uY3VycmVudFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIodXNlciwgbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb1JvbGUnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2dvdXRFcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb0FsZXJ0cy5hZGRBbGVydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1lvdXIgc2Vzc2lvbiBoYXMgZXhwaXJlZC4gUGxlYXNlIGxvZyBpbiBhZ2Fpbi4nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignZm9ybWlvLnNlc3Npb25FeHBpcmVkJywgbG9nb3V0RXJyb3IpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgd2hlbiBhIGxvZ291dCBvY2N1cnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIobnVsbCwgbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8ubG9nb3V0KCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYW5vblN0YXRlLCB7fSwge3JlbG9hZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2gobG9nb3V0RXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB0aGV5IGFyZSBsb2dnZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uKGV2ZW50LCB0b1N0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmF1dGhlbnRpY2F0ZWQgPSAhIUZvcm1pby5nZXRUb2tlbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvcmNlQXV0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b1N0YXRlLm5hbWUuc3Vic3RyKDAsIDQpID09PSAnYXV0aCcpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLmF1dGhlbnRpY2F0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSwge30sIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgYWxlcnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmFsZXJ0cyA9IEZvcm1pb0FsZXJ0cy5nZXRBbGVydHMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5mYWN0b3J5KCdGb3JtaW9BbGVydHMnLCBbXG4gICAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICAgZnVuY3Rpb24gKFxuICAgICAgICAgICAgJHJvb3RTY29wZVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHZhciBhbGVydHMgPSBbXTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgYWRkQWxlcnQ6IGZ1bmN0aW9uIChhbGVydCkge1xuICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmFsZXJ0cy5wdXNoKGFsZXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFsZXJ0LmVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCgnI2Zvcm0tZ3JvdXAtJyArIGFsZXJ0LmVsZW1lbnQpLmFkZENsYXNzKCdoYXMtZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsZXJ0cy5wdXNoKGFsZXJ0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZ2V0QWxlcnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ZW1wQWxlcnRzID0gYW5ndWxhci5jb3B5KGFsZXJ0cyk7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0cy5sZW5ndGggPSAwO1xuICAgICAgICAgICAgICAgICAgICBhbGVydHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBBbGVydHM7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkVycm9yOiBmdW5jdGlvbiBzaG93RXJyb3IoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudDogZXJyb3IucGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3JzID0gZXJyb3IuaGFzT3duUHJvcGVydHkoJ2Vycm9ycycpID8gZXJyb3IuZXJyb3JzIDogZXJyb3IuZGF0YS5lcnJvcnM7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmZvckVhY2goZXJyb3JzLCBzaG93RXJyb3IuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgXSlcbiAgICAucnVuKFtcbiAgICAgICAgJyR0ZW1wbGF0ZUNhY2hlJyxcbiAgICAgICAgJyRyb290U2NvcGUnLFxuICAgICAgICAnJHN0YXRlJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZSxcbiAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAkc3RhdGVcbiAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgdGhlIGFjdGl2ZSBzdGF0ZS5cbiAgICAgICAgICAgICRyb290U2NvcGUuaXNBY3RpdmUgPSBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkc3RhdGUuY3VycmVudC5uYW1lLmluZGV4T2Yoc3RhdGUpICE9PSAtMTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8qKioqIFJFU09VUkNFIFRFTVBMQVRFUyAqKioqKioqL1xuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGgyPnt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIHwgY2FwaXRhbGl6ZSB9fTwvaDI+XFxuPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXRhYnNcXFwiPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLnZpZXcnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LnZpZXcoKVxcXCI+VmlldzwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmVkaXQnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LmVkaXQoKVxcXCI+RWRpdDwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmRlbGV0ZScpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgY3VycmVudFJlc291cmNlLm5hbWUgfX0uZGVsZXRlKClcXFwiPkRlbGV0ZTwvYT48L2xpPlxcbjwvdWw+XFxuPGRpdiB1aS12aWV3PjwvZGl2PlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvY3JlYXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGgzPk5ldyB7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2gzPlxcbjxocj48L2hyPlxcbjxmb3JtaW8gc3JjPVxcXCJjdXJyZW50UmVzb3VyY2UuZm9ybVVybFxcXCIgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgXCI8Zm9ybWlvLWRlbGV0ZSBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIiByZXNvdXJjZS1uYW1lPVxcXCJyZXNvdXJjZU5hbWVcXFwiPjwvZm9ybWlvLWRlbGV0ZT5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2VkaXQuaHRtbCcsXG4gICAgICAgICAgICAgICAgXCI8Zm9ybWlvIHNyYz1cXFwiY3VycmVudFJlc291cmNlLnN1Ym1pc3Npb25VcmxcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvaW5kZXguaHRtbCcsXG4gICAgICAgICAgICAgICAgXCI8Zm9ybWlvLXN1Ym1pc3Npb25zIHNyYz1cXFwiY3VycmVudFJlc291cmNlLmZvcm1VcmxcXFwiPjwvZm9ybWlvLXN1Ym1pc3Npb25zPlxcbjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19Q3JlYXRlKClcXFwiIGNsYXNzPVxcXCJidG4gYnRuLXByaW1hcnlcXFwiPjxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiIGFyaWEtaGlkZGVuPVxcXCJ0cnVlXFxcIj48L3NwYW4+IE5ldyB7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2E+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGZvcm1pbyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIiByZWFkLW9ubHk9XFxcInRydWVcXFwiPjwvZm9ybWlvPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAvKioqKiBGT1JNIFRFTVBMQVRFUyAqKioqKioqL1xuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vbGlzdC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8dWwgY2xhc3M9XFxcImxpc3QtZ3JvdXBcXFwiPlxcbiAgICA8bGkgY2xhc3M9XFxcImxpc3QtZ3JvdXAtaXRlbVxcXCIgbmctcmVwZWF0PVxcXCJmb3JtIGluIGZvcm1zXFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBiYXNlIH19Zm9ybS52aWV3KHtmb3JtSWQ6IGZvcm0uX2lkfSlcXFwiPnt7IGZvcm0udGl0bGUgfX08L2E+PC9saT5cXG48L3VsPlwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvZm9ybS9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8Zm9ybWlvLWZvcm1zIHNyYz1cXFwiZm9ybXNTcmNcXFwiIHRhZz1cXFwiZm9ybXNUYWdcXFwiIGJhc2U9XFxcImZvcm1CYXNlXFxcIj48L2Zvcm1pby1mb3Jtcz5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL2Zvcm0vZm9ybS5odG1sJyxcbiAgICAgICAgICAgICAgXCI8dWwgY2xhc3M9XFxcIm5hdiBuYXYtdGFic1xcXCI+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0udmlldycpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgZm9ybUJhc2UgfX1mb3JtLnZpZXcoKVxcXCI+Rm9ybTwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb25zJyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbnMoKVxcXCI+U3VibWlzc2lvbnM8L2E+PC9saT5cXG48L3VsPlxcbjxkaXYgdWktdmlldyBzdHlsZT1cXFwibWFyZ2luLXRvcDoyMHB4O1xcXCI+PC9kaXY+XCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9mb3JtL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgIFwiPGZvcm1pbyBmb3JtPVxcXCJjdXJyZW50Rm9ybS5mb3JtXFxcIiBmb3JtLWFjdGlvbj1cXFwiY3VycmVudEZvcm0udXJsICsgJy9zdWJtaXNzaW9uJ1xcXCIgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCI+PC9mb3JtaW8+XCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIC8qKioqIFNVQk1JU1NJT04gVEVNUExBVEVTICoqKioqKiovXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9pbmRleC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8Zm9ybWlvLWdyaWQgc3JjPVxcXCJjdXJyZW50Rm9ybS51cmxcXFwiIHF1ZXJ5PVxcXCJzdWJtaXNzaW9uUXVlcnlcXFwiIGNvbHVtbnM9XFxcInN1Ym1pc3Npb25Db2x1bW5zXFxcIj48L2Zvcm1pby1ncmlkPlwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9zdWJtaXNzaW9uLmh0bWwnLFxuICAgICAgICAgICAgICBcIjx1bCBjbGFzcz1cXFwibmF2IG5hdi1waWxsc1xcXCI+XFxuICAgIDxsaSByb2xlPVxcXCJwcmVzZW50YXRpb25cXFwiIG5nLWNsYXNzPVxcXCJ7YWN0aXZlOmlzQWN0aXZlKGZvcm1CYXNlICsgJ2Zvcm0uc3VibWlzc2lvbi52aWV3Jyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbi52aWV3KClcXFwiPlZpZXc8L2E+PC9saT5cXG4gICAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoZm9ybUJhc2UgKyAnZm9ybS5zdWJtaXNzaW9uLmVkaXQnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGZvcm1CYXNlIH19Zm9ybS5zdWJtaXNzaW9uLmVkaXQoKVxcXCI+RWRpdDwvYT48L2xpPlxcbiAgICA8bGkgcm9sZT1cXFwicHJlc2VudGF0aW9uXFxcIiBuZy1jbGFzcz1cXFwie2FjdGl2ZTppc0FjdGl2ZShmb3JtQmFzZSArICdmb3JtLnN1Ym1pc3Npb24uZGVsZXRlJyl9XFxcIj48YSB1aS1zcmVmPVxcXCJ7eyBmb3JtQmFzZSB9fWZvcm0uc3VibWlzc2lvbi5kZWxldGUoKVxcXCI+RGVsZXRlPC9hPjwvbGk+XFxuPC91bD5cXG48ZGl2IHVpLXZpZXcgc3R5bGU9XFxcIm1hcmdpbi10b3A6MjBweDtcXFwiPjwvZGl2PlwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi92aWV3Lmh0bWwnLFxuICAgICAgICAgICAgICBcIjxmb3JtaW8gZm9ybT1cXFwiY3VycmVudEZvcm0uZm9ybVxcXCIgc3VibWlzc2lvbj1cXFwiY3VycmVudFN1Ym1pc3Npb24uc3VibWlzc2lvblxcXCIgcmVhZC1vbmx5PVxcXCJ0cnVlXFxcIj48L2Zvcm1pbz5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3N1Ym1pc3Npb24vZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgXCI8Zm9ybWlvIGZvcm09XFxcImN1cnJlbnRGb3JtLmZvcm1cXFwiIHN1Ym1pc3Npb249XFxcImN1cnJlbnRTdWJtaXNzaW9uLnN1Ym1pc3Npb25cXFwiIGZvcm0tYWN0aW9uPVxcXCJjdXJyZW50U3VibWlzc2lvbi51cmxcXFwiPjwvZm9ybWlvPlwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvc3VibWlzc2lvbi9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgIFwiPGZvcm1pby1kZWxldGUgc3JjPVxcXCJjdXJyZW50U3VibWlzc2lvbi51cmxcXFwiPjwvZm9ybWlvLWRlbGV0ZT5cIlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIF0pOyJdfQ==
