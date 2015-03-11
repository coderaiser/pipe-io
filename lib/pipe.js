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
        }
        
        if (typeof options.end === 'undefined')
            options.end = true;
        
        assert(streams, 'streams could not be empty!');
        assert(options, 'callback could not be empty!');
        
        pipe(streams, options, callback);
    }
    
    function pipe(streams, options, callback) {
        var error,
            isEnd   = typeof options.end === 'undefined',
            
            last    = streams.length - 1,
            read    = streams[0],
            write   = streams[last];
        
        read.pause();
        
        callWhenOpen(write, function() {
            setListeners(streams, options, onError);
        });
        
        read.on('error', onResultError);
        write.on('error', onResultError);
        
        if (options.end || isEnd)
            write.on('finish', onEnd);
        else
            read.on('end', onEnd);
            
        read.resume();
        
        function onError(e) {
            error = e;
        }
        
        function onResultError(e) {
            error = e;
            onEnd();
        }
        
        function onEnd() {
            unsetListeners(streams, onError);
            
            read.removeListener('error', onResultError);
            read.removeListener('end', onEnd);
            
            write.removeListener('error', onResultError);
            write.removeListener('finish', onEnd);
            
            callback(error);
        }
    }
    /*
     * when stream is fs.WriteStream
     * finish event could be emitted before
     * open and then everything crash
     */
    function callWhenOpen(stream, fn) {
        var isFsWrite = stream instanceof fs.WriteStream;
        
         if (!isFsWrite)
            fn();
        else
            stream.on('open', function() {
                fn();
            });
    }
    
    function setListeners(streams, options, fn) {
        var main;
        
        streams.forEach(function(stream) {
            stream.on('error', fn);
            
            if (!main)
                main = stream;
            else
                main = main.pipe(stream, {
                    end: options.end
                });
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
