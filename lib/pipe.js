(function () {
    'use strict';
    
    var fs          = require('fs'),
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
        assert(options, 'callback could not be empty!');
        
        pipe(streams, options, callback);
    }
    
    function pipe(allStreams, options, callback) {
        var error, finish, end,
            readError, writeError,
            
            streams         = allStreams.slice(),
            read            = streams.shift(),
            write           = streams.pop(),
            
            isFsRead        = read instanceof fs.ReadStream,
            isFsWrite       = write instanceof fs.WriteStream,
            
            rm              = function(event, stream, fn) {
                stream.removeListener(event, fn);
            },
            
            onWriteError    =  function(error) {
                writeError  = true;
                finish      = true;
                onError(error);
                onResult();
            },
            
            onReadError     = function(error) {
                readError   = true;
                end         = true;
                
                onError(error);
                onResult();
            },
            
            onReadEnd       = function() {
                end = true;
                onResult();
            },
            
            onWriteFinish   = function() {
                finish = true;
                onResult();
            };
        
        callWhenOpen(write, function(error) {
            if (error) {
                callback(error);
            } else {
                if (options.end)
                    write.once('finish', onWriteFinish);
                
                read.once('end', onReadEnd);
                read.once('error', onReadError);
                write.once('error', onWriteError);
                setListeners(streams, onError);
                fullPipe(allStreams, options);
            }
        });
        
        function onError(e) {
            error = e;
        }
        
        function onResult() {
            if (readError && finish) {
                rm('error', write, onWriteError);
                rm('end', read, onReadEnd);
                
                onEnd();
            } else if (writeError && readError) {
                rm('end', read, onReadEnd);
                rm('finish', write, onWriteFinish);
                
                onEnd();
            } else if (writeError && end) {
                rm('finish', write, onWriteFinish);
                rm('error', read, onReadError);
                
                onEnd();
            } else if ((end && !isFsWrite) || (write && !isFsRead) || (write && end)) {
                rm('error', read, onReadError);
                rm('error', write, onWriteError);
                
                onEnd();
            }
        }
        
        function onEnd() {
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
                stream.removeListener('open', on);
                stream.removeListener('error', on);
                fn(error);
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
        readStream.on('error', onError);
        readStream.on('end', onEnd);
        
        function onData(chunk) {
            body += chunk;
        }
        
        function onError(e) {
            error = e ;
        }
        
        function onEnd() {
            readStream.removeListener('data', onData);
            readStream.removeListener('error', onError);
            readStream.removeListener('end', onEnd);
            
            callback(error, body);
        }
    }
})();
