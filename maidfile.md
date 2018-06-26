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
Run task `copy`, `pug:build`, `sass:build` after this

```js
const del = require('del');

module.exports = async () => {
    await del('build/**/*');
}
```

## copy
copy asset, script files

```js
const fs = require('fs-extra');
const path = require('path');
const sass = require('node-sass');

module.exports = async () => {
    await fs.copy('src/CNAME', 'build/CNAME');
    var copys = ['src/assets/', 'src/scripts/'].map((val) => {
        return fs.copy(val, path.join('build/', path.relative('src', val)));
    });
    await Promise.all(copys);
}
```

## pug:build
build pug

```js
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const pug = require('pug');

module.exports = async () => {
    var pugList = await new Promise((resolve, reject) => {
        glob('src/pages/**/*.pug', (err, arr) => {
            if (err) {
                reject(err);
                throw err;
            }
            resolve(arr);
        });
    });

    var pugPromiseList = pugList.map((val) => {
        var html = pug.renderFile(val);
        var filePath = path.join('build', path.relative('src/pages/', val).replace(/\.pug$/, '.html'));

        return fs.outputFile(filePath, html);
    });
    await Promise.all(pugPromiseList);
}
```

## sass:build
build sass

```js
const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const sass = require('node-sass');

module.exports = async () => {
    var sassList = await new Promise((resolve, reject) => {
        glob('src/scss/**/*.scss', (err, arr) => {
            if (err) {
                reject(err);
                throw err;
            }
            resolve(arr);
        });
    });

    var sassPromiseList = sassList.map((val) => {
        return new Promise((resolve, reject) => {
            sass.render({
                file: val,
                outputStyle: 'compressed'
            }, (err, result) => {
                if (err) {
                    reject(err);
                    throw err;
                }
                resolve({data: result.css, path: val});
            });
        }).then((data) => {
            var filePath = path.join('build/css', path.relative('src/scss/', data.path).replace(/\.scss$/, '.css'));
            return fs.outputFile(filePath, data.data);
        });
    });

    await Promise.all(sassPromiseList);
}
```

## deploy
Run task `build` before this

```js
const fs = require('fs-extra');
const git = require('isomorphic-git');
const del = require('del');
const cpx = require('cpx');
const glob = require('glob');
const process = require('process');
const shell = require('shelljs');

module.exports = async () => {
    var originURL = await git.config({
        fs: fs,
        dir: '.',
        path: 'remote.origin.url'
    });

    await del('gh-pages-branch/');
    shell.exec(`git clone --depth 1 --single-branch -b gh-pages ${originURL} gh-pages-branch `);
    // await git.clone({
    //     fs: fs,
    //     dir: './gh-pages-branch',
    //     url: originURL,
    //     ref: 'gh-pages',
    //     singleBranch: true,
    //     depth: 1
    // });

    await del('gh-pages-branch/**/*');

    var removeFiles = await git.listFiles({
        fs: fs,
        dir: './gh-pages-branch'
    });
    removeFiles = removeFiles.map((val) => {
        return git.remove({
            fs: fs,
            dir: './gh-pages-branch',
            filepath: val
        });
    });

    await Promise.all(removeFiles);

    await new Promise((resolve, reject) => {
        cpx.copy('build/**/*', 'gh-pages-branch/', (err, result) => {
            if (err) {
                reject(err);
                throw err;
            }
            resolve();
        });
    });
    var files = await new Promise((resolve, reject) => {
        glob('**/*', {nodir: true, cwd: './gh-pages-branch'}, (err, arr) => {
            if (err) {
                reject(err);
                throw err;
            }
            resolve(arr);
        });
    });

    files = files.map((val) => {
        return git.add({
            fs: fs,
            dir: './gh-pages-branch',
            filepath: val
        });
    });

    await Promise.all(files);

    await git.commit({
        fs: fs,
        dir: './gh-pages-branch',
        author: {
            name: process.env.GIT_NAME,
            email: process.env.GIT_EMAIL
        },
        message: 'deploy gh-pages'
    });

    // await git.push({
    //     fs: fs,
    //     dir: './gh-pages-branch',
    //     remote: 'origin',
    //     ref: 'gh-pages'
    // });
    shell.cd('gh-pages-branch');
    shell.exec('git push origin gh-pages');
}
```