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