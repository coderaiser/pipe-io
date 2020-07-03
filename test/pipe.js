'use strict';

const {once} = require('events');

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const zlib = require('zlib');
const {Readable} = require('stream');

const tar = require('tar-fs');
const gunzip = require('gunzip-maybe');
const pullout = require('pullout');
const tryToCatch = require('try-to-catch');
const tarStream = require('tar-stream');
const through2 = require('through2');
const serveOnce = require('serve-once');

const pipe = require('..');
const test = require('supertape');

const random = Math.random();

test('empty buffer | write file: error directory', async (t) => {
    const inStream = new Readable({
        read() {},
    });
    
    inStream.push(null);
    
    const [e] = await tryToCatch(pipe, [inStream, fs.createWriteStream('/')]);
    
    t.equal(e.code, 'EISDIR', 'should equal');
    t.end();
});

test('file1 | gunzip maybe: error', async (t) => {
    const file = fs.createReadStream('/hello');
    
    const [e] = await tryToCatch(pipe, [file, gunzip()]);
    
    t.equal(e.code, 'ENOENT', 'should return error');
    t.end();
});

test('file1 | gunzip maybe: error', async (t) => {
    const file = fs.createReadStream('/hello');
    
    const [e] = await tryToCatch(pipe, [file, gunzip()]);
    
    t.equal(e.code, 'ENOENT', 'should return error');
    t.end();
});

test('file | unzip | untar', async (t) => {
    const name = __dirname + '/fixture/broken.tar.gz';
    const streamFile = fs.createReadStream(name);
    const streamUnzip = gunzip();
    const streamParse = tarStream.extract();
    
    const [e] = await tryToCatch(pipe, [
        streamFile,
        streamUnzip,
        streamParse,
    ]);
    
    t.equal(e.code, 'Z_DATA_ERROR');
    t.end();
});

test('file1 | file2: no error', async (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    
    await tryPipe(__filename, nameTmp);
    
    const file1 = fs.readFileSync(__filename, 'utf8');
    const file2 = fs.readFileSync(nameTmp, 'utf8');
    
    fs.unlinkSync(nameTmp);
    
    t.equal(file1, file2, 'files equal');
    t.end();
});

test('file1 | file2: no open event', async (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    const from = fs.createReadStream(__filename);
    const to = fs.createWriteStream(nameTmp);
    
    await once(to, 'open');
    await pipe([from, to]);
    
    const file1 = fs.readFileSync(__filename, 'utf8');
    const file2 = fs.readFileSync(nameTmp, 'utf8');
    
    fs.unlinkSync(nameTmp);
    
    t.equal(file1, file2, 'files equal');
    t.end();
});

test('file1 | file2: write open EACESS', async (t) => {
    const name = path.basename(__filename);
    const nameTmp = '/' + name + random;
    
    const [error] = await tryPipe(__filename, nameTmp);
    
    t.ok(error, error && error.message);
    t.end();
});

test('file1 | file2: write open EACESS: big file', async (t) => {
    const name = path.basename(__filename);
    const nameTmp = '/' + name + random;
    
    const [error] = await tryPipe('/bin/bash', nameTmp);
    
    t.ok(error, error && error.message);
    t.end();
});

test('file1 | file2: read open ENOENT', async (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    
    const read = fs.createReadStream(__filename + random);
    const write = fs.createWriteStream(nameTmp);
    
    const [error] = await tryToCatch(pipe, [read, write]);
    t.ok(error, error && error.message);
    
    t.end();
});

test('file1 | file2: error read EISDIR', async (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    
    const [error] = await tryPipe('/', nameTmp);
    fs.unlinkSync(nameTmp);
    
    t.equal(error.code, 'EISDIR', 'EISDIR: read error');
    t.end();
});

test('file | dir: error write EISDIR', async (t) => {
    const [error] = await tryPipe(__filename, '/');
    
    t.equal(error.code, 'EISDIR', 'EISDIR: write error');
    t.end();
});

test('dir1 | dir2: error read/write EISDIR', async (t) => {
    const [error] = await tryPipe(__dirname, '/');
    
    t.equal(error.code, 'EISDIR', 'read/write EISDIR');
    t.end();
});

test('file1 | gzip | file2: no errors', async (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    
    const read = fs.createReadStream(__filename);
    const write = fs.createWriteStream(nameTmp);
    const zipStream = zlib.createGzip();
    
    await pipe([read, zipStream, write]);
    
    const file1 = fs.readFileSync(__filename, 'utf8');
    const file2 = fs.readFileSync(nameTmp);
    const zip = zlib.gzipSync(file1);
    
    fs.unlinkSync(nameTmp);
    
    t.deepEqual(zip, file2, 'file gziped');
    t.end();
});

test('file1 | gzip', async (t) => {
    const read = fs.createReadStream(__filename);
    const zip = zlib.createGzip();
    
    const [error] = await tryToCatch(pipe, [read, zip]);
    
    t.notOk(error, 'no errors');
    t.end();
});

test('file1 | gzip: error ENOENT', async (t) => {
    const read = fs.createReadStream(__filename + random);
    const zip = zlib.createGzip();
    
    const [error] = await tryToCatch(pipe, [read, zip]);
    
    t.ok(error, error.message);
    t.end();
});

test('file1 | gzip: error EISDIR', async (t) => {
    const read = fs.createReadStream('/');
    const zip = zlib.createGzip();
    
    const [error] = await tryToCatch(pipe, [read, zip]);
    
    t.ok(error, error.message);
    t.end();
});

test('file1 | gunzip: error header check', async (t) => {
    const read = fs.createReadStream(__filename);
    const gunzip = zlib.createGunzip();
    
    const [error] = await tryToCatch(pipe, [read, gunzip]);
    
    t.ok(error, error.message);
    t.end();
});

test('file1 | gunzip | untar: error header check', async (t) => {
    const read = fs.createReadStream(__filename);
    const gunzip = zlib.createGunzip();
    const tarStream = tar.extract(__dirname);
    
    const [error] = await tryToCatch(pipe, [read, gunzip, tarStream]);
    
    t.ok(error, error.message);
    t.end();
});

test('file1 | gunzip | untar: error header check: gz', async (t) => {
    const read = fs.createReadStream(__dirname + '/fixture/awk.1.gz');
    const gunzip = zlib.createGunzip();
    const tarStream = tar.extract(__dirname);
    
    const [error] = await tryToCatch(pipe, [read, gunzip, tarStream]);
    
    t.ok(error, error.message);
    t.end();
});

test('tar | gzip | file', async (t) => {
    const fixture = path.join(__dirname, 'fixture');
    const to = path.join(os.tmpdir(), `${Math.random()}.tar.gz`);
    const tarStream = tar.pack(fixture, {
        entries: [
            'pipe.txt',
        ],
    });
    
    const gzip = zlib.createGzip();
    const write = fs.createWriteStream(to);
    
    await pipe([tarStream, gzip, write]);
    const toFile = fs.readFileSync(to);
    
    fs.unlinkSync(to);
    
    t.ok(toFile.length, 'should pack file');
    t.end();
});

test('tar | gzip | file: error: EACESS', async (t) => {
    const fixture = path.join(__dirname, 'fixture');
    const to = path.join(`/${Math.random()}.tar.gz`);
    const tarStream = tar.pack(fixture, {
        entries: [
            'pipe.txt',
        ],
    });
    
    const gzip = zlib.createGzip();
    const write = fs.createWriteStream(to);
    
    const [error] = await tryToCatch(pipe, [tarStream, gzip, write]);
    
    t.ok(error);
    t.end();
});

test('put file', async (t) => {
    const middleware = () => async (req, res) => {
        const write = fs.createWriteStream('/xxxxxxx');
        await pipe([req, write]);
        
        res.end();
    };
    
    const {request} = serveOnce(middleware);
    
    await request.put('/');
    
    t.pass('should not crash');
    t.end();
});

test('read file| through| write directory: error', async (t) => {
    const transform = through2((chunk, enc, cb) => cb(null, chunk));
    const [e] = await tryToCatch(pipe, [fs.createReadStream('/sdlfj'), transform, fs.createWriteStream('/dsfsdf')]);
    
    t.equal(e.code, 'EACCES', 'should equal');
    t.end();
});

test('put file | unzip', async (t) => {
    const middleware = () => async (req, res) => {
        const gunzip = zlib.createGunzip();
        const transform = through2((chunk, enc, cb) => cb(null, chunk));
        
        await pipe([req, gunzip, transform]);
        
        res.end();
    };
    
    const {request} = serveOnce(middleware);
    
    await request.put('/');
    
    t.pass('should not crash');
    t.end();
});

test('file1, file2 | response: end false', async (t) => {
    const server = http.createServer((req, res) => {
        const read1 = fs.createReadStream(__filename);
        const read2 = fs.createReadStream(__filename);
        
        pipe([read1, res], {
            end: false,
        }, () => {
            pipe([read2, res], (error) => {
                t.notOk(error, 'file1, file2 -> response');
            });
        });
    });
    
    server.listen(() => {
        const {port} = server.address();
        
        const url = `http://127.0.0.1:${port}`;
        
        http.get(url, (res) => {
            pullout(res).then((data) => {
                const file = fs.readFileSync(__filename, 'utf8');
                server.close();
                t.equal(data.length, file.length * 2, 'reponse == file1 + file2');
                t.end();
            });
        }).on('error', (error) => {
            t.ok(error, error.message);
            t.end();
        });
    });
    
    const [error] = await once(server, 'error');
    t.ok(error, error.message);
    t.end();
});

test('file1, file2 | options: empty object', async (t) => {
    const server = http.createServer((req, res) => {
        const read1 = fs.createReadStream(__filename);
        const read2 = fs.createReadStream(__filename);
        
        pipe([read1, res], {}, () => {
            pipe([read2, res], () => {});
        });
    });
    
    server.listen(7331, '127.0.0.1', () => {
        http.get('http://127.0.0.1:7331', (res) => {
            pullout(res).then((data) => {
                const file = fs.readFileSync(__filename, 'utf8');
                server.close();
                t.equal(data.length, file.length, 'reponse == file');
                t.end();
            });
        }).on('error', (error) => {
            t.ok(error, error.message);
            t.end();
        });
    });
    
    const [error] = await once(server, 'error');
    t.ok(error, error.message);
    t.end();
});

async function tryPipe(from, to) {
    const read = fs.createReadStream(from);
    const write = fs.createWriteStream(to);
    
    return await tryToCatch(pipe, [read, write]);
}

