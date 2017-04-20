var fs = require('fs');
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
      fs.readFileSync(__dirname + '/templates/formbuilder/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/create.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/create.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/delete.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/delete.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/edit.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/edit.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/form.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/form.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/settings.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/settings.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/view.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/view.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/action/add.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/action/add.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/action/delete.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/action/delete.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/action/edit.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/action/edit.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/action/index.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/action/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/action/item.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/action/item.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/action/view.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/action/view.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/permission/editor.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/permission/editor.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/permission/index.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/permission/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/submission/delete.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/submission/delete.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/submission/edit.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/submission/edit.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/submission/index.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/submission/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/submission/item.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/submission/item.html', 'utf8')
    );

    $templateCache.put('formio-helper/formbuilder/submission/view.html',
      fs.readFileSync(__dirname + '/templates/formbuilder/submission/view.html', 'utf8')
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
