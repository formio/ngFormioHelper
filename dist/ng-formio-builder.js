(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
angular.module('ngFormBuilderHelper')
.constant('FormActionController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioAlerts',
  'FormioUtils',
  '$q',
  function (
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioAlerts,
    FormioUtils,
    $q
  ) {
    $scope.actionUrl = '';
    $scope.actionInfo = $stateParams.actionInfo || {settingsForm: {}};
    $scope.action = {data: {settings: {}, condition: {}}};
    $scope.newAction = {name: '', title: 'Select an Action'};
    $scope.availableActions = {};
    $scope.addAction = function() {
      if ($scope.newAction.name) {
        $state.go($scope.basePath + 'form.action.add', {
          actionName: $scope.newAction.name
        });
      }
      else {
        FormioAlerts.onError({
          message: 'You must select an action to add.',
          element: 'action-select'
        });
      }
    };
    $scope.formio.loadActions().then(function(actions) {
      $scope.actions = actions;
    }, FormioAlerts.onError.bind(FormioAlerts));
    $scope.formio.availableActions().then(function(available) {
      if (!available[0].name) {
        available.shift();
      }
      available.unshift($scope.newAction);
      $scope.availableActions = available;
    });

    // Get the action information.
    var getActionInfo = function(name) {
      return $scope.formio.actionInfo(name).then(function(actionInfo) {
        if(actionInfo) {
          $scope.actionInfo = _.merge($scope.actionInfo, actionInfo);
          return $scope.actionInfo;
        }
      });
    };

    var onActionInfo = function(actionInfo) {
      // SQL Action missing sql server warning
      if(actionInfo && actionInfo.name === 'sql') {
        FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
          if(component.key === 'settings[type]' && JSON.parse(component.data.json).length === 0) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any SQL servers configured. You can add a SQL server in the config/default.json configuration.');
          }
        });
      }

      // Email action missing transports (other than the default one).
      if(actionInfo && actionInfo.name === 'email') {
        FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
          if(component.key === 'settings[transport]' && JSON.parse(component.data.json).length <= 1) {
            FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> You do not have any email transports configured. You need to add them in the config/default.json configuration.');
          }
        });
      }

      // Auth action alert for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'auth') {
        $scope.$watch('action.data.settings', function(current, old) {
          if(current.hasOwnProperty('association')) {
            angular.element('#form-group-role').css('display', current.association === 'new' ? '' : 'none');
          }

          // Make the role required for submission if this is a new association.
          if (
            current.hasOwnProperty('association') &&
            old.hasOwnProperty('association') &&
            current.association !== old.association
          ) {
            // Find the role settings component, and require it as needed.
            FormioUtils.eachComponent(actionInfo.settingsForm.components, function(component) {
              if (component.key && component.key === 'role') {
                // Update the validation settings.
                component.validate = component.validate || {};
                component.validate.required = (current.association === 'new' ? true : false);
              }
            });

            // Dont save the old role settings if this is an existing association.
            current.role = (current.role && (current.association === 'new')) || '';
          }
        }, true);
      }

      // Role action alert for new resource missing role assignment.
      if(actionInfo && actionInfo.name === 'role') {
        FormioAlerts.warn('<i class="glyphicon glyphicon-exclamation-sign"></i> The Role Assignment Action requires a Resource Form component with the API key, \'submission\', to modify existing Resource submissions.');
      }
    };

    /**
     * Load an action into the scope.
     * @param defaults
     */
    var loadAction = function(defaults) {
      if ($stateParams.actionId) {
        $scope.actionUrl = $scope.formio.formUrl + '/action/' + $stateParams.actionId;
        var loader = new Formio($scope.actionUrl);
        return loader.loadAction().then(function(action) {
          $scope.action = _.merge($scope.action, {data: action});
          return getActionInfo(action.name);
        });
      }
      else {
        $scope.action = _.merge($scope.action, {data: defaults});
        $scope.action.data.settings = {};
        return $q.when($scope.actionInfo);
      }
    };

    // Get the action information.
    if (!$stateParams.actionInfo && $stateParams.actionName) {
      getActionInfo($stateParams.actionName).then(function(info) {
        loadAction(info.defaults).then(onActionInfo);
      });
    }
    else {
      // Load the action.
      loadAction($scope.actionInfo.defaults).then(onActionInfo);
    }

    // Called when the action has been updated.
    $scope.$on('formSubmission', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was updated.'});
      $state.go($scope.basePath + 'form.actionIndex');
    });

    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({type: 'success', message: 'Action was deleted.'});
      $state.go($scope.basePath + 'form.actionIndex');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go($scope.basePath + 'form.actionIndex');
    });
  }
]);

},{}],2:[function(require,module,exports){
"use strict";
angular.module('ngFormBuilderHelper')
.constant('FormController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioHelperConfig',
  'FormioAlerts',
  function (
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioHelperConfig,
    FormioAlerts
  ) {
    $scope.loading = true;
    $scope.hideComponents = [];
    $scope.submission = {data: {}};
    $scope.formId = $stateParams.formId;
    $scope.formUrl = FormioHelperConfig.appUrl + '/form';
    $scope.appUrl = FormioHelperConfig.appUrl;
    var formTag = FormioHelperConfig.tag || 'common';
    $scope.formUrl += $stateParams.formId ? ('/' + $stateParams.formId) : '';
    $scope.form = {
      display: 'form',
      components:[],
      type: ($stateParams.formType ? $stateParams.formType : 'form'),
      tags: [formTag]
    };
    $scope.tags = [{text: formTag}];
    $scope.formio = new Formio($scope.formUrl);
    $scope.formDisplays = [
      {
        name: 'form',
        title: 'Form'
      },
      {
        name: 'wizard',
        title: 'Wizard'
      }
    ];

    // Load the form if the id is provided.
    if ($stateParams.formId) {
      $scope.formLoadPromise = $scope.formio.loadForm().then(function(form) {
        form.display = form.display || 'form';
        $scope.form = form;
        var tags = form.tags || [];
        $scope.tags = tags.map(function(tag) { return {text: tag}; });
        return form;
      }, FormioAlerts.onError.bind(FormioAlerts));
    }
    else {
      // Load the roles available.
      if (!$scope.form.submissionAccess) {
        Formio.makeStaticRequest(Formio.getProjectUrl() + '/role?limit=1000').then(function(roles) {
          if ($scope.form.submissionAccess) {
            return;
          }
          angular.forEach(roles, function(role) {
            if (!role.admin && !role.default) {
              // Add access to the form being created to allow for authenticated people to create their own.
              $scope.form.submissionAccess = [
                {
                  type: 'create_own',
                  roles: [role._id]
                },
                {
                  type: 'read_own',
                  roles: [role._id]
                },
                {
                  type: 'update_own',
                  roles: [role._id]
                },
                {
                  type: 'delete_own',
                  roles: [role._id]
                }
              ];
            }
          });
        });
      }
    }

    // Match name of form to title if not customized.
    $scope.titleChange = function(oldTitle) {
      if (!$scope.form.name || $scope.form.name === _.camelCase(oldTitle)) {
        $scope.form.name = _.camelCase($scope.form.title);
      }
      if ($scope.$parent && $scope.$parent.form) {
        $scope.$parent.form.title = $scope.form.title;
      }
    };

    // Update form tags
    $scope.updateFormTags = function() {
      $scope.form.tags = $scope.tags.map(function(tag) { return tag.text; });
    };

    // When display is updated
    $scope.$watch('form.display', function (display) {
      $scope.$broadcast('formDisplay', display);
    });

    // When a submission is made.
    $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      if (submission._id) {
        $state.go($scope.basePath + 'form.submission.view', {subId: submission._id});
      }
    });

    $scope.$on('pagination:error', function() {
      $scope.loading = false;
    });
    $scope.$on('pagination:loadPage', function() {
      $scope.loading = false;
    });

    // Called when the form is updated.
    $scope.$on('formUpdate', function(event, form) {
      $scope.form.components = form.components;
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });

    // Called when the form or resource is deleted.
    $scope.$on('delete', function() {
      var type = $scope.form.type === 'form' ? 'Form ' : 'Resource ';
      FormioAlerts.addAlert({
        type: 'success',
        message: type + $scope.form.name + ' was deleted.'
      });
      $state.go($scope.basePath + 'home');
    });

    $scope.$on('cancel', function() {
      $state.go($scope.basePath + 'form.view');
    });

    // Save a form.
    $scope.saveForm = function() {
      $scope.formio.saveForm(angular.copy($scope.form)).then(function(form) {
        angular.merge($scope.form, form);
        var method = $stateParams.formId ? 'updated' : 'created';
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Successfully ' + method + ' form!'
        });
        $state.go($scope.basePath + 'form.view', {formId: form._id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);

},{}],3:[function(require,module,exports){
"use strict";
angular.module('ngFormBuilderHelper')
  .constant('FormIndexController', [
    '$scope',
    'FormioHelperConfig',
    function (
      $scope,
      FormioHelperConfig
    ) {
      $scope.forms = [];
      $scope.formsUrl = FormioHelperConfig.appUrl + '/form?type=form&tags=' + FormioHelperConfig.tag;
      $scope.formsPerPage = FormioHelperConfig.perPage;
    }
  ]);
},{}],4:[function(require,module,exports){
"use strict";
angular.module('ngFormBuilderHelper')
.constant('FormSubmissionController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioAlerts',
  '$timeout',
  function (
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioAlerts,
    $timeout
  ) {
    $scope.token = Formio.getToken();
    $scope.submissionId = $stateParams.subId;
    $scope.submissionUrl = $scope.formUrl;
    $scope.submissionUrl += $stateParams.subId ? ('/submission/' + $stateParams.subId) : '';
    $scope.submissionData = Formio.submissionData;
    $scope.submission = {};

    // Load the submission.
    if ($scope.submissionId) {
      $scope.formio = new Formio($scope.submissionUrl);
      $scope.loadSubmissionPromise = $scope.formio.loadSubmission().then(function(submission) {
        $scope.submission = submission;
        return submission;
      });
    }

    $scope.$on('formSubmission', function(event, submission) {
      event.stopPropagation();
      var message = (submission.method === 'put') ? 'updated' : 'created';
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was ' + message + '.'
      });
      $state.go($scope.basePath + 'form.submissionIndex', {formId: $scope.formId});
    });

    $scope.$on('delete', function(event) {
      event.stopPropagation();
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Submission was deleted.'
      });
      $state.go($scope.basePath + 'form.submissionIndex');
    });

    $scope.$on('cancel', function(event) {
      event.stopPropagation();
      $state.go($scope.basePath + 'form.submission.view');
    });

    $scope.$on('formError', function(event, error) {
      event.stopPropagation();
      FormioAlerts.onError(error);
    });

    $scope.$on('rowSelect', function (event, submission) {
      $timeout(function() {
        $state.go($scope.basePath + 'form.submission.view', {
          subId: submission._id
        });
      });
    });

    $scope.$on('rowView', function (event, submission) {
      $state.go($scope.basePath + 'form.submission.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionView', function(event, submission) {
      $state.go($scope.basePath + 'form.submission.view', {
        subId: submission._id
      });
    });

    $scope.$on('submissionEdit', function(event, submission) {
      $state.go($scope.basePath + 'form.submission.edit', {
        subId: submission._id
      });
    });

    $scope.$on('submissionDelete', function(event, submission) {
      $state.go($scope.basePath + 'form.submission.delete', {
        subId: submission._id
      });
    });
  }
]);

},{}],5:[function(require,module,exports){
"use strict";
angular.module('ngFormBuilderHelper')
.constant('RoleController', [
  '$scope',
  'FormioHelperConfig',
  '$http',
  function (
    $scope,
    FormioHelperConfig,
    $http
  ) {
    $http.get(FormioHelperConfig.appUrl + '/role?limit=1000').then(function (result) {
      $scope.roles = result.data;
    });
  }
]);
},{}],6:[function(require,module,exports){
"use strict";
angular.module('ngFormBuilderHelper')
.directive('permissionEditor', [
  '$q',
  'SubmissionAccessLabels',
  function(
    $q,
    SubmissionAccessLabels
  ) {
    var PERMISSION_TYPES = [
      'create_all',
      'read_all',
      'update_all',
      'delete_all',
      'create_own',
      'read_own',
      'update_own',
      'delete_own'
    ];

    return {
      scope: {
        roles: '=',
        permissions: '=',
        waitFor: '='
      },
      restrict: 'E',
      templateUrl: 'formio-helper/formbuilder/permission/editor.html',
      link: function($scope) {
        // Fill in missing permissions / enforce order
        ($scope.waitFor || $q.when()).then(function(){
          var tempPerms = [];
          _.each(PERMISSION_TYPES, function(type) {
            var existingPerm = _.find($scope.permissions, {type: type});
            tempPerms.push(existingPerm || {
                type: type,
                roles: []
              });
          });
          // Replace permissions with complete set of permissions
          $scope.permissions.splice.apply($scope.permissions, [0, $scope.permissions.length].concat(tempPerms));
        });

        $scope.getPermissionsToShow = function() {
          return $scope.permissions.filter($scope.shouldShowPermission);
        };

        $scope.shouldShowPermission = function(permission) {
          return !!SubmissionAccessLabels[permission.type];
        };

        $scope.getPermissionLabel = function(permission) {
          return SubmissionAccessLabels[permission.type].label;
        };

        $scope.getPermissionTooltip = function(permission) {
          return SubmissionAccessLabels[permission.type].tooltip;
        };
      }
    };
  }
]);
},{}],7:[function(require,module,exports){
"use strict";
angular.module('ngFormBuilderHelper')
  .constant('FormioHelperConfig', {
    appUrl: '',
    tag: 'common',
    perPage: 10
  });
},{}],8:[function(require,module,exports){
"use strict";

angular.module('ngFormBuilderHelper', [
  'formio',
  'ngFormBuilder',
  'ngFormioGrid',
  'ngFormioHelper',
  'ngTagsInput',
  'ui.router',
  'bgf.paginateAnything'
])
.constant('SubmissionAccessLabels', {
  'read_all': {
    label: 'Read All Submissions',
    tooltip: 'The Read All Submissions permission will allow a user, with one of the given Roles, to read a Submission, regardless of who owns the Submission.'
  },
  'update_all': {
    label: 'Update All Submissions',
    tooltip: 'The Update All Submissions permission will allow a user, with one of the given Roles, to update a Submission, regardless of who owns the Submission. Additionally with this permission, a user can change the owner of a Submission.'
  },
  'delete_all': {
    label: 'Delete All Submissions',
    tooltip: 'The Delete All Submissions permission will allow a user, with one of the given Roles, to delete a Submission, regardless of who owns the Submission.'
  },
  'create_own': {
    label: 'Create Own Submissions',
    tooltip: 'The Create Own Submissions permission will allow a user, with one of the given Roles, to create a Submission. Upon creating the Submission, the user will be defined as its owner.'
  },
  'read_own': {
    label: 'Read Own Submissions',
    tooltip: 'The Read Own Submissions permission will allow a user, with one of the given Roles, to read a Submission. A user can only read a Submission if they are defined as its owner.'
  },
  'update_own': {
    label: 'Update Own Submissions',
    tooltip: 'The Update Own Submissions permission will allow a user, with one of the given Roles, to update a Submission. A user can only update a Submission if they are defined as its owner.'
  },
  'delete_own': {
    label: 'Delete Own Submissions',
    tooltip: 'The Delete Own Submissions permission will allow a user, with one of the given Roles, to delete a Submission. A user can only delete a Submission if they are defined as its owner.'
  }
})
.run([
  '$templateCache',
  function (
    $templateCache
  ) {
    $templateCache.put('formio-helper/formbuilder/index.html',
      "<a ng-if=\"isAdministrator || formAccess(['create_all'])\" ui-sref=\"{{ basePath }}createForm({formType: 'form'})\" class=\"btn btn-primary\"><span class=\"glyphicon glyphicon-plus\"></span> Create Form</a>\n<span class=\"glyphicon glyphicon-refresh glyphicon-spin\" style=\"font-size: 2em;\" ng-if=\"loading\"></span>\n<table class=\"table table-striped\" style=\"margin-top: 20px;\">\n  <tbody>\n  <tr data-ng-repeat=\"form in forms\" ng-if=\"isAdministrator || hasAccess(form.name, ['create_own', 'create_all', 'read_all', 'create_own'])\">\n    <td>\n      <div class=\"row\">\n        <div class=\"col-sm-8\">\n          <a ui-sref=\"{{ basePath }}form.view({formId: form._id})\"><h5>{{ form.title }}</h5></a>\n        </div>\n        <div class=\"col-sm-4\">\n          <div class=\"button-group pull-right\" style=\"display:flex;\">\n            <a ng-if=\"isAdministrator || hasAccess(form.name, ['create_own', 'create_all'])\" ui-sref=\"{{ basePath }}form.view({formId: form._id})\" class=\"btn btn-default btn-xs\">\n              <span class=\"glyphicon glyphicon-pencil\"></span> Enter Data\n            </a>&nbsp;\n            <a ng-if=\"isAdministrator || hasAccess(form.name, ['read_all', 'create_own'])\" ui-sref=\"{{ basePath }}form.submissionIndex({formId: form._id})\" class=\"btn btn-default btn-xs\">\n              <span class=\"glyphicon glyphicon-list-alt\"></span> View Data\n            </a>&nbsp;\n            <a ng-if=\"isAdministrator || formAccess(['edit_all', 'create_all'])\" ui-sref=\"{{ basePath }}form.edit({formId: form._id})\" class=\"btn btn-default btn-xs\">\n              <span class=\"glyphicon glyphicon-edit\"></span> Edit Form\n            </a>&nbsp;\n            <a ng-if=\"isAdministrator || formAccess(['delete_all'])\" ui-sref=\"{{ basePath }}form.delete({formId: form._id, formType: 'form'})\" class=\"btn btn-default btn-xs\">\n              <span class=\"glyphicon glyphicon-trash\"></span>\n            </a>\n          </div>\n        </div>\n      </div>\n    </td>\n  </tr>\n  </tbody>\n</table>\n<bgf-pagination\n  collection=\"forms\"\n  url=\"formsUrl\"\n  per-page=\"formsPerPage\"\n  template-url=\"formio-helper/pager.html\"\n></bgf-pagination>\n"
    );

    $templateCache.put('formio-helper/formbuilder/create.html',
      "<h2>Create a Form</h2>\n<div ng-include=\"'formio-helper/formbuilder/edit.html'\"></div>\n"
    );

    $templateCache.put('formio-helper/formbuilder/delete.html',
      "<h2>Delete form {{ form.title }}</h2>\n<formio-delete src=\"formUrl\"></formio-delete>\n"
    );

    $templateCache.put('formio-helper/formbuilder/edit.html',
      "<form role=\"form\" novalidate>\n  <div id=\"form-group-title\" class=\"form-group\">\n    <label for=\"title\" class=\"control-label\">Title</label>\n    <input type=\"text\" ng-model=\"form.title\" ng-change=\"titleChange('{{form.title}}')\" class=\"form-control\" id=\"title\" placeholder=\"Enter the form title\"/>\n  </div>\n  <div id=\"form-group-name\" class=\"form-group\">\n    <label for=\"name\" class=\"control-label\">Name</label>\n    <input type=\"text\" ng-model=\"form.name\" class=\"form-control\" id=\"name\" placeholder=\"Enter the form machine name\"/>\n  </div>\n  <div class=\"row\">\n    <div class=\"col col-sm-4\">\n      <div id=\"form-group-path\" class=\"form-group\">\n        <label for=\"path\" class=\"control-label\">Path</label>\n        <input type=\"text\" class=\"form-control\" id=\"path\" ng-model=\"form.path\" placeholder=\"example\" style=\"text-transform: lowercase\">\n        <small>The path alias for this form.</small>\n      </div>\n    </div>\n    <div class=\"col col-sm-4\">\n      <div id=\"form-group-display\" class=\"form-group\">\n        <label for=\"display\" class=\"control-label\">Display as</label>\n        <select class=\"form-control\" id=\"display\" ng-options=\"display.name as display.title for display in formDisplays\" ng-model=\"form.display\"></select>\n      </div>\n    </div>\n    <div class=\"col col-sm-4\">\n      <div id=\"form-group-tags\" class=\"form-group\">\n        <label for=\"tags\" class=\"control-label\">Tags</label>\n        <tags-input ng-model=\"tags\" on-tag-added=\"updateFormTags()\" on-tag-removed=\"updateFormTags()\" id=\"tags\"></tags-input>\n      </div>\n    </div>\n  </div>\n  <input type=\"hidden\" ng-model=\"form.type\"/>\n  <div ng-include=\"'formio-helper/formbuilder/settings.html'\"></div>\n  <form-builder form=\"form\" src=\"formUrl\"></form-builder>\n  <div class=\"form-group pull-right\">\n    <a class=\"btn btn-default\" ng-click=\"cancel()\">Cancel</a>\n    <input type=\"submit\" class=\"btn btn-primary\" ng-click=\"saveForm()\" value=\"{{formId ? 'Save' : 'Create'}} {{ capitalize(form.type)  }}\" />\n  </div>\n</form>\n"
    );

    $templateCache.put('formio-helper/formbuilder/form.html',
      "<h2>{{form.title}}</h2>\n<ul class=\"nav nav-tabs\">\n  <li role=\"presentation\" ng-if=\"isAdministrator || hasAccess(form.name, ['create_own', 'create_all'])\" ng-class=\"{active:isActive(basePath + 'form.view')}\"><a ui-sref=\"{{ basePath }}form.view()\">Enter Data</a></li>\n  <li role=\"presentation\" ng-if=\"isAdministrator || hasAccess(form.name, ['read_own', 'read_all'])\" ng-class=\"{active:isActive(basePath + 'form.submission')}\"><a ui-sref=\"{{ basePath }}form.submissionIndex()\">View Data</a></li>\n  <li role=\"presentation\" ng-if=\"isAdministrator || formAccess(['edit_all', 'create_all'])\" ng-class=\"{active:isActive(basePath + 'form.edit')}\"><a ui-sref=\"{{ basePath }}form.edit()\">Edit Form</a></li>\n  <li role=\"presentation\" ng-if=\"isAdministrator || formAccess(['edit_all', 'create_all'])\" ng-class=\"{active:isActive(basePath + 'form.action')}\"><a ui-sref=\"{{ basePath }}form.actionIndex()\">Form Actions</a></li>\n  <li role=\"presentation\" ng-if=\"isAdministrator || formAccess(['edit_all', 'create_all'])\" ng-class=\"{active:isActive(basePath + 'form.permission')}\"><a ui-sref=\"{{ basePath }}form.permission()\">Access</a></li>\n</ul>\n<div ui-view></div>\n"
    );

    $templateCache.put('formio-helper/formbuilder/settings.html',
      "\n"
    );

    $templateCache.put('formio-helper/formbuilder/view.html',
      "<formio src=\"formUrl\" submission=\"submission\" hide-components=\"hideComponents\"></formio>\n"
    );

    $templateCache.put('formio-helper/formbuilder/action/add.html',
      "<formio form=\"actionInfo.settingsForm\" submission=\"action\"></formio>\n"
    );

    $templateCache.put('formio-helper/formbuilder/action/delete.html',
      "<formio-delete resource-name=\"'action'\" form-action=\"actionUrl\"></formio-delete>"
    );

    $templateCache.put('formio-helper/formbuilder/action/edit.html',
      "<formio form=\"actionInfo.settingsForm\" submission=\"action\" form-action=\"actionUrl\"></formio>"
    );

    $templateCache.put('formio-helper/formbuilder/action/index.html',
      "<br/>\n<div class=\"panel panel-info\">\n  <div class=\"panel-heading\">\n    <a class=\"pull-right\" href=\"http://help.form.io/userguide/#actions\" target=\"_blank\">\n      <i class=\"glyphicon glyphicon-question-sign \"></i></a>\n\n    <h3 class=\"panel-title\">Form Actions</h3>\n  </div>\n  <div class=\"panel-body\">\n    <table class=\"table table-striped\">\n      <thead>\n      <tr>\n        <th>Name</th>\n        <th>Operations</th>\n      </tr>\n      </thead>\n      <tbody>\n      <tr data-ng-repeat=\"action in actions\">\n        <td>\n          <span ng-if=\"!action._id\">{{ action.title }}</span>\n          <a ng-if=\"action._id\" ui-sref=\"{{ basePath }}form.action.edit({actionId: action._id})\">{{ action.title }}</a>\n        </td>\n        <td>\n          <span ng-if=\"!action._id\">none</span>\n\n          <div class=\"button-group\" style=\"display:flex;\" ng-if=\"action._id\">\n            <a ui-sref=\"{{ basePath }}form.action.edit({actionId: action._id})\" class=\"btn btn-default btn-xs\"><span\n              class=\"glyphicon glyphicon-edit\"></span></a>&nbsp;\n            <a ui-sref=\"{{ basePath }}form.action.delete({actionId: action._id})\" class=\"btn btn-danger btn-xs\"><span\n              class=\"glyphicon glyphicon-remove-circle\"></span></a>\n          </div>\n        </td>\n      </tr>\n      </tbody>\n    </table>\n  </div>\n  <div class=\"panel-footer\">\n    <form class=\"form-inline\">\n      <div class=\"form-group\">\n        <select id=\"action-select\" name=\"action-select\" ng-model=\"newAction\" class=\"form-control\"\n                ng-options=\"action as action.title for action in availableActions\"></select>\n      </div>\n      <a ng-click=\"addAction()\" class=\"btn btn-primary\"><span class=\"glyphicon glyphicon-plus\"></span> Add Action</a>\n    </form>\n  </div>\n</div>\n"
    );

    $templateCache.put('formio-helper/formbuilder/action/item.html',
      "<br/><ul class=\"nav nav-tabs action-nav\">\n    <li role=\"presentation\" ng-class=\"{active:isActive(basePath + 'form.action.edit')}\"><a ui-sref=\"{{ basePath }}form.action.edit()\">Edit</a></li>\n    <li role=\"presentation\" ng-class=\"{active:isActive(basePath + 'form.action.delete')}\"><a ui-sref=\"{{ basePath }}form.action.delete()\">Delete</a></li>\n</ul>\n<div ui-view></div>\n"
    );

    $templateCache.put('formio-helper/formbuilder/action/view.html',
      "TO-DO: Add actions view."
    );

    $templateCache.put('formio-helper/formbuilder/permission/editor.html',
      "<div ng-if=\"roles\">\n  <table class=\"table table-striped\">\n    <tbody>\n    <tr>\n      <th>Permission</th>\n      <th>Roles</th>\n    </tr>\n    <tr ng-repeat=\"permission in getPermissionsToShow()\">\n      <td class=\"col-xs-3\">\n        <label for=\"{{permission.type}}_role\" form-builder-tooltip=\"{{getPermissionTooltip(permission)}}\">{{getPermissionLabel(permission)}}</label>\n      </td>\n      <td class=\"col-xs-9\">\n        <ui-select multiple ng-model=\"permission.roles\" theme=\"bootstrap\" reset-search-input=\"true\" name=\"{{permission.type}}_role\" id=\"{{permission.type}}_role\">\n          <ui-select-match placeholder=\"Select roles...\">{{$item.title}}</ui-select-match>\n          <ui-select-choices repeat=\"role._id as role in roles | filter: $select.search\">\n          <div>{{ role.title }}</div>\n          </ui-select-choices>\n        </ui-select>\n      </td>\n    </tr>\n    </tbody>\n  </table>\n</div>\n"
    );

    $templateCache.put('formio-helper/formbuilder/permission/index.html',
      "<br/>\n<div class=\"panel panel-info\">\n  <div class=\"panel-heading\">\n    <h3 class=\"panel-title\">User Permissions\n      <a class=\"pull-right\" href=\"http://help.form.io/userguide/#permissions\" target=\"_blank\">\n        <i class=\"glyphicon glyphicon-question-sign \"></i>\n      </a>\n    </h3>\n  </div>\n  <div class=\"panel-body\">\n    <div class=\"well\">\n      User Permissions allow you to control who can create, view, and modify form submissions. Here you may assign Project Roles to permissions. <strong>Roles</strong> can be created and edited in the <strong>config/default.json</strong> file.</a>.\n    </div>\n    <div ng-if=\"form._id\">\n      <permission-editor permissions=\"form.submissionAccess\" roles=\"roles\" wait-for=\"loadFormPromise\"></permission-editor>\n    </div>\n    <div class=\"form-group pull-right\">\n      <a class=\"btn btn-default\" ng-click=\"back()\">Cancel</a>\n      <input type=\"submit\" class=\"btn btn-primary\" ng-click=\"saveForm()\" value=\"Save Changes\" />\n    </div>\n  </div>\n</div>\n"
    );

    $templateCache.put('formio-helper/formbuilder/submission/delete.html',
      "<formio-delete src=\"submissionUrl\"></formio-delete>\n"
    );

    $templateCache.put('formio-helper/formbuilder/submission/edit.html',
      "<formio src=\"submissionUrl\"></formio>\n"
    );

    $templateCache.put('formio-helper/formbuilder/submission/index.html',
      "<div class=\"well submissions-header\">\n  <a class=\"btn btn-default\" href=\"{{ formio.formUrl }}/export?format=json&x-jwt-token={{ token }}\">Export JSON</a>\n  <a class=\"btn btn-default\" href=\"{{ formio.formUrl }}/export?format=csv&x-jwt-token={{ token }}\">Export CSV</a>\n</div>\n<div class=\"well\" ng-if=\"isAdministrator\">\n  To control which fields show up in this table, use the \"Table View\" setting on each field under \"Edit Form\".\n</div>\n<formio-grid src=\"formUrl\"></formio-grid>\n"
    );

    $templateCache.put('formio-helper/formbuilder/submission/item.html',
      "<ul class=\"nav nav-pills submission-nav\" style=\"margin-top:20px;\">\n  <li role=\"presentation\" ng-class=\"{active:isActive(basePath + 'form.submission.view')}\"><a ui-sref=\"{{ basePath }}form.submission.view()\">View Submission</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(basePath + 'form.submission.edit')}\"><a ui-sref=\"{{ basePath }}form.submission.edit()\">Edit Submission</a></li>\n  <li role=\"presentation\" ng-class=\"{active:isActive(basePath + 'form.submission.delete')}\"><a ui-sref=\"{{ basePath }}form.submission.delete()\">Delete Submission</a></li>\n</ul>\n<div ui-view style=\"margin-top: 20px;\"></div>\n"
    );

    $templateCache.put('formio-helper/formbuilder/submission/view.html',
      "<formio-submission form=\"form\" submission=\"submission\" read-only=\"true\"></formio-submission>\n"
    );
  }
]);

// Controllers.
require('./controllers/FormActionController.js');
require('./controllers/FormController.js');
require('./controllers/FormIndexController.js');
require('./controllers/FormSubmissionController.js');
require('./controllers/RoleController.js');

// Directives
require('./directives/permissionEditor.js');

// Factories
require('./factories/FormioHelperConfig.js');

// Providers
require('./providers/FormioFormBuilder.js');

},{"./controllers/FormActionController.js":1,"./controllers/FormController.js":2,"./controllers/FormIndexController.js":3,"./controllers/FormSubmissionController.js":4,"./controllers/RoleController.js":5,"./directives/permissionEditor.js":6,"./factories/FormioHelperConfig.js":7,"./providers/FormioFormBuilder.js":9}],9:[function(require,module,exports){
"use strict";
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
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.index', 'formio-helper/formbuilder/index.html'),
            controller: ['$scope', '$controller', 'FormIndexController', execute('form.index')]
          })
          .state(basePath + 'createForm', {
            url: '/create/:formType',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.create', 'formio-helper/formbuilder/create.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.create')]
          })
          .state(basePath + 'form', {
            abstract: true,
            url: '/form/:formId',
            ncyBreadcrumb: _.get(options, 'breadcrumb.form', {skip: true}),
            templateUrl: _.get(templates, 'form.abstract', 'formio-helper/formbuilder/form.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.abstract')]
          })
          .state(basePath + 'form.view', {
            url: '/',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.view', 'formio-helper/formbuilder/view.html'),
            controller: ['$scope', '$controller', execute('form.view')]
          })
          .state(basePath + 'form.edit', {
            url: '/edit',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.edit', 'formio-helper/formbuilder/edit.html'),
            controller: ['$scope', '$controller', 'FormController', execute('form.edit')]
          })
          .state(basePath + 'form.delete', {
            url: '/delete',
            ncyBreadcrumb: {skip: true},
            templateUrl: _.get(templates, 'form.delete', 'formio-helper/formbuilder/delete.html'),
            controller: ['$scope', '$controller', execute('form.delete')]
          });

        var formStates = {};
        formStates[basePath + 'form.submission'] = {
          name: 'submission',
          id: 'subId',
          controller: ['$scope', '$controller', 'FormSubmissionController', execute('submission.index')]
        };
        formStates[basePath + 'form.action'] = {
          name: 'action',
          id: 'actionId',
          controller: ['$scope', '$controller', 'FormActionController', execute('action.index')]
        };

        angular.forEach(formStates, function(info, state) {
          $stateProvider
            .state(state + 'Index', {
              url: '/' + info.name,
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.index', 'formio-helper/formbuilder/' + info.name + '/index.html'),
              controller: info.controller
            })
            .state(state, {
              abstract: true,
              ncyBreadcrumb: _.get(options, 'breadcrumb.' + info.name, {skip: true}),
              url: '/' + info.name + '/:' + info.id,
              controller: info.controller,
              templateUrl: _.get(templates, info.name + '.abstract', 'formio-helper/formbuilder/' + info.name + '/item.html')
            })
            .state(state + '.view', {
              url: '',
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.view', 'formio-helper/formbuilder/' + info.name + '/view.html'),
              controller: ['$scope', '$controller', execute(info.name + '.view')]
            })
            .state(state + '.edit', {
              url: '/edit',
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.edit', 'formio-helper/formbuilder/' + info.name + '/edit.html'),
              controller: ['$scope', '$controller', execute(info.name + '.edit')]
            })
            .state(state + '.delete', {
              url: '/delete',
              ncyBreadcrumb: {skip: true},
              templateUrl: _.get(templates, info.name + '.delete', 'formio-helper/formbuilder/' + info.name + '/delete.html'),
              controller: ['$scope', '$controller', execute(info.name + '.delete')]
            });
        });

        // Add the action adding state.
        $stateProvider.state(basePath + 'form.action.add', {
          url: '/add/:actionName',
          ncyBreadcrumb: {skip: true},
          templateUrl: _.get(templates, 'action.add', 'formio-helper/formbuilder/action/add.html'),
          controller: ['$scope', '$controller', 'FormActionController', execute('action.add')],
          params: {actionInfo: null}
        });

        // Add permission state.
        $stateProvider.state(basePath + 'form.permission', {
          url: '/permission',
          ncyBreadcrumb: {skip: true},
          templateUrl: _.get(templates, 'permission.index', 'formio-helper/formbuilder/permission/index.html'),
          controller: ['$scope', '$controller', 'RoleController', execute('permission.index')]
        });
      },
      $get: function () {
        return {};
      }
    };
  }
]);

},{}]},{},[8]);
