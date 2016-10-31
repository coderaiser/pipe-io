'use strict';

const fs      = require('fs');
const path    = require('path');
const http    = require('http');
const os      = require('os');
const zlib    = require('zlib');

const tar = require('tar-fs');

const pipe    = require('..');
const test    = require('tape');

const random  = Math.random();

test('check parameters', function(t) {
    t.throws(pipe, /streams could not be empty!/, 'check streams');
    t.throws(pipe.bind(null, []), /callback could not be empty!/, 'check callback');
    t.end();
});

test('getBody', function(t) {
    const read = fs.createReadStream(__filename);
    
    pipe.getBody(read, function(error, data) {
        const file = fs.readFileSync(__filename, 'utf8');
        
        t.equal(data, file, 'getbody <-> readFile');
        
        t.end();
    });
});

test('getBody: error', function(t) {
    const read = fs.createReadStream(String(Math.random()));
    
    pipe.getBody(read, function(error) {
        t.ok(error, 'read error: ' + error.message); 
        t.end();
    });
});

test('file1 | file2: no error', function(t) {
    const tmp     = os.tmpdir(),
        name    = path.basename(__filename),
        nameTmp = path.join(tmp, name + random);
     
    tryPipe(__filename, nameTmp, function() {
        const file1 = fs.readFileSync(__filename, 'utf8'),
            file2 = fs.readFileSync(nameTmp, 'utf8');
            
        fs.unlinkSync(nameTmp);
        
        t.equal(file1, file2, 'files equal');
        t.end();
    });
});

test('file1 | file2: write open EACESS', function(t) {
    const name    = path.basename(__filename),
        nameTmp = '/' + name + random;
    
    tryPipe(__filename, nameTmp, function(error) {
        t.ok(error, error && error.message);
        
        t.end();
    });
});

test('file1 | file2: read open ENOENT', function(t) {
    const tmp     = os.tmpdir(),
        name    = path.basename(__filename),
        nameTmp = path.join(tmp, name + random);
    
    tryPipe(__filename + random, nameTmp, function(error) {
        t.ok(error, error && error.message);
        
        t.end();
    });
});

test('file1 | file2: error read EISDIR', function(t) {
    const tmp         = os.tmpdir(),
        name        = path.basename(__filename),
        nameTmp     = path.join(tmp, name + random);
    
    tryPipe('/', nameTmp, function(error) {
        fs.unlinkSync(nameTmp);
        t.equal(error.code, 'EISDIR', 'EISDIR: read error');
        t.end();
    });
});

test('file1 | file2: error write EISDIR', function(t) {
    tryPipe(__filename, '/', function(error) {
        t.equal(error.code, 'EISDIR', 'EISDIR: write error');
        t.end();
    });
});

test('file1 | file2: error read/write EISDIR', function(t) {
    tryPipe(__dirname, '/', function(error) {
        t.equal(error.code, 'EISDIR', 'read/write EISDIR');
        t.end();
    });
});

test('file1 | gzip | file2: no errors', function(t) {
    const tmp         = os.tmpdir(),
        name        = path.basename(__filename),
        nameTmp     = path.join(tmp, name + random),
        
        read        = fs.createReadStream(__filename),
        write       = fs.createWriteStream(nameTmp),
        zip         = zlib.createGzip();
    
    pipe([read, zip, write], function(error) {
        const file1   = fs.readFileSync(__filename, 'utf8'),
            file2   = fs.readFileSync(nameTmp),
            zip     = zlib.gzipSync(file1);
        
        fs.unlinkSync(nameTmp);
        
        t.notOk(error, 'no errors');
        t.deepEqual(zip, file2, 'file gziped');
        t.end();
    });
});

test('file1 | gzip', function(t) {
    const read        = fs.createReadStream(__filename),
        zip         = zlib.createGzip();
    
    pipe([read, zip], function(error) {
        t.notOk(error, 'no errors');
        t.end();
    });
});

test('file1 | gzip: error ENOENT', function(t) {
    const read        = fs.createReadStream(__filename + random),
        zip         = zlib.createGzip();
    
    pipe([read, zip], function(error) {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1 | gzip: error EISDIR', function(t) {
    const read        = fs.createReadStream('/'),
        zip         = zlib.createGzip();
    
    pipe([read, zip], function(error) {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1 | gunzip: error header check', function(t) {
    const read    = fs.createReadStream(__filename),
        gunzip  = zlib.createGunzip();
    
    pipe([read, gunzip], function(error) {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1 | gunzip | untar: error header check', function(t) {
    const read = fs.createReadStream(__filename);
    const gunzip = zlib.createGunzip();
    const tarStream = tar.extract(__dirname);
    
    pipe([read, gunzip, tarStream], function(error) {
        t.ok(error, error.message);
        t.end();
    });
});

test('tar | gzip | file', (t) => {
    const fixture = path.join(__dirname, 'fixture');
    const from = path.join(fixture, 'pipe.txt');
    const to = path.join(os.tmpdir(), `${Math.random()}.tar.gz`);
    const tarStream = tar.pack(fixture, {
        entries: [
            'pipe.txt'
        ]
    });
    
    const gzip = zlib.createGzip();
    const write = fs.createWriteStream(to);
    
    pipe([tarStream, gzip, write], (error) => {
        const toFile = fs.readFileSync(to);
        
        fs.unlinkSync(to);
        t.ok(toFile.length, 'should pack file');
        t.end();
    });
});

test('file1, file2 | response: end false', function(t) {
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
        
        console.log(`server: 127.0.0.1:${port}`);
        
        http.get(url, (res) => {
            console.log(`request: ${url}`);
            
            pipe.getBody(res, (error, data) => {
                const file = fs.readFileSync(__filename, 'utf8');
                t.equal(data, file + file, 'reponse == file1 + file2');
                t.end();
                server.close();
            });
        }).on('error', function(error) {
            t.ok(error, error.message);
            t.end();
        });
    });
    
    server.on('error', function(error) {
        t.ok(error, error.message);
        t.end();
    });
});

test('file1, file2 | options: empty object', function(t) {
    const server = http.createServer(function (req, res) {
        const read1 = fs.createReadStream(__filename),
            read2 = fs.createReadStream(__filename);
        
        pipe([read1, res], {}, function() {
            pipe([read2, res], function() {
            });
        });
    });
    
    server.listen(7331, '127.0.0.1', function() {
        console.log('server: 127.0.0.1:7331');
        
        http.get('http://127.0.0.1:7331', function(res) {
            console.log('request: http://127.0.0.1:7331');
            
            pipe.getBody(res, function(error, data) {
                const file = fs.readFileSync(__filename, 'utf8');
                t.equal(data, file, 'reponse == file1 + file2');
                t.end();
                server.close();
            });
        }).on('error', function(error) {
            t.ok(error, error.message);
            t.end();
        });
    });
    
    server.on('error', function(error) {
        t.ok(error, error.message);
        t.end();
    });
});

function tryPipe(from, to, fn) {
    const read = fs.createReadStream(from);
    const write = fs.createWriteStream(to);
    
    pipe([read, write], (error) => {
        const name = checkListenersLeak([read, write]);
        
        if (name)
            console.error('possible memory leak: ', name);
        
        fn(error);
    });
}

function checkListenersLeak(streams) {
    let name;
    const events  = ['open', 'error', 'end', 'finish'];
    const regExp  = /^function (onError|onReadError|onWriteError|onReadEnd|onWriteFinish)/;
    
    streams.some(function(stream) {
        events.some(function(event) {
            stream.listeners(event).some(function(fn) {
                const is = (fn + '').match(regExp);
                
                if (is)
                    name = is[1];
                
                return name;
            });
            
            return name;
        });
        
        return name;
    });
    
    return name;
}

