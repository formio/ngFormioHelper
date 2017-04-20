var fs = require('fs');
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
      fs.readFileSync(__dirname + '/templates/partials/pager.html', 'utf8')
    );

    $templateCache.put('formio-helper/breadcrumb.html',
      fs.readFileSync(__dirname + '/templates/partials/breadcrumb.html', 'utf8')
    );

    /**** AUTH TEMPLATES ****/
    $templateCache.put('formio-helper/auth/auth.html',
      fs.readFileSync(__dirname + '/templates/auth/auth.html', 'utf8')
    );

    $templateCache.put('formio-helper/auth/login.html',
      fs.readFileSync(__dirname + '/templates/auth/login.html', 'utf8')
    );

    $templateCache.put('formio-helper/auth/register.html',
      fs.readFileSync(__dirname + '/templates/auth/register.html', 'utf8')
    );

    /**** RESOURCE TEMPLATES *******/
    $templateCache.put('formio-helper/resource/resource.html',
      fs.readFileSync(__dirname + '/templates/resource/resource.html', 'utf8')
    );

    $templateCache.put('formio-helper/resource/create.html',
      fs.readFileSync(__dirname + '/templates/resource/create.html', 'utf8')
    );

    $templateCache.put('formio-helper/resource/delete.html',
      fs.readFileSync(__dirname + '/templates/resource/delete.html', 'utf8')
    );

    $templateCache.put('formio-helper/resource/edit.html',
      fs.readFileSync(__dirname + '/templates/resource/edit.html', 'utf8')
    );

    $templateCache.put('formio-helper/resource/index.html',
      fs.readFileSync(__dirname + '/templates/resource/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/resource/view.html',
      fs.readFileSync(__dirname + '/templates/resource/view.html', 'utf8')
    );

    /**** FORM TEMPLATES *******/
    $templateCache.put('formio-helper/form/list.html',
      fs.readFileSync(__dirname + '/templates/form/list.html', 'utf8')
    );

    $templateCache.put('formio-helper/form/index.html',
      fs.readFileSync(__dirname + '/templates/form/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/form/form.html',
      fs.readFileSync(__dirname + '/templates/form/form.html', 'utf8')
    );

    $templateCache.put('formio-helper/form/view.html',
      fs.readFileSync(__dirname + '/templates/form/view.html', 'utf8')
    );

    /**** SUBMISSION TEMPLATES *******/
    $templateCache.put('formio-helper/submission/index.html',
      fs.readFileSync(__dirname + '/templates/submission/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/submission/submission.html',
      fs.readFileSync(__dirname + '/templates/submission/submission.html', 'utf8')
    );

    $templateCache.put('formio-helper/submission/view.html',
      fs.readFileSync(__dirname + '/templates/submission/view.html', 'utf8')
    );

    $templateCache.put('formio-helper/submission/edit.html',
      fs.readFileSync(__dirname + '/templates/submission/edit.html', 'utf8')
    );

    $templateCache.put('formio-helper/submission/delete.html',
      fs.readFileSync(__dirname + '/templates/submission/delete.html', 'utf8')
    );

    /**** OFFLINE TEMPLATES ****/
    $templateCache.put('formio-helper/offline/index.html',
      fs.readFileSync(__dirname + '/templates/offline/index.html', 'utf8')
    );

    $templateCache.put('formio-helper/offline/button.html',
      fs.readFileSync(__dirname + '/templates/offline/button.html', 'utf8')
    );

    $templateCache.put('formio/components/resourcefields.html', FormioUtils.fieldWrap(
        fs.readFileSync(__dirname + '/templates/components/resourcefields.html', 'utf8')
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
