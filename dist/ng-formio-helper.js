(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
.config(['formioComponentsProvider', function(formioComponentsProvider) {
  formioComponentsProvider.register('resourcefields', {
    title: 'Resource Fields',
    template: 'formio/components/resourcefields.html',
    controller: [
      '$scope',
      '$rootScope',
      '$http',
      'FormioUtils',
      'AppConfig',
      function (
        $scope,
        $rootScope,
        $http,
        FormioUtils,
        AppConfig
      ) {
        var settings = $scope.component;
        var resourceExclude = '';
        $scope.resourceComponents = [];
        if ($rootScope.currentForm && $rootScope.currentForm._id) {
          resourceExclude = '&_id__ne=' + $rootScope.currentForm._id;
        }
        $scope.resourceSelect = {
          type: 'select',
          input: true,
          label: settings.title ? settings.title : 'Select a resource',
          key: 'resource',
          placeholder: settings.placeholder || '',
          dataSrc: 'url',
          data: {url: settings.basePath + '?type=resource' + resourceExclude},
          valueProperty: '_id',
          defaultValue: $scope.data.resource,
          template: '<span>{{ item.title }}</span>',
          multiple: false,
          protected: false,
          unique: false,
          persistent: true,
          validate: {
            required: settings.hasOwnProperty('required') ? settings.required : true
          }
        };

        $scope.propertyField = {
          label: 'Resource Property',
          key: 'property',
          inputType: 'text',
          input: true,
          placeholder: 'Assign this resource to the following property',
          prefix: '',
          suffix: '',
          type: 'textfield',
          defaultValue: $scope.data.property,
          multiple: false
        };

        // Keep track of the available forms on the provided form.
        var formFields = [];

        // Fetch the form information.
        $http.get(AppConfig.apiUrl + settings.basePath + '/' + settings.form).then(function(result) {
          FormioUtils.eachComponent(result.data.components, function(component) {
            if (component.type !== 'button') {
              formFields.push({
                value: component.key,
                label: component.label
              });
            }
          });
        });

        // Watch the selection of a new resource and set the resource field information.
        $scope.$watch('data.resource', function(data) {
          if (!data) { return; }
          $scope.data.fields = $scope.data.fields || {};
          if (data !== $scope.data.resource) {
            $scope.data.resource = data;
          }
          $scope.resourceComponents = [];
          $http.get(AppConfig.apiUrl + settings.basePath + '/' + data).then(function(results) {
            FormioUtils.eachComponent(results.data.components, function(component) {
              if (component.type !== 'button') {
                $scope.resourceComponents.push({
                  type: 'select',
                  input: true,
                  label: component.label,
                  key: component.key,
                  dataSrc: 'values',
                  defaultValue: $scope.data.fields[component.key],
                  data: { values: formFields },
                  validate: {
                    required: component.validate ? (component.validate.required) : false
                  }
                });
              }
            });
          });
        });
      }
    ],
    settings: {
      input: true,
      tableView: false,
      builder: false,
      inputType: 'text',
      inputMask: '',
      label: '',
      key: 'textField',
      placeholder: '',
      prefix: '',
      suffix: '',
      multiple: false,
      defaultValue: '',
      protected: false,
      unique: false,
      persistent: true,
      validate: {
        required: false,
        minLength: '',
        maxLength: '',
        pattern: '',
        custom: '',
        customPrivate: false
      }
    }
  });
}]);
},{}],2:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
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
]);
},{}],3:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
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
      var loadForms = function () {
        if (!$scope.src) {
          return;
        }
        if ($scope.tag) {
          params.tags = $scope.tag;
        }
        (new Formio($scope.src)).loadForms({params: params}).then(function (forms) {
          $scope.forms = forms;
        });
      };

      $scope.$watch('src', loadForms);
    }]
  };
});
},{}],4:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
.directive('offlineButton', function () {
  return {
    restrict: 'E',
    replace: true,
    scope: false,
    controller: [
      '$scope', '$rootScope', function($scope, $rootScope) {
        $scope.offline = $rootScope.offline;
        $scope.hasOfflineMode = $rootScope.hasOfflineMode;
      }
    ],
    templateUrl: 'formio-helper/offline/button.html'
  };
});
},{}],5:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
.directive('offlinePopup', function () {
  return {
    restrict: 'A',
    scope: false,
    link: function (scope, el) {
      if (typeof jQuery === 'undefined') {
        return;
      }
      jQuery(el).popover();
    }
  };
});
},{}],6:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
.factory('FormioAlerts', [
  '$rootScope',
  function ($rootScope) {
    var alerts = [];
    if (!$rootScope.alerts) {
      $rootScope.alerts = [];
    }
    return {
      addAlert: function (alert) {
        // Do not add duplicate alerts.
        if (_.find($rootScope.alerts, {message: alert.message})) {
          return;
        }

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
        $rootScope.alerts = [];
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
]);

},{}],7:[function(require,module,exports){
"use strict";

angular.module('ngFormioHelper', [
  'formio',
  'ngFormioGrid',
  'ngTagsInput',
  'ui.router'
])
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
.run([
  '$templateCache',
  '$rootScope',
  '$state',
  'FormioUtils',
  function (
      $templateCache,
      $rootScope,
      $state,
      FormioUtils
  ) {
    // Determine the active state.
    $rootScope.isActive = function (state) {
      return $state.current.name.indexOf(state) !== -1;
    };

    /**** PARTIAL TEMPLATES ****/
    $templateCache.put('formio-helper/pager.html',
      "<div class=\"paginate-anything\">\n  <ul class=\"pagination pagination-{{size}} links\" ng-if=\"numPages > 1\">\n    <li ng-class=\"{disabled: page <= 0}\"><a href ng-click=\"gotoPage(page-1)\">&laquo;</a></li>\n    <li ng-if=\"linkGroupFirst() > 0\"><a href ng-click=\"gotoPage(0)\">1</a></li>\n    <li ng-if=\"linkGroupFirst() > 1\" class=\"disabled\"><a href>&hellip;</a></li>\n    <li ng-repeat=\"p in [linkGroupFirst(), linkGroupLast()] | makeRange\" ng-class=\"{active: p === page}\"><a href ng-click=\"gotoPage(p)\">{{p+1}}</a></li>\n    <li ng-if=\"linkGroupLast() < numPages - 2\" class=\"disabled\"><a href>&hellip;</a></li>\n    <li ng-if=\"isFinite() && linkGroupLast() < numPages - 1\"><a href ng-click=\"gotoPage(numPages-1)\">{{numPages}}</a></li>\n    <li ng-class=\"{disabled: page >= numPages - 1}\"><a href ng-click=\"gotoPage(page+1)\">&raquo;</a></li>\n  </ul>\n</div>\n"
    );

    $templateCache.put('formio-helper/breadcrumb.html',
      "<ol class=\"breadcrumb\">\n  <li ng-repeat=\"step in steps\" ng-class=\"{active: $last}\">\n    <a ui-sref=\"{{ step.name }}.view\" ng-bind-html=\"step.ncyBreadcrumbLabel\"></a>\n  </li>\n</ol>\n"
    );

    /**** AUTH TEMPLATES ****/
    $templateCache.put('formio-helper/auth/auth.html',
      "<div class=\"col-md-8 col-md-offset-2\">\n    <div class=\"panel panel-default\">\n        <div class=\"panel-heading\" style=\"padding-bottom: 0; border-bottom: none;\">\n            <ul class=\"nav nav-tabs\" style=\"border-bottom: none;\">\n                <li role=\"presentation\" ng-class=\"{active:isActive('auth.login')}\"><a ui-sref=\"auth.login()\">Login</a></li>\n                <li role=\"presentation\" ng-class=\"{active:isActive('auth.register')}\"><a ui-sref=\"auth.register()\">Register</a></li>\n            </ul>\n        </div>\n        <div class=\"panel-body\">\n            <div class=\"row\">\n                <div class=\"col-lg-12\">\n                    <div ui-view></div>\n                </div>\n            </div>\n        </div>\n    </div>\n</div>\n"
    );

    $templateCache.put('formio-helper/auth/login.html',
      "<formio src=\"currentForm\" formio-options=\"{skipQueue: true}\"></formio>"
    );

    $templateCache.put('formio-helper/auth/register.html',
      "<formio src=\"currentForm\" formio-options=\"{skipQueue: true}\"></formio>\n"
    );

    /**** RESOURCE TEMPLATES *******/
    $templateCache.put('formio-helper/resource/resource.html',
      "<h2>{{ currentResource.name | capitalize }}</h2>\n<ul class=\"nav nav-tabs\" ng-if=\"isReady\">\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.view')}\" ng-if=\"hasAccess(currentResource.name, ['read_all', 'read_own'])\"><a ui-sref=\"{{ baseName }}.view()\">View</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.edit')}\" ng-if=\"hasAccess(currentResource.name, ['update_all', 'update_own'])\"><a ui-sref=\"{{ baseName }}.edit()\">Edit</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(currentResource.name + '.delete')}\" ng-if=\"hasAccess(currentResource.name, ['delete_all', 'delete_own'])\"><a ui-sref=\"{{ baseName }}.delete()\">Delete</a></li>\n</ul>\n<div ui-view></div>\n"
    );

    $templateCache.put('formio-helper/resource/create.html',
      "<h3 ng-if=\"pageTitle\">{{ pageTitle }}</h3>\n<hr ng-if=\"pageTitle\"></hr>\n<formio src=\"currentResource.formUrl\" submission=\"submission\" hide-components=\"hideComponents\"></formio>\n"
    );

    $templateCache.put('formio-helper/resource/delete.html',
      "<formio-delete src=\"currentResource.submissionUrl\" resource-name=\"resourceName\"></formio-delete>\n"
    );

    $templateCache.put('formio-helper/resource/edit.html',
      "<formio src=\"currentResource.submissionUrl\" hide-components=\"hideComponents\"></formio>\n"
    );

    $templateCache.put('formio-helper/resource/index.html',
      "<formio-grid src=\"currentResource.formUrl\" columns=\"currentResource.columns\" query=\"currentResource.gridQuery\" grid-options=\"currentResource.gridOptions\"></formio-grid><br/>\n<a ui-sref=\"{{ baseName }}Create()\" class=\"btn btn-primary\" ng-if=\"isReady && hasAccess(currentResource.name, ['create_own', 'create_all'])\"><span class=\"glyphicon glyphicon-plus\" aria-hidden=\"true\"></span> New {{ currentResource.name | capitalize }}</a>\n"
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
      "<formio form=\"currentForm.form\" form-action=\"currentForm.url + '/submission'\" submission=\"submission\" hide-components=\"hideComponents\"></formio>\n"
    );

    /**** SUBMISSION TEMPLATES *******/
    $templateCache.put('formio-helper/submission/index.html',
      "<formio-grid src=\"currentForm.url\" query=\"submissionQuery\" columns=\"submissionColumns\"></formio-grid>\n\n"
    );

    $templateCache.put('formio-helper/submission/submission.html',
      "<ul class=\"nav nav-pills\">\n  <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.view')}\"><a ui-sref=\"{{ formBase }}form.submission.view()\">View</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.edit')}\"><a ui-sref=\"{{ formBase }}form.submission.edit()\">Edit</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(formBase + 'form.submission.delete')}\"><a ui-sref=\"{{ formBase }}form.submission.delete()\">Delete</a></li>\n</ul>\n<div ui-view style=\"margin-top:20px;\"></div>\n"
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

    /**** OFFLINE TEMPLATES ****/
    $templateCache.put('formio-helper/offline/index.html',
      "<div>\n    <h2>The following submission had an error. Please correct it and resubmit.</h2>\n    <formio src=\"currentSubmission.url\" submission=\"currentSubmission.data\" hide-components=\"['submit']\"></formio>\n    <a class=\"btn btn-lg btn-info\" ng-click=\"submitSubmission()\">Retry</a>\n    <a class=\"btn btn-lg btn-warning\" ng-click=\"cancelSubmission()\">Cancel Submission</a>\n</div>"
    );

    $templateCache.put('formio-helper/offline/button.html',
      "<div class=\"offline-button\">\n    <div ng-if=\"hasOfflineMode\">\n        <span class=\"navbar-text\" ng-click=\"offline.forceOffline(!offline.isForcedOffline())\" style=\"cursor:pointer;\">\n            <i class=\"glyphicon glyphicon-signal text-success\" ng-class=\"{ 'text-danger': (offline.isForcedOffline() || !offline.enabled), 'text-warning' : offline.offline }\"></i>\n        </span>\n        <span ng-if=\"offline.submissionQueueLength()\" ng-click=\"offline.dequeueSubmissions()\" class=\"navbar-text\" style=\"cursor:pointer;\">\n            <span class=\"badge\">{{ offline.submissionQueueLength() }} Queued</span> <i class=\"glyphicon glyphicon-refresh\" ng-class=\"{ 'glyphicon-spin': offline.dequeuing }\"></i>\n        </span>\n    </div>\n    <div ng-if=\"!hasOfflineMode\">\n        <span class=\"navbar-text\">\n            <a tabindex=\"0\" offline-popup role=\"button\" data-toggle=\"popover\" data-placement=\"bottom\" data-trigger=\"focus\" title=\"Offline Mode Disabled\" data-content=\"You must upgrade your project to Team Pro to enable offline mode support. Please contact support@form.io for more information.\"><i class=\"glyphicon glyphicon-signal text-danger\"></i></a>\n        </span>\n    </div>\n</div>"
    );

    $templateCache.put('formio/components/resourcefields.html', FormioUtils.fieldWrap(
        "<formio-component component=\"resourceSelect\" data=\"data\"></formio-component>\n<formio-component ng-if=\"data.resource\" component=\"propertyField\" data=\"data\"></formio-component>\n<fieldset ng-if=\"data.resource\">\n  <legend>Resource Fields</legend>\n  <div class=\"well\">Below are the fields within the selected resource. For each of these fields, select the corresponding field within this form that you wish to map to the selected Resource.</div>\n  <formio-component ng-repeat=\"resourceComponent in resourceComponents\" component=\"resourceComponent\" data=\"data.fields\"></formio-component>\n</fieldset>\n"
    ));
  }
]);

// Components
require('./components/resourcefields.js');

// Directives.
require('./directives/fileread.js');
require('./directives/formioForms.js');
require('./directives/offlineButton.js');
require('./directives/offlinePopup.js');

// Factories.
require('./factories/FormioAlerts.js');

// Providers.
require('./providers/FormioAuth.js');
require('./providers/FormioForms.js');
require('./providers/FormioOffline.js');
require('./providers/FormioResource.js');

},{"./components/resourcefields.js":1,"./directives/fileread.js":2,"./directives/formioForms.js":3,"./directives/offlineButton.js":4,"./directives/offlinePopup.js":5,"./factories/FormioAlerts.js":6,"./providers/FormioAuth.js":8,"./providers/FormioForms.js":9,"./providers/FormioOffline.js":10,"./providers/FormioResource.js":11}],8:[function(require,module,exports){
"use strict";
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
    var FormioAuth = {
      setForceAuth: function (allowed) {
        if (typeof allowed === 'boolean') {
          allowedStates = allowed ? ['auth'] : [];
        }
        else {
          allowedStates = allowed;
        }
      },
      auth: function(user, resource, $rootScope, $q) {
        return $q.all([$rootScope.projectRequest(), $rootScope.accessRequest()]).then(function() {
          return $rootScope.setUser(user, resource);
        });
      },
      login: function(user, resource, $rootScope, $state, $q) {
        return FormioAuth.auth(user, resource, $rootScope, $q).then(function(user) {
          var authRedirect = window.sessionStorage.getItem('authRedirect');
          if (authRedirect) {
            authRedirect = JSON.parse(authRedirect);
            window.sessionStorage.removeItem('authRedirect');
            $state.go(authRedirect.toState.name, authRedirect.toParams);
          }
          else {
            $state.go(authState);
          }
          return user;
        });
      },
      setStates: function(anon, auth) {
        anonState = anon;
        authState = auth;
      },
      setAnonRole: function(role) {
        anonRole = role;
      },
      setAppUrl: function(url) {
        FormioProvider.setProjectUrl(url);
      },
      setProjectUrl: function(url) {
        FormioProvider.setProjectUrl(url);
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
        $stateProvider.state('auth.' + name, {
          url: '/' + path,
          templateUrl: noOverride ? 'formio-helper/auth/' + tpl : 'views/user/' + tpl,
          controller: [
            '$scope',
            '$state',
            '$rootScope',
            '$q',
            function (
              $scope,
              $state,
              $rootScope,
              $q
            ) {
              $scope.currentForm = form;
              $scope.$on('formSubmission', function (err, submission) {
                if (!submission) {
                  return;
                }
                FormioAuth.login(submission, resource, $rootScope, $state, $q);
              });
            }
          ]
        });
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
            init: function (options) {
              init = true;
              $rootScope.user = null;
              $rootScope.isReady = false;

              // Load the current project.
              $rootScope.projectRequest = function () {
                return Formio.makeStaticRequest(Formio.getProjectUrl()).then(function(project) {
                  angular.forEach(project.access, function(access) {
                    formAccess[access.type] = access.roles;
                  });
                }, function(err) {
                  formAccess = {};
                  return null;
                });
              };

              // Get the access for this project.
              $rootScope.accessRequest = function () {
                return Formio.makeStaticRequest(Formio.getProjectUrl() + '/access').then(function(access) {
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
              };

              var currentUser = null;
              if (options && options.oauth) {
                // Make a fix to the hash to remove starting "/" that angular puts there.
                if (window.location.hash && window.location.hash.match(/^#\/access_token/)) {
                  history.pushState(null, null, window.location.hash.replace(/^#\/access_token/, '#access_token'));
                }

                // Initiate the SSO if they provide oauth settings.
                currentUser = Formio.ssoInit(options.oauth.type, options.oauth.options);
              }
              else {
                currentUser = Formio.currentUser();
              }

              // Get the user promise when the user is done loading.
              var currentAppRole = localStorage.getItem('formioAppRole') || 'user';
              $rootScope.userPromise = currentUser.then(function(user) {
                if (!user) {
                  return $rootScope.setUser(null, currentAppRole);
                }
                return FormioAuth.auth(user, currentAppRole, $rootScope, $q);
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
              $rootScope.whenReady = $rootScope.userPromise.then(function() {
                $rootScope.isReady = true;
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
                return $rootScope.user;
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
                // Save the state to sessionstorage so it can be redirected after login/register.
                if ($state.current.name && !window.sessionStorage.getItem('authRedirect')) {
                  window.sessionStorage.setItem('authRedirect', JSON.stringify({ toState: $state.current, toParams: $stateParams}));
                }

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
              $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
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

                  // Save the state to sessionstorage so it can be redirected after login/register.
                  window.sessionStorage.setItem('authRedirect', JSON.stringify({ toState: toState, toParams: toParams}));

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

    return FormioAuth;
  }
]);

},{}],9:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
.provider('FormioForms', [
  '$stateProvider',
  function ($stateProvider) {
    var resources = {};
    return {
      register: function (name, url, options) {
        options = options || {};
        var templates = options.templates ? options.templates : {};
        var controllers = options.controllers ? options.controllers : {};
        var fields = (typeof options.field === 'string') ? [options.field] : options.field;

        // Normalize the fields properties.
        fields = _.map(fields, function(field) {
          if (typeof field === 'string') {
            return {
              name: field,
              stateParam: field + 'Id'
            };
          }
          return field;
        });
        var basePath = options.base ? options.base : '';
        if (!basePath) {
          basePath = name ? name + '.' : '';
        }

        $stateProvider
          .state(basePath + 'formIndex', {
            url: '/forms',
            params: options.params && options.params.index,
            ncyBreadcrumb: {skip: true},
            templateUrl: templates.index ? templates.index : 'formio-helper/form/index.html',
            controller: ['$scope', 'Formio', '$controller', function ($scope, Formio, $controller) {
              $scope.formBase = basePath;
              $scope.formsSrc = url + '/form';
              $scope.formsTag = $scope.formsTag || options.tag;
              if (controllers.index) {
                $controller(controllers.index, {$scope: $scope});
              }
            }]
          })
          .state(basePath + 'form', {
            url: '/form/:formId',
            abstract: true,
            ncyBreadcrumb: _.get(options, 'breadcrumb.form', {skip: true}),
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
            ncyBreadcrumb: {skip: true},
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
                if (fields && fields.length) {
                  $scope.hideComponents = _.map(fields, function(field) {
                    return field.name;
                  });
                  $scope.currentForm.promise.then(function () {
                    fields.forEach(function (field) {
                      var parts = field.name.split('.');
                      var fieldName = parts[parts.length - 1];
                      $scope[fieldName].loadSubmissionPromise.then(function (resource) {
                        _.set($scope.submission.data, field.name, resource);
                      });
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
            ncyBreadcrumb: {skip: true},
            params: options.params && options.params.submissions,
            templateUrl: templates.submissions ? templates.submissions : 'formio-helper/submission/index.html',
            controller: [
              '$scope',
              '$state',
              '$stateParams',
              'FormioUtils',
              '$controller',
              '$timeout',
              function (
                $scope,
                $state,
                $stateParams,
                FormioUtils,
                $controller,
                $timeout
              ) {
                $scope.submissionQuery = {};
                $scope.submissionColumns = [];
                if (fields && fields.length) {
                  fields.forEach(function (field) {
                    $scope.submissionQuery['data.' + field.name + '._id'] = $stateParams[field.stateParam];
                  });
                }

                var gotoEntity = function(event, entity) {
                  $timeout(function() {
                    $state.go(basePath + 'form.submission.view', {
                      formId: entity.form,
                      submissionId: entity._id
                    });
                  });
                };

                // Go to the submission when they click on the row.
                $scope.$on('rowView', gotoEntity);
                $scope.$on('rowSelect', gotoEntity);

                if (controllers.submissions) {
                  $controller(controllers.submissions, {$scope: $scope});
                }

                $scope.currentForm.promise.then(function (form) {
                  localStorage.setItem(form.name, '');
                  if (
                    !$scope.submissionColumns.length &&
                    !Object.keys($scope.submissionColumns).length === 0
                  ) {
                    FormioUtils.eachComponent(form.components, function (component) {
                      if (!component.key || !component.input || !component.tableView) {
                        return;
                      }
                      if (fields && fields.length && !_.find(fields, {name: component.key})) {
                        return;
                      }
                      $scope.submissionColumns.push(component.key);
                    });

                    // Ensure we reload the data grid.
                    $scope.$broadcast('reloadGrid');
                  }
                });
              }
            ]
          })
          .state(basePath + 'form.submission', {
            abstract: true,
            url: '/submission/:submissionId',
            ncyBreadcrumb: _.get(options, 'breadcrumb.submission', {skip: true}),
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
            ncyBreadcrumb: {skip: true},
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
            ncyBreadcrumb: {skip: true},
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
            ncyBreadcrumb: {skip: true},
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
]);

},{}],10:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
.provider('FormioOffline', [
  '$stateProvider',
  function ($stateProvider) {
    return {
      register: function (options) {
        options = options || {};
        $stateProvider.state('offline', {
          url: options.errorUrl || '/offline/error',
          templateUrl: 'formio-helper/offline/index.html',
          params: {
            currentSubmission: {}
          },
          controller: [
            '$scope',
            '$stateParams',
            '$rootScope',
            '$state',
            function(
              $scope,
              $stateParams,
              $rootScope,
              $state
            ) {
              if (typeof FormioOfflineProject === 'undefined') {
                return;
              }
              $scope.currentSubmission = $stateParams.currentSubmission;
              $scope.submitSubmission = function() {
                $rootScope.offline.dequeueSubmissions();
                $state.go(options.homeState || 'home');
              }
              $scope.cancelSubmission = function() {
                $rootScope.offline.skipNextQueuedSubmission();
                $rootScope.offline.dequeueSubmissions();
                $state.go(options.homeState || 'home');
              }
            }
          ]
        });
      },
      $get: [
        'Formio',
        'FormioAlerts',
        '$rootScope',
        'AppConfig',
        '$window',
        '$state',
        function (
          Formio,
          FormioAlerts,
          $rootScope,
          AppConfig,
          $window,
          $state
        ) {
          return {
            init: function () {
              if (typeof FormioOfflineProject === 'undefined') {
                console.log('setting off');
                $rootScope.hasOfflineMode = false;
                return;
              }
              console.log('setting on');
              $rootScope.hasOfflineMode = true;
              $rootScope.appVersion = AppConfig.appVersion;
              $rootScope.offline = new FormioOfflineProject(AppConfig.appUrl, 'project.json');
              Formio.registerPlugin($rootScope.offline, 'offline');
              $rootScope.offline.onError = function(err) {
                FormioAlerts.addAlert({
                  type: 'danger',
                  message: 'Failed to save offline cache. This could result in missing data.'
                });
              };

              Formio.events.on('offline.formError', function(error, submission) {
                FormioAlerts.addAlert({
                  message: error,
                  type: 'danger'
                })
                // We should check for authentication errors and redirect to login if unauthenticated and error.
                $state.go('offline', {currentSubmission: submission.request});
              });

              // This section monitors for new application versions and will prompt to reload the page. Checks every minute on
              // state change.
              var appCache = $window.applicationCache;
              var checkUpdate = _.debounce(function() {
                appCache.update();
              }, 60*1000);
              // Check for appcache updates and alert the user if available.
              if (appCache) {
                appCache.addEventListener('updateready', function() {
                  if (appCache.status == appCache.UPDATEREADY) {
                    // Browser downloaded a new app cache.
                    if (confirm('A new version of the application is available. Would you like to load it?')) {
                      // Swap it in and reload the page to get the latest hotness.
                      appCache.swapCache();
                      $window.location.reload();
                    }
                  }
                  else {
                    // Manifest didn't changed. Don't do anything.
                  }
                }, false);
                $rootScope.$on('$stateChangeStart', function() {
                  if (appCache.status !== appCache.UNCACHED && appCache.status !== appCache.OBSOLETE) {
                    checkUpdate();
                  }
                });
              }
            }
          };
        }
      ]
    };
  }
]);
},{}],11:[function(require,module,exports){
"use strict";
angular.module('ngFormioHelper')
.provider('FormioResource', [
  '$stateProvider',
  '$injector',
  function (
    $stateProvider,
    $injector
  ) {
    var resources = {};
    return {
      register: function (name, url, options) {
        options = options || {};
        resources[name] = options.title || name;
        var parent = (options && options.parent) ? options.parent : null;
        var parents = (options && options.parents) ? options.parents : [];
        if ((!parents || !parents.length) && parent) {
          parents = [parent];
        }
        var queryId = name + 'Id';
        options.base = options.base || '';
        var baseName = options.base + name;
        var query = function (submission) {
          var query = {};
          query[queryId] = submission._id;
          return query;
        };

        var $breadcrumbProvider = null;
        try {
          $breadcrumbProvider = $injector.get('$breadcrumbProvider');
        }
        catch (error) {
          $breadcrumbProvider = null;
        }

        // If we wish to enable breadcrumb functions.
        if (options.breadcrumb && $breadcrumbProvider) {
          $breadcrumbProvider.setOptions({
            includeAbstract: true,
            templateUrl: 'formio-helper/breadcrumb.html'
          });
        }

        // Allow them to alter the options per state.
        var baseAlter = function (options) {
          return options;
        };
        options.alter = angular.extend({
          index: baseAlter,
          create: baseAlter,
          abstract: baseAlter,
          view: baseAlter,
          edit: baseAlter,
          delete: baseAlter
        }, options.alter);

        var templates = (options && options.templates) ? options.templates : {};
        var controllers = (options && options.controllers) ? options.controllers : {};
        var queryParams = options.query ? options.query : '';
        $stateProvider
          .state(baseName + 'Index', options.alter.index({
            url: '/' + name + queryParams,
            params: options.params && options.params.index,
            data: options.data && options.data.index,
            templateUrl: templates.index ? templates.index : 'formio-helper/resource/index.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$state',
              '$stateParams',
              '$controller',
              function (
                $scope,
                $state,
                $stateParams,
                $controller
              ) {
                $scope.baseName = baseName;
                var gridQuery = {};
                if (parents.length) {
                  parents.forEach(function(parent) {
                    if ($stateParams.hasOwnProperty(parent + 'Id')) {
                      gridQuery['data.' + parent + '._id'] = $stateParams[parent + 'Id'];
                    }
                  });
                }
                $scope.currentResource = {
                  name: name,
                  queryId: queryId,
                  formUrl: url,
                  columns: [],
                  gridQuery: gridQuery,
                  gridOptions: {}
                };
                $scope.$on('rowView', function (event, submission) {
                  $state.go(baseName + '.view', query(submission));
                });
                $scope.$on('submissionView', function (event, submission) {
                  $state.go(baseName + '.view', query(submission));
                });

                $scope.$on('submissionEdit', function (event, submission) {
                  $state.go(baseName + '.edit', query(submission));
                });

                $scope.$on('submissionDelete', function (event, submission) {
                  $state.go(baseName + '.delete', query(submission));
                });
                if (controllers.index) {
                  $controller(controllers.index, {$scope: $scope});
                }
              }
            ]
          }))
          .state(baseName + 'Create', options.alter.create({
            url: '/create/' + name + queryParams,
            params: options.params && options.params.create,
            data: options.data && options.data.create,
            templateUrl: templates.create ? templates.create : 'formio-helper/resource/create.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$state',
              '$controller',
              function ($scope,
                        $state,
                        $controller) {
                $scope.baseName = baseName;
                $scope.currentResource = {
                  name: name,
                  queryId: queryId,
                  formUrl: url
                };
                $scope.submission = options.defaultValue ? options.defaultValue : {data: {}};
                $scope.pageTitle = 'New ' + _.capitalize(name);
                var handle = false;
                if (controllers.create) {
                  var ctrl = $controller(controllers.create, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (parents.length) {
                  if (!$scope.hideComponents) {
                    $scope.hideComponents = [];
                  }
                  $scope.hideComponents = $scope.hideComponents.concat(parents);

                  // Auto populate the parent entity with the new data.
                  parents.forEach(function(parent) {
                    $scope[parent].loadSubmissionPromise.then(function (entity) {
                      $scope.submission.data[parent] = entity;
                    });
                  });
                }
                if (!handle) {
                  $scope.$on('formSubmission', function (event, submission) {
                    $scope.currentResource.resource = submission;
                    $state.go(baseName + '.view', query(submission));
                  });
                }
              }
            ]
          }))
          .state(baseName, options.alter.abstract({
            abstract: true,
            url: '/' + name + '/:' + queryId,
            data: options.data && options.data.abstract,
            templateUrl: templates.abstract ? templates.abstract : 'formio-helper/resource/resource.html',
            ncyBreadcrumb: options.breadcrumb ? {label: options.breadcrumb.label} : {skip: true},
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

                $scope.baseName = baseName;
                $scope.currentResource = $scope[name] = {
                  name: name,
                  queryId: queryId,
                  formUrl: url,
                  submissionUrl: submissionUrl,
                  formio: (new Formio(submissionUrl)),
                  resource: {},
                  form: {},
                  href: '/#/' + name + '/' + $stateParams[queryId] + '/',
                  parent: (parents.length === 1) ? $scope[parents[0]] : {href: '/#/', name: 'home'}
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
          }))
          .state(baseName + '.view', options.alter.view({
            url: '/',
            params: options.params && options.params.view,
            data: options.data && options.data.view,
            templateUrl: templates.view ? templates.view : 'formio-helper/resource/view.html',
            ncyBreadcrumb: {skip: true},
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
          }))
          .state(baseName + '.edit', options.alter.edit({
            url: '/edit',
            params: options.params && options.params.edit,
            data: options.data && options.data.edit,
            templateUrl: templates.edit ? templates.edit : 'formio-helper/resource/edit.html',
            ncyBreadcrumb: {skip: true},
            controller: [
              '$scope',
              '$state',
              '$controller',
              function ($scope,
                        $state,
                        $controller) {
                var handle = false;
                if (parents.length) {
                  if (!$scope.hideComponents) {
                    $scope.hideComponents = [];
                  }
                  $scope.hideComponents = $scope.hideComponents.concat(parents);
                }
                if (controllers.edit) {
                  var ctrl = $controller(controllers.edit, {$scope: $scope});
                  handle = (ctrl.handle || false);
                }
                if (!handle) {
                  $scope.$on('formSubmission', function (event, submission) {
                    $scope.currentResource.resource = submission;
                    $state.go(baseName + '.view', query(submission));
                  });
                }
              }
            ]
          }))
          .state(baseName + '.delete', options.alter.delete({
            url: '/delete',
            params: options.params && options.params.delete,
            data: options.data && options.data.delete,
            templateUrl: templates.delete ? templates.delete : 'formio-helper/resource/delete.html',
            ncyBreadcrumb: {skip: true},
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
                    if ((parents.length === 1) && parents[0] !== 'home') {
                      $state.go(parents[0] + '.view');
                    }
                    else {
                      $state.go('home', null, {reload: true});
                    }
                  });
                  $scope.$on('cancel', function () {
                    $state.go(baseName + 'Index');
                  });
                }
              }
            ]
          }));
      },
      $get: function () {
        return resources;
      }
    };
  }
]);

},{}]},{},[7]);
