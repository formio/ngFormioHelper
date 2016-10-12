angular.module('ngFormioHelper')
.provider('FormioAuth', [
  '$stateProvider',
  'FormioProvider',
  function ($stateProvider, FormioProvider) {
    var init = false;
    var anonState = 'auth.login';
    var anonRole = false;
    var authState = 'home';
    var allowedStates = [];
    var registered = false;
    // These are needed to check permissions against specific forms.
    var formAccess = {};
    var submissionAccess = {};
    var roles = {};
    return {
      setForceAuth: function (allowed) {
        if (typeof allowed === 'boolean') {
          allowedStates = allowed ? ['auth'] : [];
        }
        else {
          allowedStates = allowed;
        }
      },
      setStates: function (anon, auth) {
        anonState = anon;
        authState = auth;
      },
      setAnonRole: function(role) {
        anonRole = role;
      },
      setAppUrl: function(url) {
        FormioProvider.setAppUrl(url);
      },
      register: function (name, resource, path, form, override) {
        var noOverride = form && !override;
        if (!registered) {
          registered = true;
          $stateProvider.state('auth', {
            abstract: true,
            url: '/auth',
            templateUrl: noOverride ? 'formio-helper/auth/auth.html' : 'views/user/auth.html'
          });
        }

        if (!path) {
          path = name;
        }
        var tpl = name.toLowerCase() + '.html';
        $stateProvider
          .state('auth.' + name, {
            url: '/' + path,
            parent: 'auth',
            templateUrl: noOverride ? 'formio-helper/auth/' + tpl : 'views/user/' + tpl,
            controller: ['$scope', '$state', '$rootScope', function ($scope, $state, $rootScope) {
              $scope.currentForm = form;
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
        '$stateParams',
        '$http',
        '$q',
        function (
          Formio,
          FormioAlerts,
          $rootScope,
          $state,
          $stateParams,
          $http,
          $q
        ) {
          return {
            init: function () {
              init = true;

              // Load the project.
              $rootScope.projectPromise = Formio.makeStaticRequest(Formio.getAppUrl()).then(function(project) {
                angular.forEach(project.access, function(access) {
                  formAccess[access.type] = access.roles;
                });
              }, function(err) {
                formAccess = {};
                return null;
              });

              // Get the access for this project.
              $rootScope.accessPromise = Formio.makeStaticRequest(Formio.getAppUrl() + '/access').then(function(access) {
                angular.forEach(access.forms, function(form) {
                  submissionAccess[form.name] = {};
                  form.submissionAccess.forEach(function(access) {
                    submissionAccess[form.name][access.type] = access.roles;
                  });
                });
                roles = access.roles;
                return access;
              }, function(err) {
                roles = {};
                return null;
              });

              $rootScope.user = null;
              $rootScope.isReady = false;
              $rootScope.userPromise = Formio.currentUser().then(function (user) {
                $rootScope.setUser(user, localStorage.getItem('formioRole'));
                return user;
              });

              // Return if the user has a specific role.
              $rootScope.hasRole = function(roleName) {
                roleName = roleName.toLowerCase();
                if (!$rootScope.user) {
                  return (roleName === 'anonymous');
                }
                if (roles[roleName]) {
                  return $rootScope.user.roles.indexOf(roles[roleName]._id) !== -1;
                }
                return false;
              };
              $rootScope.ifRole = function(roleName) {
                return $rootScope.whenReady.then(function() {
                  return $rootScope.isAdmin || $rootScope.hasRole(roleName);
                });
              };

              // Assign the roles to the user.
              $rootScope.assignRoles = function() {
                if (!roles) {
                  $rootScope.isAdmin = false;
                  return false;
                }
                for (var roleName in roles) {
                  if (roles[roleName].admin) {
                    $rootScope['is' + roles[roleName].title.replace(/\s/g, '')] = $rootScope.isAdmin = $rootScope.hasRole(roleName);
                    if ($rootScope.isAdmin) {
                      break;
                    }
                  }
                }
                for (var roleName in roles) {
                  if (!roles[roleName].admin) {
                    $rootScope['is' + roles[roleName].title.replace(/\s/g, '')] = $rootScope.hasRole(roleName);
                  }
                }
              };

              // Create a promise that loads when everything is ready.
              $rootScope.whenReady = $rootScope.accessPromise.then($rootScope.userPromise).then(function() {
                $rootScope.isReady = true;
                $rootScope.assignRoles();
                return true;
              });

              // @todo - Deprecate this call...
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
                  Formio.clearCache();
                  Formio.setUser(null);
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
                $rootScope.assignRoles();
                $rootScope.$emit('user', {
                  user: $rootScope.user,
                  role: $rootScope.role
                });
              };

              $rootScope.checkAccess = function(access, permissions) {
                // Bypass if using an alternative Auth system.
                if (!init) {
                  return true;
                }

                if (!Array.isArray(permissions)) {
                  permissions = [permissions];
                }

                if (!access) {
                  return false;
                }

                var hasAccess = false;
                permissions.forEach(function(permission) {
                  // Check that there are permissions.
                  if (!access[permission]) {
                    return false;
                  }
                  // Check for anonymous users. Must set anonRole.
                  if (!$rootScope.user) {
                    if (access[permission].indexOf(anonRole) !== -1) {
                      hasAccess = true;
                    }
                  }
                  else {
                    // Check the user's roles for access.
                    $rootScope.user.roles.forEach(function(role) {
                      if (access[permission].indexOf(role) !== -1) {
                        hasAccess = true;
                      }
                    });
                  }
                });
                return hasAccess;
              };

              $rootScope.formAccess = function(permissions) {
                return $rootScope.checkAccess(formAccess, permissions);
              };
              $rootScope.hasAccess = function(form, permissions) {
                return $rootScope.checkAccess(submissionAccess[form], permissions);
              };
              $rootScope.ifAccess = function(form, permissions) {
                return $rootScope.whenReady.then(function() {
                  return $rootScope.hasAccess(form, permissions);
                });
              };

              var logoutError = function () {
                $rootScope.setUser(null, null);
                localStorage.removeItem('formioToken');
                $state.go(anonState, $stateParams, {
                  reload: true,
                  inherit: false,
                  notify: true
                });
                FormioAlerts.addAlert({
                  type: 'danger',
                  message: 'Your session has expired. Please log in again.'
                });
              };

              $rootScope.$on('formio.sessionExpired', logoutError);
              Formio.events.on('formio.badToken', logoutError);
              Formio.events.on('formio.sessionExpired', logoutError);

              // Trigger when a logout occurs.
              $rootScope.logout = function () {
                $rootScope.setUser(null, null);
                localStorage.removeItem('formioToken');
                Formio.logout().then(function () {
                  $state.go(anonState, $stateParams, {
                    reload: true,
                    inherit: false,
                    notify: true
                  });
                }).catch(logoutError);
              };

              // Ensure they are logged.
              $rootScope.$on('$stateChangeStart', function (event, toState) {
                $rootScope.authenticated = !!Formio.getToken();
                if ($rootScope.authenticated) {
                  return;
                }
                if (allowedStates.length) {
                  var allowed = false;
                  for (var i in allowedStates) {
                    if (toState.name.indexOf(allowedStates[i]) === 0) {
                      allowed = true;
                      break;
                    }
                  }

                  if (allowed) {
                    return;
                  }

                  event.preventDefault();
                  $state.go(anonState, {}, {reload: true});
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
]);
