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
const plumber = require('gulp-plumber');
const mergeStream = require('merge-stream');
const replace = require('gulp-replace');

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
      fontAwesomeCss: 'node_modules/font-awesome/css/font-awesome.min.css',
    distAssets: 'dist/assets'
};

// 定义 fonts 任务
function fonts() {
    return gulp.src([
        'node_modules/font-awesome/fonts/fontawesome-webfont.*'])
      .pipe(gulp.dest('dist/fonts/'))
      .pipe($.size());
}

// 定义 scripts 任务
function scripts() {
    return gulp.src([
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/velocity-animate/velocity.js',
        paths.scripts
    ])
      .pipe($.uglify())
      .pipe($.concat({ path: 'scripts.js', stat: { mode: 0666 } }))
      .pipe(gulp.dest('dist/assets/'))
      .pipe($.size());
}

// 定义 styles 任务
function styles() {
    return gulp.src([
        'node_modules/font-awesome/css/font-awesome.min.css',
        paths.styles
    ])
      .pipe($.stylus({ use: nib(), compress: true, import: ['nib'] }))
      .pipe($.autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
      .pipe($.concat({ path: 'styles.css', stat: { mode: 0666 } }))
      .pipe(gulp.dest('dist/assets/'))
      .pipe($.size());
}
// 错误处理函数
// const handleError = (err) => {
//   console.error(`Error: ${err.message}`);
//   this.emit('end');
// };

// function styles() {
//   // 处理 CSS 文件
//   const cssStream = gulp.src(paths.fontAwesomeCss)
//     .pipe($.plumber({ errorHandler: handleError }))
//     .pipe(replace(/url\(['"]?\.\.\/fonts\/(fontawesome-webfont\.[a-z0-9]+)['"]?\)/g, 'url(../fonts/$1)'))
//     .pipe($.autoprefixer({
//           browsers: ['last 2 versions'],
//           cascade: false
//       }));

//   // 处理 Stylus 文件
//   const stylusStream = gulp.src(paths.styles)
//     .pipe($.plumber({ errorHandler: handleError }))
//     .pipe($.stylus({ use: nib(), compress: true, import: ['nib'] }))
//     .pipe($.autoprefixer({
//           browsers: ['last 2 versions'],
//           cascade: false
//       }));

//   // 合并两个流
//   return mergeStream(cssStream, stylusStream)
//     .pipe($.concat({ path: 'styles.css', stat: { mode: 0666 } }))
//     .pipe(gulp.dest(paths.distAssets))
//     .pipe($.size({ title: 'styles' }))
//     .pipe(browserSync.stream()); // 通知浏览器重新加载样式
// }

// 定义 html 任务
function html() {
    const MarkdownType = new yaml.Type('tag:yaml.org,2002:md', {
        kind: 'scalar',
        construct: function (text) {
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
}

// 定义默认任务
function defaultTask() {
    if (isProd) return;
    browserSync.init({
        server: "./dist"
    });
    gulp.watch(paths.scripts, gulp.series(scripts)).on('change', browserSync.reload);
    gulp.watch(paths.styles, gulp.series(styles)).on('change', browserSync.reload);
    gulp.watch(['template/*.html', 'data.yaml'], gulp.series(html)).on('change', browserSync.reload);
    gulp.watch(["dist/*.html", "dist/assets/*.*"]).on('change', browserSync.reload);
}

// 导出任务
exports.fonts = fonts;
exports.scripts = scripts;
exports.styles = styles;
exports.html = html;
exports.default = gulp.series(gulp.parallel(scripts, styles, fonts, html), defaultTask);