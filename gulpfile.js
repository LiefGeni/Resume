const gulp = require('gulp');
const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');
const yaml = require('js-yaml');
const MarkdownIt = require('markdown-it');
const markdownItAttrs = require('markdown-it-attrs');
const nib = require('nib');
const $ = require('gulp-load-plugins')();
const browserSync = require('browser-sync').create();

const isProd = process.env.NODE_ENV === 'production';

const md = new MarkdownIt({
  html: true,
  breaks: true,
  typographer: true
});
md.use(markdownItAttrs);

const paths = {
  root: path.join(__dirname, '../'),
  src: path.join(__dirname, '../src/'),
  scripts: 'src/scripts/*.js',
  styles: 'src/styles/**/*.styl',
  assets: path.join(__dirname, '../src/assets'),
};

gulp.task('fonts', function() {
  return gulp.src(['node_modules/font-awesome/fonts/*.*'])
    .pipe(gulp.dest('dist/assets/fonts/'))
    .pipe(browserSync.stream())
    .pipe($.size());
});

gulp.task('scripts', () => {
  return gulp.src([
      'node_modules/jquery/dist/jquery.min.js',
      'node_modules/velocity-animate/velocity.js',
      paths.scripts
    ])
    .pipe($.uglify())
    .pipe($.concat({ path: 'scripts.js', stat: { mode: 0o666 } }))
    .pipe(gulp.dest('dist/assets/'))
    .pipe($.size());
});

gulp.task('styles', () => {
  // First, copy the font-awesome CSS directly
  gulp.src(['node_modules/font-awesome/css/font-awesome.min.css'])
    .pipe($.replace(/\.\.\/fonts\//g, 'fonts/'))
    .pipe(gulp.dest('dist/assets/'));
    
  // Then process your custom styles
  return gulp.src([paths.styles])
    .pipe($.stylus({ use: nib(), compress: true, import: ['nib'] }))
    .pipe($.autoprefixer({
      overrideBrowserslist: ['last 2 versions'],
      cascade: false
    }))
    .pipe($.concat({ path: 'custom-styles.css', stat: { mode: 0o666 } }))
    .pipe(gulp.dest('dist/assets/'))
    .pipe(browserSync.stream())
    .pipe($.size());
});

gulp.task('html', () => {
  const MarkdownType = new yaml.Type('tag:yaml.org,2002:md', {
    kind: 'scalar',
    construct: function(text) {
      return md.render(text);
    },
  });
  const YAML_SCHEMA = yaml.Schema.create([MarkdownType]);
  const context = matter(fs.readFileSync('data.yaml', 'utf8'), { schema: YAML_SCHEMA }).data;
  return gulp.src(['template/index.html', 'template/print.html'])
    .pipe($.nunjucks.compile(context))
    .pipe($.htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest('dist'))
    .pipe($.size());
});

// 修改默认任务定义
gulp.task('default', gulp.series(gulp.parallel('scripts', 'styles', 'fonts', 'html'), (done) => {
  if (!isProd) {
    browserSync.init({
      server: "./dist"
    });
    gulp.watch(paths.scripts, gulp.series('scripts'));
    gulp.watch(paths.styles, gulp.series('styles'));
    gulp.watch(['template/*.html', 'data.yaml'], gulp.series('html'));
    gulp.watch('node_modules/font-awesome/fonts/*.*', gulp.series('fonts'));
    gulp.watch(["dist/*.html", "dist/assets/*.*"]).on('change', browserSync.reload);
  }
  done();
}));
