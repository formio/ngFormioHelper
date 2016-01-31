var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var vinylPaths = require('vinyl-paths');
plugins.source = require('vinyl-source-stream');
plugins.browserify = require('browserify');

// Clean the dist folder.
gulp.task('clean', function() {
    return gulp.src('dist').pipe(vinylPaths(del));
});

var bundle = plugins.browserify({
    entries: './src/ng-formio-helper.js',
    debug: true
});

// Wire the dependencies into index.html
gulp.task('scripts', function() {
    return bundle
        .bundle()
        .pipe(plugins.source('ng-formio-helper.js'))
        .pipe(gulp.dest('dist'))
        .pipe(plugins.rename('ng-formio-helper.min.js'))
        .pipe(plugins.streamify(plugins.uglify()))
        .pipe(gulp.dest('dist'));
});

// Define the build task.
gulp.task('build', ['clean', 'scripts']);