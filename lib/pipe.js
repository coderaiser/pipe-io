(function () {
    'use strict';
    
    var fs          = require('fs'),
        zlib        = require('zlib'),
        assert      = require('assert');
    
    module.exports          = all;
    module.exports.getBody  = getBody;
    
    function all(streams, options, callback) {
        if (!callback) {
            callback    = options;
            
            options     = {
                end: true
            };
        } else if (typeof options.end === 'undefined')
            options.end = true;
        
        assert(streams, 'streams could not be empty!');
        assert(callback, 'callback could not be empty!');
        
        pipe(streams, options, callback);
    }
    
    function pipe(allStreams, options, callback) {
        var error, finish, end, open,
            readError, writeError,
            
            streams         = allStreams.slice(),
            read            = streams.shift(),
            write           = streams.pop(),
            
            isFsRead        = read instanceof fs.ReadStream,
            isFsWrite       = write instanceof fs.WriteStream,
            isGunzip        = write instanceof zlib.Gunzip,
            
            rm              = function(event, stream, fn) {
                stream.removeListener(event, fn);
            },
            
            rmAll           = function() {
                rm('error', write, onWriteError);
                rm('error', read, onReadError);
                rm('end', read, onReadEnd);
                rm('finish', write, onWriteFinish);
            };
        
        read.on('end', onReadEnd);
        read.on('error', onReadError);
        
        if (options.end)
            write.on('finish', onWriteFinish);
        
        callWhenOpen(write, function(e) {
            if (e)
                onWriteError(e);
            
            if (end && readError) {
                onEnd();
            } else {
                open = true;
                write.on('error', onWriteError);
                
                setListeners(streams, onError);
                fullPipe(allStreams, options);
            }
        });
        
        function onWriteError(error) {
            writeError  = true;
            finish      = true;
            onError(error);
            onResult();
        }
            
        function onReadError(error) {
            readError   = true;
            end         = true;
            onError(error);
            onResult();
        }
            
        function onReadEnd() {
            end = true;
            onResult();
        }
            
        function onWriteFinish() {
            finish = true;
            onResult();
        }
        
        function onError(e) {
            error = e;
        }
        
        function onResult() {
            var justEnd     = end && !isFsWrite,
                justFinish  = write && !isFsRead,
                bothFinish  = end && finish;
            
            if (readError && finish) {
                onEnd();
            }else if (writeError && end) {
                onEnd();
            } else if (writeError && isGunzip) {
                onEnd(); 
            } else if (open && readError) {
                onEnd();
            } else if (bothFinish || justEnd || justFinish) {
                onEnd();
            }
        }
        
        function onEnd() {
            rmAll();
            unsetListeners(streams, onError);
            
            callback(error);
        }
    }
    
    /*
     * when stream is fs.WriteStream
     * finish event could be emitted before
     * open and then everything crash
     */
    function callWhenOpen(stream, fn) {
        var isFsWrite   = stream instanceof fs.WriteStream,
            on = function(error) {
                var isError = error instanceof Error;
                
                stream.removeListener('open', on);
                stream.removeListener('error', on);
                
                if (isError)
                    fn(error);
                else
                    fn();
            };
        
        if (!isFsWrite) {
            fn();
        } else {
            stream.on('open', on);
            stream.on('error', on);
        }
    }
    
    function fullPipe(streams, options) {
        var main;
        
        streams.forEach(function(stream) {
            if (!main)
                main = stream;
            else
                main = main.pipe(stream, {
                    end: options.end
                });
        });
    }
    
    function setListeners(streams, fn) {
        streams.forEach(function(stream) {
            stream.on('error', fn);
        });
    }
    
    function unsetListeners(streams, fn) {
        streams.forEach(function(stream) {
            stream.removeListener('error', fn);
        });
    }
    
    /**
     * get body of readStream
     *
     * @param readStream
     * @param callback
     */
    function getBody(readStream, callback) {
        var error,
            body    = '';
        
        assert(readStream, 'could not be empty!');
        assert(callback, 'could not be empty!');
         
        readStream.on('data', onData);
        readStream.on('error', onEnd);
        readStream.on('end', onEnd);
        
        function onData(chunk) {
            body += chunk;
        }
        
        function onEnd(error) {
            readStream.removeListener('data', onData);
            readStream.removeListener('error', onEnd);
            readStream.removeListener('end', onEnd);
            
            callback(error, body);
        }
    }
})();
