import {run} from 'madrun';

export default {
    'test': () => 'tape test/*.js',
    'fix:lint': () => run('lint', '--fix'),
    'lint': () => 'putout .',
    'fresh:lint': () => run('lint', '--fresh'),
    'lint:fresh': () => run('lint', '--fresh'),
    'lint:test': () => 'putout -c .putoutrc.test test',
    'watch:test': async () => await run('watcher', await run('test')),
    'watcher': () => 'nodemon -w lib -w test -x',
    'coverage': () => 'nyc npm test',
    'report': () => 'nyc report --reporter=text-lcov | coveralls',
};

