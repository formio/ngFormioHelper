var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var del = require('del');
var vinylPaths = require('vinyl-paths');
var path = require('path');
plugins.source = require('vinyl-source-stream');
plugins.browserify = require('browserify');
plugins.watchify = require('watchify');

// Clean the dist folder.
gulp.task('clean', function() {
    return gulp.src('dist').pipe(vinylPaths(del));
});

var bundle = plugins.browserify({
    entries: './src/ng-formio-helper.js',
    debug: true
});

// Wire the dependencies into index.html
var build = function() {
    return bundle
      .bundle()
      .pipe(plugins.source('ng-formio-helper.js'))
      .pipe(gulp.dest('dist'))
      .pipe(plugins.rename('ng-formio-helper.min.js'))
      .pipe(plugins.streamify(plugins.uglify()))
      .pipe(gulp.dest('dist'));
};
gulp.task('scripts', build);
gulp.task('watch', function() {
    bundle = plugins.watchify(bundle);
    bundle.on('update', function(files) {
        console.log('Changed files: ', files.map(path.relative.bind(path, process.cwd())).join(', '));
        console.log('Rebuilding dist/formio.js...');
        build();
    });
    bundle.on('log', function(msg) {
        console.log(msg);
    });
    return build();
});

// Define the build task.
gulp.task('build', ['clean', 'scripts']);
gulp.task('default', ['watch']);