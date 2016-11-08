'use strict';

var fs = require('fs');
var zlib = require('zlib');
var assert = require('assert');
var pullout = require('pullout/legacy');

module.exports          = all;

module.exports.getBody  = function getBody(readStream, callback) {
    return pullout(readStream, 'string', callback);
}

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
        isGunzip        = allStreams.some(function(write) {
            return write instanceof zlib.Gunzip
        }),
        
        isGzip        = allStreams.some(function(write) {
            return write instanceof zlib.Gzip
        }),
        
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
        if (e) {
            onWriteError(e);
            read.on('readable', function() {
                read.resume();
            });
        }
         
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
        
        if (!end && !finish)
            onResult();
    }
    
    function onResult() {
        var justEnd = end && !options.end;
        var bothFinish = end && finish;
        
        if (readError && finish) {
            onEnd();
        }else if (writeError && end) {
            onEnd();
        } else if (open && readError) {
            onEnd();
        } else if (bothFinish || justEnd) {
            onEnd();
        } else if (error && (isGzip || isGunzip)) {
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
