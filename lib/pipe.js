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
                unsetListeners(streams, fn);
            };
        
        read.pause();
        
        setListeners(streams, options, fn);
        
        read.resume();
    }
    
    function setListeners(streams, options, fn) {
        var main,
            read    = streams[0];
        
        streams.forEach(function(stream) {
            stream.on('error', fn);
            
            if (!main)
                main = stream;
            else
                main = main.pipe(stream, {
                    end: options.end
                });
        });
        
        read.on('end', fn);
    }
    
    function unsetListeners(streams, fn) {
        var read    = streams[0];
        
        streams.forEach(function(stream) {
            stream.removeListener('error', fn);
        });
        
        read.removeListener('end', fn);
    }
    
    function once(callback) {
        var called,
            fn  = function() {
                if (!called) {
                    callback.apply(null, arguments);
                }
            };
        
        return fn;
    }
    
    /**
     * get body of readStream
     *
     * @param readStream
     * @param callback
     */
    function getBody(readStream, callback) {
        var body = '',
            fn  = once(callback);
        
        assert(readStream, 'could not be empty!');
        assert(callback, 'could not be empty!');
         
        readStream.on('data', function(chunk) {
            body += chunk;
        });
        
        readStream.once('error', function(error) {
            fn(error);
        });
        
        readStream.once('end', function() {
            fn(null, body);
        });
    }
})();
