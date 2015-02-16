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
        var read    = streams[0],
            fn      = function() {
                callback.apply(null, arguments);
            };
        
        read.pause();
        
        setListeners(streams, options, fn);
        
        read.on('end', function onEnd() {
            unsetListeners(streams, fn);
            read.removeListener('end', onEnd);
            fn();
        });
        
        read.resume();
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
        var body    = '',
            
            onData  = function(chunk) {
                body += chunk;
            },
            
            onError = function(error) {
                callback(error);
                rmListeners();
            },
            
            onEnd   = function() {
                callback(null, body);
                rmListeners();
            },
            
            rmListeners = function() {
                readStream.removeListener('data', onData);
                readStream.removeListener('error', onError);
                readStream.removeListener('end', onEnd);
            };
        
        assert(readStream, 'could not be empty!');
        assert(callback, 'could not be empty!');
         
        readStream.on('data', onData);
        readStream.on('error', onError);
        readStream.on('end', onEnd);
    }
})();
