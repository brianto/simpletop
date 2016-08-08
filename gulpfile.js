const gulp = require('gulp');

const bower = require('main-bower-files');
const cleancss = require('gulp-clean-css');
const concat = require('gulp-concat');
const debug = require('gulp-debug');
const del = require('del');
const handlebars = require('gulp-compile-handlebars');
const htmlmin = require('gulp-htmlmin');
const jshint = require('gulp-jshint');
const less = require('gulp-less');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const stylish = require('jshint-stylish');
const uglify = require('gulp-uglify');
const vinyl = require('vinyl-paths');
const watch = require('gulp-watch'); // TODO make server watch files and rebuild
const webserver = require('gulp-webserver');

// Underlying handlebars object
const Handlebars = handlebars.Handlebars;

const BUILD = 'dist';
const BUILD_APP = `${BUILD}/app`;

const FILE_BOWER_JS = 'bower.js';
const FILE_BOWER_CSS = 'bower.css';

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

gulp.task('compile:deps:js', () => {
  return gulp.src(bower(/\.js$/))
    .pipe(sourcemaps.init())

    // Compress
    .pipe(uglify())

    // Concat to distributable
    .pipe(concat(FILE_BOWER_JS))

    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension('.hbs')))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:deps:css', () => {
  return gulp.src(bower(/\.css$/))
    .pipe(sourcemaps.init())

    // Compress
    .pipe(cleancss())

    // Concat to distributable
    .pipe(concat(FILE_BOWER_CSS))

    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension('.hbs')))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:deps', [
  'compile:deps:js',
  'compile:deps:css',
]);

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
]);

gulp.task('compile', [
  'compile:deps',
  'compile:page',
], () => {
  return gulp.src([ 'app/*.html.hbs' ])

    // Build using compiled html, css, js
    .pipe(handlebars(null, {
      batch: [ BUILD_APP ],
      helpers: {
        // Returns raw partial without handlebar-ing. Otherwise, files with
        // '{{' in them will trigger handlebars and characters will be
        // html-escape'd, which isn't what we want.  Use this in place of '>'.
        raw: name => new Handlebars.SafeString(Handlebars.partials[name]),
      },
    }))

    // Minify
    .pipe(htmlmin({
      caseSensitive: true,
      collapseWhitespace: true,
      removeComments: true,
    }))

    // No longer handlebars, remove extension
    .pipe(rename({ extname: '' }))

    .pipe(gulp.dest(BUILD))
    ;
});

gulp.task('server', [
  'compile',
], () => {
  return gulp.src(BUILD)
    .pipe(webserver())
    ;
});

gulp.task('default', [
  'compile',
]);

