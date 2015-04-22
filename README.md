Pipe-io [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]
=========
Pipe [streams](https://github.com/substack/stream-handbook) and handle events.

## Install

```
npm i pipe-io --save
```

## API

### pipe
Create pipe between streams and adds callback wich would 
be called once whenever everything is done, or error occures.

```js
var pipe        = require('pipe-io'),
    fs          = require('fs'),
    NAME        = 'README.md',
    NAME2       = 'README2.md',
    readStream  = fs.createReadStream(NAME),
    writeStream = fs.createWritesStream(NAME2);

pipe([readStream, writeStream], function(error) {
    console.log(error || 'done');
});
```

### getBody
Get body of readStream

```js
var pipe        = require('pipe-io'),
    fs          = require('fs'),
    NAME        = 'README.md',
    readStream  = fs.createReadStream(NAME);

pipe.getBody(readStream, function(error, data) {
    console.log(error || data);
});
```

## License
MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/pipe-io.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/pipe-io/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/pipe-io.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/pipe-io "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/rendy  "Build Status"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/rendy "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

