var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var vinylPaths = require('vinyl-paths');
var path = require('path');
plugins.source = require('vinyl-source-stream');
plugins.browserify = require('browserify');
plugins.watchify = require('watchify');

// Clean the dist folder.
gulp.task('clean', function () {
  return gulp.src('dist').pipe(vinylPaths(del));
});

var bundleHelper = plugins.browserify({
  entries: './src/ng-formio-helper.js',
  debug: false
});

var bundleBuilder = plugins.browserify({
  entries: './src/ng-formio-builder.js',
  debug: false
});

var builder = function(bundle, file) {
  return function () {
    return bundle.bundle()
      .pipe(plugins.source(file + '.js'))
      .pipe(gulp.dest('dist'))
      .pipe(plugins.rename(file + '.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist'));
  };
};

// Wire the dependencies into index.html
var buildHelper = builder(bundleHelper, 'ng-formio-helper');

// Wire the dependencies into index.html
var buildBuilder = builder(bundleBuilder, 'ng-formio-builder');

gulp.task('scripts-helper', buildHelper);
gulp.task('scripts-builder', buildBuilder);
gulp.task('scripts', ['scripts-helper', 'scripts-builder']);
gulp.task('watch', function () {
  plugins.watchify(bundleHelper)
    .on('update', function (files) {
      console.log('Changed files: ', files.map(path.relative.bind(path, process.cwd())).join(', '));
      console.log('Rebuilding dist/ng-formio-helper.js...');
      buildHelper();
    })
    .on('log', function (msg) {
      console.log(msg);
    });
  return buildHelper();
});

// Define the build task.
gulp.task('build', ['clean', 'scripts']);
gulp.task('default', ['watch']);