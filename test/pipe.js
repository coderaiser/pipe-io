(function() {
    'use strict';
    
    var fs      = require('fs'),
        path    = require('path'),
        os      = require('os'),
        
        pipe    = require('..'),
        test    = require('tape');
    
    test('file1 | file2: no error', function(t) {
        var tmp     = os.tmpdir(),
            name    = path.basename(__filename),
            nameTmp = path.join(tmp, name + Math.random());
         
         tryPipe(__filename, nameTmp, function() {
            var file1 = fs.readFileSync(__filename, 'utf8'),
                file2 = fs.readFileSync(nameTmp, 'utf8');
                
            fs.unlinkSync(nameTmp);
            
            t.equal(file1, file2, 'files equal');
            t.end();
         });
    });
    
    test('file1 | file2: write open EACESS', function(t) {
        var name    = path.basename(__filename),
            nameTmp = '/' + name + Math.random();
        
        tryPipe(__filename, nameTmp, function(error) {
            t.ok(error, error && error.message);
            
            t.end();
        });
    });
    
    test('file1 | file2: read open ENOENT', function(t) {
        var tmp     = os.tmpdir(),
            random  = Math.random(),
            name    = path.basename(__filename),
            nameTmp = path.join(tmp, name + random);
        
        tryPipe(__filename + random, nameTmp, function(error) {
            t.ok(error, error && error.message);
            
            t.end();
        });
    });
    
    function tryPipe(from, to, fn) {
        var read    = fs.createReadStream(from),
            write   = fs.createWriteStream(to);
        
        pipe([read, write], function(error) {
            fn(error);
        });
    }
    
})();
