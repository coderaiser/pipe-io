'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const zlib = require('zlib');
const {Readable} = require('stream');

const through2 = require('through2');
const {
    callbackify,
    promisify,
} = require('util');

const tar = require('tar-fs');
const gunzip = require('gunzip-maybe');
const pullout = require('pullout');
const tryToCatch = require('try-to-catch');
const tarStream = require('tar-stream');

const _pipe = require('..');
const pipe = callbackify(_pipe);
const test = require('supertape');

const random = Math.random();

test('empty buffer | write file: error directory', async (t) => {
    const inStream = new Readable({
        read() {},
    });
    
    inStream.push(null);
    
    const [e] = await tryToCatch(_pipe, [inStream, fs.createWriteStream('/')]);
    
    t.equal(e.code, 'EISDIR', 'should equal');
    t.end();
});

test('file1 | gunzip maybe: error', async (t) => {
    const file = fs.createReadStream('/hello');
    
    const [e] = await tryToCatch(_pipe, [file, gunzip()]);
    
    t.equal(e.code, 'ENOENT', 'should return error');
    t.end();
});

test('file1 | gunzip maybe: error', async (t) => {
    const file = fs.createReadStream('/hello');
    
    const [e] = await tryToCatch(_pipe, [file, gunzip()]);
    
    t.equal(e.code, 'ENOENT', 'should return error');
    t.end();
});

test('', async (t) => {
    const name = __dirname + '/fixture/broken.tar.gz';
    const streamFile = fs.createReadStream(name);
    const streamUnzip = gunzip();
    const streamParse = tarStream.extract();
    
    const [e] = await tryToCatch(_pipe, [
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
    const _tryPipe = promisify(tryPipe);
    
    await _tryPipe(__filename, nameTmp);
    
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
    
    to.on('open', async () => {
        await _pipe([from, to]);
        
        const file1 = fs.readFileSync(__filename, 'utf8');
        const file2 = fs.readFileSync(nameTmp, 'utf8');
        
        fs.unlinkSync(nameTmp);
        
        t.equal(file1, file2, 'files equal');
        t.end();
    });
});

test('file1 | file2: write open EACESS', (t) => {
    const name = path.basename(__filename);
    const nameTmp = '/' + name + random;
    
    tryPipe(__filename, nameTmp, (error) => {
        t.ok(error, error && error.message);
        t.end();
    });
});

test('file1 | file2: write open EACESS: big file', (t) => {
    const name = path.basename(__filename);
    const nameTmp = '/' + name + random;
    
    tryPipe('/bin/bash', nameTmp, (error) => {
        t.ok(error, error && error.message);
        t.end();
    });
});

test('file1 | file2: read open ENOENT', async (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    
    const read = fs.createReadStream(__filename + random);
    const write = fs.createWriteStream(nameTmp);
    
    const [error] = await tryToCatch(_pipe, [read, write]);
    t.ok(error, error && error.message);
    
    t.end();
});

test('file1 | file2: error read EISDIR', (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    
    tryPipe('/', nameTmp, (error) => {
        fs.unlinkSync(nameTmp);
        t.equal(error.code, 'EISDIR', 'EISDIR: read error');
        t.end();
    });
});

test('file | dir: error write EISDIR', (t) => {
    tryPipe(__filename, '/', (error) => {
        t.equal(error.code, 'EISDIR', 'EISDIR: write error');
        t.end();
    });
});

test('dir1 | dir2: error read/write EISDIR', (t) => {
    tryPipe(__dirname, '/', (error) => {
        t.equal(error.code, 'EISDIR', 'read/write EISDIR');
        t.end();
    });
});

test('file1 | gzip | file2: no errors', async (t) => {
    const tmp = os.tmpdir();
    const name = path.basename(__filename);
    const nameTmp = path.join(tmp, name + random);
    
    const read = fs.createReadStream(__filename);
    const write = fs.createWriteStream(nameTmp);
    const zipStream = zlib.createGzip();
    
    await _pipe([read, zipStream, write]);
    
    const file1 = fs.readFileSync(__filename, 'utf8');
    const file2 = fs.readFileSync(nameTmp);
    const zip = zlib.gzipSync(file1);
    
    fs.unlinkSync(nameTmp);
    
    t.deepEqual(zip, file2, 'file gziped');
    t.end();
});

test('file1 | gzip', (t) => {
    const read = fs.createReadStream(__filename);
    const zip = zlib.createGzip();
    
    pipe([read, zip], (error) => {
        t.notOk(error, 'no errors');
        t.end();
    });
});

test('file1 | gzip: error ENOENT', (t) => {
    const read = fs.createReadStream(__filename + random);
    const zip = zlib.createGzip();
    
    pipe([read, zip], (error) => {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1 | gzip: error EISDIR', (t) => {
    const read = fs.createReadStream('/');
    const zip = zlib.createGzip();
    
    pipe([read, zip], (error) => {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1 | gunzip: error header check', (t) => {
    const read = fs.createReadStream(__filename);
    const gunzip = zlib.createGunzip();
    
    pipe([read, gunzip], (error) => {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1 | gunzip | untar: error header check', async (t) => {
    const read = fs.createReadStream(__filename);
    const gunzip = zlib.createGunzip();
    const tarStream = tar.extract(__dirname);
    
    const [error] = await tryToCatch(_pipe, [read, gunzip, tarStream]);
    
    t.ok(error, error.message);
    t.end();
});

test('file1 | gunzip | untar: error header check: gz', async (t) => {
    const read = fs.createReadStream(__dirname + '/fixture/awk.1.gz');
    const gunzip = zlib.createGunzip();
    const tarStream = tar.extract(__dirname);
    
    const [error] = await tryToCatch(_pipe, [read, gunzip, tarStream]);
    
    t.ok(error, error.message);
    t.end();
});

test('tar | gzip | file', (t) => {
    const fixture = path.join(__dirname, 'fixture');
    const to = path.join(os.tmpdir(), `${Math.random()}.tar.gz`);
    const tarStream = tar.pack(fixture, {
        entries: [
            'pipe.txt',
        ],
    });
    
    const gzip = zlib.createGzip();
    const write = fs.createWriteStream(to);
    
    pipe([tarStream, gzip, write], () => {
        const toFile = fs.readFileSync(to);
        
        fs.unlinkSync(to);
        t.ok(toFile.length, 'should pack file');
        t.end();
    });
});

test('tar | gzip | file: error: EACESS', (t) => {
    const fixture = path.join(__dirname, 'fixture');
    const to = path.join(`/${Math.random()}.tar.gz`);
    const tarStream = tar.pack(fixture, {
        entries: [
            'pipe.txt',
        ],
    });
    
    const gzip = zlib.createGzip();
    const write = fs.createWriteStream(to);
    
    pipe([tarStream, gzip, write], (error) => {
        t.ok(error);
        t.end();
    });
});

test('put file', (t) => {
    const server = http.createServer((req, res) => {
        const write = fs.createWriteStream('/xxxxxxx');
        
        pipe([req, write], () => {
            server.close();
            
            t.pass('should not crash');
            t.end();
        });
        
        res.end();
    });
    
    server.listen(() => {
        const {port} = server.address();
        
        const options = {
            method: 'PUT',
            hostname: 'localhost',
            port,
            path: '/',
        };
        
        const req = http.request(options, () => {
            server.close();
        });
        
        req.end();
    });
});

test('read file| through| write directory: error', async (t) => {
    const transform = through2((chunk, enc, cb) => cb(null, chunk));
    const [e] = await tryToCatch(_pipe, [fs.createReadStream('/sdlfj'), transform, fs.createWriteStream('/dsfsdf')]);
    //const [e] = await tryToCatch(_pipe, [fs.createReadStream('/sdlfj'), fs.createWriteStream('/dsfsdf')]);
    
    t.equal(e.code, 'EACCES', 'should equal');
    t.end();
});

test('put file | unzip', (t) => {
    const server = http.createServer((req, res) => {
        const gunzip = zlib.createGunzip();
        const transform = through2((chunk, enc, cb) => cb(null, chunk));
        
        pipe([req, gunzip, transform], () => {
            server.close();
            
            t.pass('should not crash');
            t.end();
        });
        
        res.end();
    });
    
    server.listen(() => {
        const {port} = server.address();
        
        const options = {
            method: 'PUT',
            hostname: 'localhost',
            port,
            path: '/',
        };
        
        const req = http.request(options, () => {
            server.close();
        });
        
        req.end();
    });
});

test('file1, file2 | response: end false', (t) => {
    const server = http.createServer((req, res) => {
        const read1 = fs.createReadStream(__filename);
        const read2 = fs.createReadStream(__filename);
        
        pipe([read1, res], {end: false}, () => {
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
    
    server.on('error', (error) => {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1, file2 | options: empty object', (t) => {
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
    
    server.on('error', (error) => {
        t.ok(error, error.message);
        t.end();
    });
});

function tryPipe(from, to, fn) {
    const read = fs.createReadStream(from);
    const write = fs.createWriteStream(to);
    
    pipe([read, write], (error) => {
        fn(error);
    });
}

