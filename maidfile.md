## dev

Develop mode use browser-sync

```js
const url = require('url');
const path = require('path');
const bs = require('browser-sync').create();
const sass = require('node-sass');
const pug = require('pug');
const fs = require('fs');

bs.init({
    server: {
        baseDir: 'src',
        index: 'index.html'
    },
    middleware: [pugHandler, sassHandler],
    ghostMode: false,
    files: [{
        match: 'src/scss/**/*.scss',
        fn: function (event, file) {
            bs.reload('*.css');
        }
    }, {
        match: ['src/pages/**/*.pug', 'src/layout/**/*.pug'],
        fn: function (event, file) {
            bs.reload('*.html');
        }
    }]
});

function pugHandler (req, res, next) {
    let parsedUrl = url.parse(req.url);
    let pugPath = '';
    if (parsedUrl.pathname.match(/\.html$/)) {
        pugPath = path.join('src/pages/', parsedUrl.pathname).replace(/\.html$/, '.pug');
    } else {
        pugPath = path.join('src/pages/', parsedUrl.pathname, '/index.pug');
    }
    if (!fs.existsSync(pugPath)) {
        next();
        return;
    }

    let html = pug.renderFile(pugPath);

    res.setHeader('Content-type', 'text/html');
    res.end(html);
}

function sassHandler (req, res, next) {
    let parsedUrl = url.parse(req.url);
    if (parsedUrl.pathname.match(/css\/.*?\.css$/)) {
        let scssPath = path.relative('/css/', parsedUrl.pathname).replace(/\.css$/, '.scss');
        let css = sass.renderSync({
            file: 'src/scss/'+scssPath,
            outputStyle: 'expanded',
            sourceMap: true,
            sourceMapContents: true,
            sourceMapEmbed: true
        }).css.toString('utf-8');

        res.setHeader('Content-type', 'text/css');
        res.end(css);
    }
    next();
}
```

## build