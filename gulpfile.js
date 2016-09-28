const gulp = require('gulp');

const babel = require('gulp-babel');
const bower = require('main-bower-files');
const cleancss = require('gulp-clean-css');
const concat = require('gulp-concat');
const crisper = require('gulp-crisper');
const debug = require('gulp-debug');
const del = require('del');
const fs = require('fs');
const handlebars = require('gulp-compile-handlebars');
const htmlmin = require('gulp-htmlmin');
const jshint = require('gulp-jshint');
const less = require('gulp-less');
const merge = require('merge-stream');
const path = require('path');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const stylish = require('jshint-stylish');
const uglify = require('gulp-uglify');
const vinyl = require('vinyl-paths');
const vulcanize = require('gulp-vulcanize');
const watch = require('gulp-watch'); // TODO make server watch files and rebuild
const webserver = require('gulp-webserver');

// Underlying handlebars object
const Handlebars = handlebars.Handlebars;
const HANDLEBARS_EXT = 'hbs';
const HTML_EXT = 'html';

const BUILD = 'dist';
const BUILD_APP = `${BUILD}/app`;
const BUILD_COMPONENTS = `${BUILD}/components`;

const FILE_BOWER_JS = 'bower.js';
const FILE_BOWER_CSS = 'bower.css';
const FILE_COMPONENTS = 'components.html';

function concatExtension(ext) {
  return file => {
    file.extname += ext.startsWith('.') ? ext : `.${ext}`;
  }
}

gulp.task('clean', () => {
  return gulp.src([ BUILD ])
    .pipe(vinyl(del))
    .pipe(debug({ title: 'del:' }))
    ;
});

gulp.task('compile:deps:html', () => {
  return gulp.src(bower(/\.html$/))
    .pipe(gulp.dest(BUILD_APP))
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
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

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
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:deps', [
  'compile:deps:js',
  'compile:deps:css',
  'compile:deps:html',
]);

gulp.task('compile:app:html', () => {
  return gulp.src([ 'app/*.html' ])

    // Compress
    .pipe(htmlmin({ collapseWhitespace: true }))

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:app:css', () => {
  return gulp.src([ 'app/*.less' ])

    // Less
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:app:js', () => {
  return gulp.src([ 'app/*.js' ])

    // JSHint
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'))

    // Compress
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: [ 'es2015' ], // Uglify doesn't support ES6 yet :-(
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:app', [
  'compile:app:html',
  'compile:app:css',
  'compile:app:js',
]);

gulp.task('compile:components:html', () => {
  return gulp.src([ 'components/**/*.html' ])

    // Compress
    .pipe(htmlmin({ collapseWhitespace: true }))

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

    .pipe(gulp.dest(BUILD_COMPONENTS))
    ;
});

gulp.task('compile:components:css', () => {
  return gulp.src([ 'components/**/*.less' ])

    // Less
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

    .pipe(gulp.dest(BUILD_COMPONENTS))
    ;
});

gulp.task('compile:components:js', () => {
  return gulp.src([ 'components/**/*.js' ])

    // JSHint
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'))

    // TODO unit test components

    // Compress
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: [ 'es2015' ], // Uglify doesn't support ES6 yet :-(
    }))
    .pipe(uglify())
    .pipe(sourcemaps.write())

    // Allow handlebars to use this as a partial
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))

    .pipe(gulp.dest(BUILD_COMPONENTS))
    ;
});

gulp.task('compile:components', [
  'compile:components:html',
  'compile:components:css',
  'compile:components:js',
], () => {
  const components = fs.readdirSync(BUILD_COMPONENTS)
    .filter(file => fs.statSync(path.join(BUILD_COMPONENTS, file)).isDirectory())
    .map(component => {
      return gulp.src(`components/${component}/*.html.${HANDLEBARS_EXT}`)
        // Build using compiled html, css, js
        .pipe(handlebars(null, {
          batch: [ `${BUILD_COMPONENTS}/${component}` ],
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

        // Name file after directory
        .pipe(rename(file => {
          file.basename = path.basename(component);
          file.extname = `.${HTML_EXT}`;
        }))

        // .pipe(gulp.dest(BUILD_APP))
        ;
    })
    ;

  return merge(components)
    // Dump components into app dir for index.html compilation
    .pipe(concat(FILE_COMPONENTS))
    .pipe(rename(concatExtension(HANDLEBARS_EXT)))
    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile:index', [
  'compile:deps',
  'compile:app',
  'compile:components',
], () => {
  return gulp.src([ `app/*.${HTML_EXT}.${HANDLEBARS_EXT}` ])

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

    .pipe(gulp.dest(BUILD_APP))
    ;
});

gulp.task('compile', [
  'compile:index',
], () => {
  return gulp.src([ `${BUILD_APP}/index.html` ])

    // Vulcanize
    // https://github.com/Polymer/vulcanize
    .pipe(vulcanize({
      inlineScripts: true,
      inlineCss: true,
    }))

    // Crisper
    // https://github.com/Polymer/crisper
    .pipe(crisper({
      scriptInHead: false,
    }))

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

