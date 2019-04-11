import yargs from 'yargs';
import gulp from 'gulp';
import inky from 'inky';
import loadPlugins from 'gulp-load-plugins';
import del from 'del';
import fs from 'fs';
import parse from 'siphon-media-query';
import lazypipe from 'lazypipe';
import path from 'path';

const $ = loadPlugins();

const PRODUCTION = !!(yargs.argv['production']);


function clean(cb) {
  return del(['dist', 'templates/mails'], cb);
}


function pages() {
  return gulp.src('src/mails/*.html')
    .pipe(inky())
    .pipe(gulp.dest('templates/mails'))
}


function sass() {
  return gulp.src('src/assets/scss/app.scss')
    .pipe($.if(!PRODUCTION, $.sourcemaps.init()))
    .pipe($.sass({
      includePaths: ['node_modules/foundation-emails/scss']
    })).on('error', $.sass.logError)
    .pipe($.if(PRODUCTION, $.uncss(
      {
        html: ['templates/mails/*.html']
      }
    )))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest('dist/css'));
}


function watch() {
  gulp.watch('src/mails/*.html').on('all', gulp.series(pages));
  gulp.watch('src/assets/scss/**/*.scss').on('all', gulp.series(sass, pages));
}

function images() {
  return gulp.src('src/assets/img/**/*')
    .pipe($.imagemin())
    .pipe(gulp.dest('./dist/assets/img'));
}

function inline() {
  return gulp.src('templates/mails/*.html')
    .pipe($.if(PRODUCTION, inliner('dist/css/app.css')))
    .pipe(gulp.dest('templates/mails'));
}

function inliner(cssPath) {
  let absoluteCssPath = path.join(__dirname, cssPath);

  let css = fs.readFileSync(absoluteCssPath).toString();
  let mqCss = parse(css);

  return lazypipe()
    .pipe($.inlineCss, {
      extraCss: css,
      applyLinkTags: false,
      applyStyleTags: false,
      removeStyleTags: true,
      preserveMediaQueries: true,
      removeLinkTags: false
    })
    .pipe($.replace, "<!-- media inline placeholder (DON'T DELETE ME) -->", `<style>${mqCss}</style>`)
    .pipe($.replace, '<link rel="stylesheet" type="text/css" href="{% static \'css/app.css\' %}">', '')
    .pipe($.htmlmin, {
      collapseWhitespace: true,
      minifyCSS: true
    })();
}

gulp.task('build', gulp.series(clean, pages, sass, images, inline));
gulp.task('default', gulp.series('build', watch));
