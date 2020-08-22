// подключение модулей и определение структуры проекта
const gulp = require('gulp'),
  sass = require('gulp-sass'),
  pug = require('gulp-pug'),
  pugbem = require('gulp-pugbem'),
  rename = require('gulp-rename'),
  fs = require('fs'),
  csso = require('gulp-csso'),
  concat = require('gulp-concat'),
  imgMin = require('gulp-imagemin'),
  prefix = require('gulp-autoprefixer'),
  pngQuant = require('imagemin-pngquant'),
  uglJS = require('gulp-uglify'),
  uglES = require('gulp-uglify-es').default(),
  sync = require('browser-sync'),
  data = require('gulp-data'),
  ttf2woff = require('gulp-ttf2woff'),
  ttf2woff2 = require('gulp-ttf2woff2'),
  root = {
    'dev': './app',
    'libs': './libs',
    'prod': './public',
    'data': './data/data.json'
  },
  libs = {
    'js': root.libs + '/**/*.js',
    'css': root.libs + '/**/*.css',
  },
  dev = {
    'pug': root.dev + '/views/**/*.pug',
    'es': root.dev + '/assets/es/**/*.js',
    'fonts': root.dev + '/assets/fonts/**/*',
    'sass': root.dev + '/assets/sass/styles.sass',
    'img': root.dev + '/assets/img/**/*.{jpg,png,jpeg,gif,svg}',
  },
  prod = {
    'js': root.prod + '/js',
    'css': root.prod + '/css',
    'img': root.prod + '/img',
    'fonts': root.prod + '/fonts',
  };

// функции для тасков
const lib = (name, suffix, ext) => {
    switch (ext) {
      case 'css':
        (suffix)
          ? addTask(name, () => {
            return gulp.src(libs.css)
              .pipe(rename({
                suffix: suffix,
                extname: '.css',
              }))
              .pipe(csso())
              .pipe(gulp.dest(prod.css));
          })
          : addTask(name, () => {
            return gulp.src(libs.css)
              .pipe(rename({
                extname: '.css',
              }))
              .pipe(gulp.dest(prod.css));
          });
        break;
      case 'js':
        (suffix)
          ? addTask(name, () => {
            return gulp.src(libs.js)
              .pipe(uglJS())
              .pipe(rename({
                suffix,
                extname: '.js',
              }))
              .pipe(gulp.dest(prod.js));
          })
          : addTask(name, () => {
            return gulp.src(libs.js)
              .pipe(rename({
                extname: '.js',
              }))
              .pipe(gulp.dest(prod.js));
          });
        break;
    }
  },

  es = (name, minify) => {

    if (minify) {
      return addTask(name, () => {
        return gulp.src(dev.es)
          .pipe(concat('app.min.js'))
          .pipe(uglES)
          .pipe(gulp.dest(prod.js));
      });
    } else {
      return addTask(name, () => {
        return gulp.src(dev.es)
          .pipe(concat('app.js'))
          .pipe(gulp.dest(prod.js));
      });
    }
  },

  styles = (name, minified, suffix) => {
    return addTask(name, () => {
      return gulp.src(dev.sass)
        .pipe(sass({
          outputStyle: minified,
        }).on('error', sass.logError))
        .pipe(prefix([
          '> 1%',
          'ie 8',
          'ie 7',
          'last 15 versions'
        ]))
        .pipe(rename({
          basename: 'styles',
          suffix,
          extname: '.css',
        }))
        .pipe(gulp.dest(prod.css));
    });
  },

  addTask = (name, work) => {
    return gulp.task(name, work);
  };

sass.compiler = require('node-sass');

// создание задач для сборщика проектов
es('es', false); // убрать, если js не нужны

es('es-min', true);

lib('libsJS-min', '.min', 'js');

lib('libsCSS-min', '.min', 'css');

lib('libsJS', '', 'js'); // убрать, если js не нужны

lib('libsCSS', '', 'css'); // убрать, если css не нужны

styles('sass', 'expanded', ''); // убрать, если css не нужны

styles('sass-min', 'compressed', '.min');

addTask('fonts', () => {
  gulp.src(dev.fonts)
    .pipe(ttf2woff())
    .pipe(gulp.dest(prod.fonts));

  return gulp.src(dev.fonts)
    .pipe(ttf2woff2())
    .pipe(gulp.dest(prod.fonts));
});

addTask('img', () => {
  return gulp.src(dev.img)
    .pipe(imgMin({
      interlaced: true,
      progressive: true,
      svgoPlugins: {removeViewBox: false},
      use: pngQuant(),
    }))
    .pipe(gulp.dest(prod.img));
});

addTask('pug', () => {
  return gulp.src(dev.pug)
    .pipe(data(() => JSON.parse(fs.readFileSync(root.data, 'utf-8'))))
    .pipe(pug({
      pretty: true, // поменять, если заказчику нужен html
      locals: root.data,
      plugins: [pugbem],
    }))
    .pipe(gulp.dest(root.prod));
});

addTask('build', gulp.series([
  gulp.parallel([
    'img',
    'fonts'
  ]),
  gulp.parallel([
    'libsJS',
    'libsCSS',
    'libsJS-min',
    'libsCSS-min'
  ]),
  gulp.parallel([
    'es',
    'pug',
    'sass',
    'es-min',
    'sass-min'
  ])
]));

addTask('watch', () => {
  gulp.watch(dev.es, gulp.series(['es-min', 'es']));
  gulp.watch([root.data, root.dev + '/**/*.pug'], gulp.series('pug'));
  gulp.watch(root.dev + '/assets/sass/**/*.sass', gulp.series(['sass-min', 'sass']));
});

addTask('serve', () => {
  sync({
    server: {
      baseDir: root.prod,
    },
    notify: false,
  });

  sync.watch(root.dev);
});

addTask('default', gulp.series([
  gulp.parallel('build'),
  gulp.parallel(['serve', 'watch'])
]));