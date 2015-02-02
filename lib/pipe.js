(function () {
    'use strict';
    
    var fs          = require('fs'),
        exec        = require('execon'),
        assert      = require('assert');
    
    module.exports  = all;
    module.exports.getBody  = getBody;
    
    function on(event, emitter, callback) {
        var isSet,
            listeners   = emitter.listeners(event),
            callbackStr = '' + callback;
        
        isSet   = listeners.some(function(func) {
            return '' + func === callbackStr;
        });
        
        if (!isSet)
            emitter.on(event, callback);
    }
    
    function all(streams, options, callback) {
        var n, write, isFSWrite;
            
        assert(streams, 'could not be empty!');
        assert(options, 'could not be empty!');
        
        if (!callback) {
            callback    = options;
            
            options     = {
                end: true
            };
        }
        
        n           = streams.length - 1;
        write       = streams[n];
        isFSWrite   = write instanceof fs.WriteStream;
        
        exec.if(!isFSWrite, function() {
            pipe(streams, options, callback);
        }, function(fn) {
            write.once('open', fn);
            on('error', write, callback);
        });
    }
    
    function pipe(streams, options, callback) {
        var main,
            read    = streams[0];
        
        streams.forEach(function(stream) {
            on('error', stream, callback);
            
            if (!main)
                main = stream;
            else
                main = main.pipe(stream, {
                    end: options.end
                });
        });
        
        on('end', read, callback);
    }
    
    /**
     * get body of readStream
     *
     * @param readStream
     * @param callback
     */
    function getBody(readStream, callback) {
        var sended, body = '';
        
        assert(readStram, 'could not be empty!');
        assert(callback, 'could not be empty!');
         
        readStream.on('data', function(chunk) {
            body += chunk;
        });
        
        readStream.once('error', function(error) {
            sended = true;
            callback(error);
        });
        
        readStream.once('end', function() {
            if (!sended)
                callback(null, body);
        });
    }
})();
