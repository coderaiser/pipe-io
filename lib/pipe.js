(function () {
    'use strict';
    
    var assert      = require('assert');
    
    module.exports          = all;
    module.exports.getBody  = getBody;
    
    function all(streams, options, callback) {
        if (!callback) {
            callback    = options;
            
            options     = {
                end: true
            };
        }
        
        assert(streams, 'streams could not be empty!');
        assert(options, 'callback could not be empty!');
        
        pipe(streams, options, callback);
    }
    
    function pipe(streams, options, callback) {
        var error,
            read    = streams[0];
        
        read.pause();
        
        setListeners(streams, options, onError);
        
        read.on('end', onEnd);
        read.on('error', onReadError);
        
        read.resume();
        
        function onError(e) {
            error = e;
        }
        
        function onReadError(e) {
            error = e;
            onEnd();
        }
        
        function onEnd() {
            unsetListeners(streams, onError);
            read.removeListener('end', onEnd);
            read.removeListener('error', onReadError);
            
            callback(error);
        }
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
