# Pipe-io [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

Pipe [streams](https://github.com/substack/stream-handbook) and handle events.

## Install

```
npm i pipe-io
```

## `pipe`

Create pipe between streams and adds callback wich would 
be called once whenever everything is done, or error occures.

```js
const fs = require('fs');

const pipe = require('pipe-io');
const tryToCatch = require('try-to-catch');

const NAME = 'README.md';
const NAME2 = 'README2.md';
const readStream = fs.createReadStream(NAME);
const writeStream = fs.createWriteStream(NAME2);

const [e] = await tryToCatch(pipe, [readStream, writeStream]);
```

## Related

- [Pullout](https://github.com/coderaiser/pullout "Pullout") - pull out data from stream

## License
MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/pipe-io.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/pipe-io/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/david/coderaiser/pipe-io.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[CoverageIMGURL]:           https://coveralls.io/repos/coderaiser/pipe-io/badge.svg?branch=master&service=github
[NPMURL]:                   https://npmjs.org/package/pipe-io "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/pipe-io  "Build Status"
[DependencyStatusURL]:      https://david-dm.org/coderaiser/pipe-io "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]:              https://coveralls.io/github/coderaiser/pipe-io?branch=master

