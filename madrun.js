'use strict';

const {run} = require('madrun');

module.exports = {
    'test': () => 'tape test/*.js',
    'fix:lint': () => run('lint', '--fix'),
    'lint': () => 'putout lib test madrun.js',
    'lint:test': () => 'putout -c .putoutrc.test test',
    'watch:test': () => run('watcher', '"npm test"'),
    'watcher': () => 'nodemon -w lib -w test -x',
    'coverage': () => 'nyc npm test',
    'report': () => 'nyc report --reporter=text-lcov | coveralls',
};

