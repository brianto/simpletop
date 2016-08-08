const gulp = require('gulp');

const debug = require('gulp-debug');
const vinyl = require('vinyl-paths');
const stylish = require('jshint-stylish');
const watch = require('gulp-watch'); // TODO make server watch files and rebuild
const webserver = require('gulp-webserver');

const del = require('del');
const handlebars = require('gulp-compile-handlebars');
const htmlmin = require('gulp-htmlmin');
const jshint = require('gulp-jshint');
const less = require('gulp-less');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');

const BUILD = 'dist';
const BUILD_APP = `${BUILD}/app`;

function concatExtension(ext) {
  return path => {
    path.extname += ext.startsWith('.') ? ext : `.${ext}`;
  }
}

gulp.task('clean', () => {
  return gulp.src([ BUILD ])
    .pipe(vinyl(del))
    .pipe(debug({ title: 'del:' }))
    ;
});

gulp.task('compile:page:html', () => {
  return gulp.src([ 'app/*.html' ])

    // Compress
    .pipe(htmlmin({ collapseWhitespace: true }))

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension('.hbs')))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:page:css', () => {
  return gulp.src([ 'app/*.less' ])

    // Less
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension('.hbs')))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:page:js', () => {
  return gulp.src([ 'app/*.js' ])

    // JSHint
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'))

    // Compress
    .pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension('.hbs')))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:page', [
  'compile:page:html',
  'compile:page:css',
  'compile:page:js',
], () => {
  return gulp.src([ 'app/*.html.hbs' ])

    // Build using compiled html, css, js
    .pipe(handlebars(null, {
      batch: BUILD_APP,
    }))

    // Minify
    .pipe(htmlmin({ collapseWhitespace: true }))

    // No longer handlebars, remove extension
    .pipe(rename({ extname: '' }))

    .pipe(gulp.dest(BUILD))
    ;
});

gulp.task('compile', [
  'compile:page',
]);

gulp.task('server', [
  'compile',
], () => {
  return gulp.src(BUILD)
    .pipe(webserver({
      livereload: {
        enable: true,
        filter: filename => filename.match(/.html/),
      },
    }))
    ;
});

gulp.task('default', [
  'compile',
]);

