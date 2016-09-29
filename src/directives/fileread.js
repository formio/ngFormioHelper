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