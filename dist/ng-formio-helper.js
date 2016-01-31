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
                    resources[name] = name;
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
                    $stateProvider
                        .state(name + 'Index', {
                            url: '/' + name,
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
                                if (options && options.index) {
                                    $controller(options.index, {$scope: $scope});
                                }
                            })
                        })
                        .state(name + 'Create', {
                            url: '/create/' + name,
                            parent: parent ? parent : null,
                            params: options.params && options.params.create,
                            templateUrl: templates.create ? templates.create : 'formio-helper/resource/create.html',
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
                                $scope.currentResource = {
                                    name: name,
                                    queryId: queryId,
                                    formUrl: url
                                };
                                $scope.submission = options.defaultValue ? options.defaultValue() : {data: {}};
                                var handle = false;
                                if (options && options.create) {
                                    var ctrl = $controller(options.create, {$scope: $scope});
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
                            templateUrl: 'formio-helper/resource/resource.html',
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
                                });
                                $scope.currentResource.loadSubmissionPromise = $scope.currentResource.formio.loadSubmission().then(function(submission) {
                                    $scope.currentResource.resource = $scope[name].submission = submission;
                                });

                                if (options && options.abstract) {
                                    $controller(options.abstract, {$scope: $scope});
                                }
                            })
                        })
                        .state(name + '.view', {
                            url: '/',
                            parent: name,
                            params: options.params && options.params.view,
                            templateUrl: templates.view ? templates.view : 'formio-helper/resource/view.html',
                            controller: controller(function($scope, $rootScope, $state, $stateParams, Formio, FormioUtils, $controller) {
                                if (options && options.view) {
                                    $controller(options.view, {$scope: $scope});
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
                                if (options && options.edit) {
                                    var ctrl = $controller(options.edit, {$scope: $scope});
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
                                if (options && options.delete) {
                                    var ctrl = $controller(options.delete, {$scope: $scope});
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
                    '$stateParams',
                    function(
                        Formio,
                        FormioAlerts,
                        $rootScope,
                        $state,
                        $stateParams
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
                                    $state.go(anonState);
                                    FormioAlerts.addAlert({
                                        type: 'danger',
                                        message: 'Your session has expired. Please log in again.'
                                    });
                                };

                                $rootScope.$on('formio.sessionExpired', logoutError);
                                $rootScope.$on('formio.unauthorized', function() {
                                    $state.go(anonState);
                                });

                                // Trigger when a logout occurs.
                                $rootScope.logout = function() {
                                    $rootScope.setUser(null, null);
                                    Formio.logout().then(function() {
                                        $state.go(anonState);
                                    }).catch(logoutError);
                                };

                                // Ensure they are logged.
                                $rootScope.$on('$stateChangeStart', function(event, toState) {
                                    $rootScope.authenticated = !!Formio.getToken();
                                    if (forceAuth) {
                                        if (toState.name.substr(0, 4) === 'auth') { return; }
                                        if (!$rootScope.authenticated) {
                                            event.preventDefault();
                                            $state.go(anonState);
                                        }
                                    }
                                });

                                // Set the breadcrums and alerts.
                                $rootScope.$on('$stateChangeSuccess', function() {
                                    $rootScope.breadcrumbs = [];
                                    for (var i in $state.$current.path) {
                                        var path = $state.$current.path[i];
                                        if (path.abstract) {
                                            $rootScope.breadcrumbs.push({
                                                name: path.name,
                                                state: path.name + '.view({' + path.name + 'Id:"' + $stateParams[path.name + 'Id'] + '"})'
                                            });
                                        }
                                    }
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
        function(
            $templateCache
        ) {
            $templateCache.put('formio-helper/resource/resource.html',
                "<h2>{{ currentResource.name | capitalize }}</h2>\n<ul class=\"nav nav-tabs\">\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.view')}\"><a ui-sref=\"{{ currentResource.name }}.view()\">View</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.edit')}\"><a ui-sref=\"{{ currentResource.name }}.edit()\">Edit</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.delete')}\"><a ui-sref=\"{{ currentResource.name }}.delete()\">Delete</a></li>\n</ul>\n<div ui-view></div>\n"
            );

            $templateCache.put('formio-helper/resource/create.html',
                "<h3>New {{ currentResource.name | capitalize }}</h3>\n<hr></hr>\n<formio src=\"currentResource.formUrl\" submission=\"submission\"></formio>\n"
            );

            $templateCache.put('formio-helper/resource/delete.html',
                "<formio-delete src=\"currentResource.submissionUrl\"></formio-delete>\n"
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
        }
    ])
},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbmctZm9ybWlvLWhlbHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5hbmd1bGFyLm1vZHVsZSgnbmdGb3JtaW9IZWxwZXInLCBbJ2Zvcm1pbycsICd1aS5yb3V0ZXInXSlcbiAgICAuZmlsdGVyKCdjYXBpdGFsaXplJywgW2Z1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXy5jYXBpdGFsaXplO1xuICAgIH1dKVxuICAgIC5maWx0ZXIoJ3RydW5jYXRlJywgW2Z1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oaW5wdXQsIG9wdHMpIHtcbiAgICAgICAgICAgIGlmKF8uaXNOdW1iZXIob3B0cykpIHtcbiAgICAgICAgICAgICAgICBvcHRzID0ge2xlbmd0aDogb3B0c307XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gXy50cnVuY2F0ZShpbnB1dCwgb3B0cyk7XG4gICAgICAgIH07XG4gICAgfV0pXG4gICAgLmRpcmVjdGl2ZShcImZpbGVyZWFkXCIsIFtcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICBmaWxlcmVhZDogXCI9XCJcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmJpbmQoXCJjaGFuZ2VcIiwgZnVuY3Rpb24gKGNoYW5nZUV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbiAobG9hZEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuJGFwcGx5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZXJlYWQgPSBqUXVlcnkobG9hZEV2ZW50LnRhcmdldC5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNUZXh0KGNoYW5nZUV2ZW50LnRhcmdldC5maWxlc1swXSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5wcm92aWRlcignRm9ybWlvUmVzb3VyY2UnLCBbXG4gICAgICAgICckc3RhdGVQcm92aWRlcicsXG4gICAgICAgIGZ1bmN0aW9uKFxuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB2YXIgcmVzb3VyY2VzID0ge307XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCB1cmwsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzW25hbWVdID0gbmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IChvcHRpb25zICYmIG9wdGlvbnMucGFyZW50KSA/IG9wdGlvbnMucGFyZW50IDogbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5SWQgPSBuYW1lICsgJ0lkJztcbiAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gZnVuY3Rpb24oc3VibWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHF1ZXJ5ID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWVyeVtxdWVyeUlkXSA9IHN1Ym1pc3Npb24uX2lkO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHF1ZXJ5O1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29udHJvbGxlciA9IGZ1bmN0aW9uKGN0cmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbJyRzY29wZScsICckcm9vdFNjb3BlJywgJyRzdGF0ZScsICckc3RhdGVQYXJhbXMnLCAnRm9ybWlvJywgJ0Zvcm1pb1V0aWxzJywgJyRjb250cm9sbGVyJywgY3RybF07XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlcyA9IChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGVzKSA/IG9wdGlvbnMudGVtcGxhdGVzIDoge307XG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSArICdJbmRleCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvJyArIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnQgPyBwYXJlbnQgOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMuaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5pbmRleCA/IHRlbXBsYXRlcy5pbmRleCA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IGNvbnRyb2xsZXIoZnVuY3Rpb24oJHNjb3BlLCAkcm9vdFNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcywgRm9ybWlvLCBGb3JtaW9VdGlscywgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmN1cnJlbnRSZXNvdXJjZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWVyeUlkOiBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybVVybDogdXJsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ3N1Ym1pc3Npb25WaWV3JywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhuYW1lICsgJy52aWV3JywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdzdWJtaXNzaW9uRWRpdCcsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcuZWRpdCcsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRvbignc3VibWlzc2lvbkRlbGV0ZScsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcuZGVsZXRlJywgcXVlcnkoc3VibWlzc2lvbikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5pbmRleCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGNvbnRyb2xsZXIob3B0aW9ucy5pbmRleCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJ0NyZWF0ZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvY3JlYXRlLycgKyBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zICYmIG9wdGlvbnMucGFyYW1zLmNyZWF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLmNyZWF0ZSA/IHRlbXBsYXRlcy5jcmVhdGUgOiAnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9jcmVhdGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogY29udHJvbGxlcihmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsICRzdGF0ZSwgJHN0YXRlUGFyYW1zLCBGb3JtaW8sIEZvcm1pb1V0aWxzLCAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtVXJsOiB1cmxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pc3Npb24gPSBvcHRpb25zLmRlZmF1bHRWYWx1ZSA/IG9wdGlvbnMuZGVmYXVsdFZhbHVlKCkgOiB7ZGF0YToge319O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGFuZGxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuY3JlYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKG9wdGlvbnMuY3JlYXRlLCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhbmRsZSA9IChjdHJsLmhhbmRsZSB8fCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYW5kbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24oZXZlbnQsIHN1Ym1pc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28obmFtZSArICcudmlldycsIHF1ZXJ5KHN1Ym1pc3Npb24pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3RhdGUobmFtZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy8nICsgbmFtZSArICcvOicgKyBxdWVyeUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gcGFyZW50IDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvcmVzb3VyY2UuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogY29udHJvbGxlcihmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsICRzdGF0ZSwgJHN0YXRlUGFyYW1zLCBGb3JtaW8sIEZvcm1pb1V0aWxzLCAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3VibWlzc2lvblVybCA9IHVybCArICcvc3VibWlzc2lvbi8nICsgJHN0YXRlUGFyYW1zW3F1ZXJ5SWRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlID0gJHNjb3BlW25hbWVdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5SWQ6IHF1ZXJ5SWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtVXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJtaXNzaW9uVXJsOiBzdWJtaXNzaW9uVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWlvOiAobmV3IEZvcm1pbyhzdWJtaXNzaW9uVXJsKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZToge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhyZWY6ICcvIy8nICsgbmFtZSArICcvJyArICRzdGF0ZVBhcmFtc1txdWVyeUlkXSArICcvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50ID8gJHNjb3BlW3BhcmVudF0gOiB7aHJlZjogJy8jLycsIG5hbWU6ICdob21lJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRGb3JtUHJvbWlzZSA9ICRzY29wZS5jdXJyZW50UmVzb3VyY2UuZm9ybWlvLmxvYWRGb3JtKCkudGhlbihmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmZvcm0gPSAkc2NvcGVbbmFtZV0uZm9ybSA9IGZvcm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLmxvYWRTdWJtaXNzaW9uUHJvbWlzZSA9ICRzY29wZS5jdXJyZW50UmVzb3VyY2UuZm9ybWlvLmxvYWRTdWJtaXNzaW9uKCkudGhlbihmdW5jdGlvbihzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuY3VycmVudFJlc291cmNlLnJlc291cmNlID0gJHNjb3BlW25hbWVdLnN1Ym1pc3Npb24gPSBzdWJtaXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmFic3RyYWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkY29udHJvbGxlcihvcHRpb25zLmFic3RyYWN0LCB7JHNjb3BlOiAkc2NvcGV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLnZpZXcnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnLycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMgJiYgb3B0aW9ucy5wYXJhbXMudmlldyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogdGVtcGxhdGVzLnZpZXcgPyB0ZW1wbGF0ZXMudmlldyA6ICdmb3JtaW8taGVscGVyL3Jlc291cmNlL3ZpZXcuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogY29udHJvbGxlcihmdW5jdGlvbigkc2NvcGUsICRyb290U2NvcGUsICRzdGF0ZSwgJHN0YXRlUGFyYW1zLCBGb3JtaW8sIEZvcm1pb1V0aWxzLCAkY29udHJvbGxlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnZpZXcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRjb250cm9sbGVyKG9wdGlvbnMudmlldywgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zdGF0ZShuYW1lICsgJy5lZGl0Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJy9lZGl0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5lZGl0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiB0ZW1wbGF0ZXMuZWRpdCA/IHRlbXBsYXRlcy5lZGl0IDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZWRpdC5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBjb250cm9sbGVyKGZ1bmN0aW9uKCRzY29wZSwgJHJvb3RTY29wZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMsIEZvcm1pbywgRm9ybWlvVXRpbHMsICRjb250cm9sbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoYW5kbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5lZGl0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY3RybCA9ICRjb250cm9sbGVyKG9wdGlvbnMuZWRpdCwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdmb3JtU3VibWlzc2lvbicsIGZ1bmN0aW9uKGV2ZW50LCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKG5hbWUgKyAnLnZpZXcnLCBxdWVyeShzdWJtaXNzaW9uKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKG5hbWUgKyAnLmRlbGV0ZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICcvZGVsZXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyAmJiBvcHRpb25zLnBhcmFtcy5kZWxldGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6IHRlbXBsYXRlcy5kZWxldGUgPyB0ZW1wbGF0ZXMuZGVsZXRlIDogJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvZGVsZXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IGNvbnRyb2xsZXIoZnVuY3Rpb24oJHNjb3BlLCAkcm9vdFNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcywgRm9ybWlvLCBGb3JtaW9VdGlscywgJGNvbnRyb2xsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGN0cmwgPSAkY29udHJvbGxlcihvcHRpb25zLmRlbGV0ZSwgeyRzY29wZTogJHNjb3BlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYW5kbGUgPSAoY3RybC5oYW5kbGUgfHwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFuZGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUuJG9uKCdkZWxldGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50ICYmIHBhcmVudCAhPT0gJ2hvbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhwYXJlbnQgKyAnLnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScsIG51bGwsIHtyZWxvYWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICRnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb3VyY2VzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5wcm92aWRlcignRm9ybWlvQXV0aCcsIFtcbiAgICAgICAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgICAgICAgZnVuY3Rpb24oXG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICApIHtcbiAgICAgICAgICAgIHZhciBhbm9uU3RhdGUgPSAnYXV0aC5sb2dpbic7XG4gICAgICAgICAgICB2YXIgYXV0aFN0YXRlID0gJ2hvbWUnO1xuICAgICAgICAgICAgdmFyIGZvcmNlQXV0aCA9IGZhbHNlO1xuICAgICAgICAgICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2F1dGgnLCB7XG4gICAgICAgICAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgICAgICAgICAgdXJsOiAnL2F1dGgnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAndmlld3MvdXNlci9hdXRoLmh0bWwnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc2V0Rm9yY2VBdXRoOiBmdW5jdGlvbihmb3JjZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3JjZUF1dGggPSBmb3JjZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldFN0YXRlczogZnVuY3Rpb24oYW5vbiwgYXV0aCkge1xuICAgICAgICAgICAgICAgICAgICBhbm9uU3RhdGUgPSBhbm9uO1xuICAgICAgICAgICAgICAgICAgICBhdXRoU3RhdGUgPSBhdXRoO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIHJlc291cmNlLCBwYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGF0aCkgeyBwYXRoID0gbmFtZTsgfVxuICAgICAgICAgICAgICAgICAgICAkc3RhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAgICAgLnN0YXRlKCdhdXRoLicgKyBuYW1lLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnLycgKyBwYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogJ2F1dGgnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAndmlld3MvdXNlci8nICsgbmFtZS50b0xvd2VyQ2FzZSgpICsgJy5odG1sJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250cm9sbGVyOiBbJyRzY29wZScsICckc3RhdGUnLCAnJHJvb3RTY29wZScsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkcm9vdFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzY29wZS4kb24oJ2Zvcm1TdWJtaXNzaW9uJywgZnVuY3Rpb24oZXJyLCBzdWJtaXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXN1Ym1pc3Npb24pIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIoc3VibWlzc2lvbiwgcmVzb3VyY2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGF1dGhTdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1dXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJGdldDogW1xuICAgICAgICAgICAgICAgICAgICAnRm9ybWlvJyxcbiAgICAgICAgICAgICAgICAgICAgJ0Zvcm1pb0FsZXJ0cycsXG4gICAgICAgICAgICAgICAgICAgICckcm9vdFNjb3BlJyxcbiAgICAgICAgICAgICAgICAgICAgJyRzdGF0ZScsXG4gICAgICAgICAgICAgICAgICAgICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1pb0FsZXJ0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGVQYXJhbXNcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5pc1JvbGUgPSBmdW5jdGlvbihyb2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHJvb3RTY29wZS5yb2xlID09PSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuc2V0VXNlciA9IGZ1bmN0aW9uKHVzZXIsIHJvbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZm9ybWlvQXBwVXNlcicsIGFuZ3VsYXIudG9Kc29uKHVzZXIpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2Zvcm1pb0FwcFVzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnZm9ybWlvVXNlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9Ub2tlbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJvbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdmb3JtaW9BcHBSb2xlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnJvbGUgPSByb2xlLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Zvcm1pb0FwcFJvbGUnLCByb2xlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5hdXRoZW50aWNhdGVkID0gISFGb3JtaW8uZ2V0VG9rZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIGN1cnJlbnQgdXNlciBvYmplY3QgYW5kIHJvbGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB1c2VyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb0FwcFVzZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlciA/IGFuZ3VsYXIuZnJvbUpzb24odXNlcikgOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb0FwcFJvbGUnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS51c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW8uY3VycmVudFVzZXIoKS50aGVuKGZ1bmN0aW9uKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLnNldFVzZXIodXNlciwgbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2Zvcm1pb1JvbGUnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsb2dvdXRFcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBGb3JtaW9BbGVydHMuYWRkQWxlcnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdZb3VyIHNlc3Npb24gaGFzIGV4cGlyZWQuIFBsZWFzZSBsb2cgaW4gYWdhaW4uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2Zvcm1pby5zZXNzaW9uRXhwaXJlZCcsIGxvZ291dEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJ2Zvcm1pby51bmF1dGhvcml6ZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbyhhbm9uU3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHdoZW4gYSBsb2dvdXQgb2NjdXJzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5zZXRVc2VyKG51bGwsIG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRm9ybWlvLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKGFub25TdGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChsb2dvdXRFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5zdXJlIHRoZXkgYXJlIGxvZ2dlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYXV0aGVudGljYXRlZCA9ICEhRm9ybWlvLmdldFRva2VuKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9yY2VBdXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvU3RhdGUubmFtZS5zdWJzdHIoMCwgNCkgPT09ICdhdXRoJykgeyByZXR1cm47IH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoISRyb290U2NvcGUuYXV0aGVudGljYXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oYW5vblN0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgYnJlYWRjcnVtcyBhbmQgYWxlcnRzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5icmVhZGNydW1icyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiAkc3RhdGUuJGN1cnJlbnQucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXRoID0gJHN0YXRlLiRjdXJyZW50LnBhdGhbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGguYWJzdHJhY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS5icmVhZGNydW1icy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHBhdGgubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlOiBwYXRoLm5hbWUgKyAnLnZpZXcoeycgKyBwYXRoLm5hbWUgKyAnSWQ6XCInICsgJHN0YXRlUGFyYW1zW3BhdGgubmFtZSArICdJZCddICsgJ1wifSknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYWxlcnRzID0gRm9ybWlvQWxlcnRzLmdldEFsZXJ0cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pXG4gICAgLmZhY3RvcnkoJ0Zvcm1pb0FsZXJ0cycsIFtcbiAgICAgICAgJyRyb290U2NvcGUnLFxuICAgICAgICBmdW5jdGlvbiAoXG4gICAgICAgICAgICAkcm9vdFNjb3BlXG4gICAgICAgICkge1xuICAgICAgICAgICAgdmFyIGFsZXJ0cyA9IFtdO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBhZGRBbGVydDogZnVuY3Rpb24gKGFsZXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWxlcnQuZWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KCcjZm9ybS1ncm91cC0nICsgYWxlcnQuZWxlbWVudCkuYWRkQ2xhc3MoJ2hhcy1lcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxlcnRzLnB1c2goYWxlcnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBnZXRBbGVydHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBBbGVydHMgPSBhbmd1bGFyLmNvcHkoYWxlcnRzKTtcbiAgICAgICAgICAgICAgICAgICAgYWxlcnRzLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGFsZXJ0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGVtcEFsZXJ0cztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRXJyb3I6IGZ1bmN0aW9uIHNob3dFcnJvcihlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbGVydCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RhbmdlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50OiBlcnJvci5wYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlcnJvcnMgPSBlcnJvci5oYXNPd25Qcm9wZXJ0eSgnZXJyb3JzJykgPyBlcnJvci5lcnJvcnMgOiBlcnJvci5kYXRhLmVycm9ycztcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChlcnJvcnMsIHNob3dFcnJvci5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICBdKVxuICAgIC5ydW4oW1xuICAgICAgICAnJHRlbXBsYXRlQ2FjaGUnLFxuICAgICAgICBmdW5jdGlvbihcbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlXG4gICAgICAgICkge1xuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL3Jlc291cmNlLmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGgyPnt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIHwgY2FwaXRhbGl6ZSB9fTwvaDI+XFxuPHVsIGNsYXNzPVxcXCJuYXYgbmF2LXRhYnNcXFwiPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLnZpZXcnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LnZpZXcoKVxcXCI+VmlldzwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmVkaXQnKX1cXFwiPjxhIHVpLXNyZWY9XFxcInt7IGN1cnJlbnRSZXNvdXJjZS5uYW1lIH19LmVkaXQoKVxcXCI+RWRpdDwvYT48L2xpPlxcbiAgPGxpIHJvbGU9XFxcInByZXNlbnRhdGlvblxcXCIgbmctY2xhc3M9XFxcInthY3RpdmU6aXNBY3RpdmUoY3VycmVudFJlc291cmNlLm5hbWUgKyAnLmRlbGV0ZScpfVxcXCI+PGEgdWktc3JlZj1cXFwie3sgY3VycmVudFJlc291cmNlLm5hbWUgfX0uZGVsZXRlKClcXFwiPkRlbGV0ZTwvYT48L2xpPlxcbjwvdWw+XFxuPGRpdiB1aS12aWV3PjwvZGl2PlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2UvY3JlYXRlLmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGgzPk5ldyB7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB8IGNhcGl0YWxpemUgfX08L2gzPlxcbjxocj48L2hyPlxcbjxmb3JtaW8gc3JjPVxcXCJjdXJyZW50UmVzb3VyY2UuZm9ybVVybFxcXCIgc3VibWlzc2lvbj1cXFwic3VibWlzc2lvblxcXCI+PC9mb3JtaW8+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9kZWxldGUuaHRtbCcsXG4gICAgICAgICAgICAgICAgXCI8Zm9ybWlvLWRlbGV0ZSBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIj48L2Zvcm1pby1kZWxldGU+XFxuXCJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICR0ZW1wbGF0ZUNhY2hlLnB1dCgnZm9ybWlvLWhlbHBlci9yZXNvdXJjZS9lZGl0Lmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGZvcm1pbyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5zdWJtaXNzaW9uVXJsXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgJHRlbXBsYXRlQ2FjaGUucHV0KCdmb3JtaW8taGVscGVyL3Jlc291cmNlL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgICAgIFwiPGZvcm1pby1zdWJtaXNzaW9ucyBzcmM9XFxcImN1cnJlbnRSZXNvdXJjZS5mb3JtVXJsXFxcIj48L2Zvcm1pby1zdWJtaXNzaW9ucz5cXG48YSB1aS1zcmVmPVxcXCJ7eyBjdXJyZW50UmVzb3VyY2UubmFtZSB9fUNyZWF0ZSgpXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1wcmltYXJ5XFxcIj48c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIiBhcmlhLWhpZGRlbj1cXFwidHJ1ZVxcXCI+PC9zcGFuPiBOZXcge3sgY3VycmVudFJlc291cmNlLm5hbWUgfCBjYXBpdGFsaXplIH19PC9hPlxcblwiXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAkdGVtcGxhdGVDYWNoZS5wdXQoJ2Zvcm1pby1oZWxwZXIvcmVzb3VyY2Uvdmlldy5odG1sJyxcbiAgICAgICAgICAgICAgICBcIjxmb3JtaW8gc3JjPVxcXCJjdXJyZW50UmVzb3VyY2Uuc3VibWlzc2lvblVybFxcXCIgcmVhZC1vbmx5PVxcXCJ0cnVlXFxcIj48L2Zvcm1pbz5cXG5cIlxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIF0pIl19
