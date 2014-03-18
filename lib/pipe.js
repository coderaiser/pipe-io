(function () {
    'use strict';
    
    var fs          = require('fs'),
        zlib        = require('zlib'),
        Util        = require('util.io');
    
    exports.getBody = getBody;
    exports.create  = create;
    
     /**
     * create pipe
     * params: {callback, read or from, write or to, gzip}
     * read     - readable stream
     * write    - writable stream
     * to       - name of file to write
     * from     - name of file to read
     * gzip     - should gzip to be used
     * callback - function(error) {}
     *
     * @param params
     * @param callback
     */
    function create(params) {
        var gzip, onError, read, write, isFsWrite,
            p               = params;
        
        if (p) {
            read           = p.read    || fs.createReadStream(p.from, {
                bufferSize: 4 * 1024
            });
            
            if (p.write)
                write      = p.write;
            else {
                write      = fs.createWriteStream(p.to);
                isFsWrite  = true;
            }
            
            onError  = function(error) {
                Util.exec(p.callback, error);
            };
            
            if (p.gzip) {
                gzip       = zlib.createGzip();
                read.on('error', onError);
                read       = read.pipe(gzip);
            }
            
            write.on('error', onError);
            read.on('error', onError);
            
            Util.ifExec(!isFsWrite, function() {
                read.on('data', function(data) {
                    write.write(data);
                });
                
                read.on('end', function() {
                    if (!p.notEnd)
                        write.end();
                    
                    Util.exec(p.callback);
                });
            }, function(callback) {
                write.on('open', callback);
            });
        }
    }
    
    /**
     * get body of readStream
     *
     * @param readStream
     * @param callback
     */
    function getBody(readStream, callback) {
        var body = '';
        
        readStream.on('data', function(chunk) {
            body += chunk;
        });
        
        readStream.on('error', function(error) {
            Util.retExec(callback, error);
        });
        
        readStream.on('end', function() {
            Util.exec(callback, null, body);
        });
    }
})();
