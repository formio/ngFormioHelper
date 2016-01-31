var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var vinylPaths = require('vinyl-paths');

// Clean the dist folder.
gulp.task('clean', function() {
    return gulp.src('dist').pipe(vinylPaths(del));
});

// Wire the dependencies into index.html
gulp.task('scripts', function() {
    return gulp.src('./src/ng-formio-helper.js').pipe(plugins.uglify()).pipe(gulp.dest('./dist'));
});

// Define the build task.
gulp.task('build', ['clean', 'scripts']);