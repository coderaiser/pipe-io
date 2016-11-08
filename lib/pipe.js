'use strict';

const fs = require('fs');
const zlib = require('zlib');
const assert = require('assert');

module.exports = (streams, options, callback) => {
    if (!callback) {
        callback    = options;
        
        options     = {
            end: true
        };
    } else if (typeof options.end === 'undefined') {
        options.end = true;
    }
    
    assert(streams, 'streams could not be empty!');
    assert(callback, 'callback could not be empty!');
    
    pipe(streams, options, callback);
}

function pipe(allStreams, options, callback) {
    let error, finish, end, open,
        readError, writeError,
        
        streams         = allStreams.slice(),
        read            = streams.shift(),
        write           = streams.pop(),
        
        isFsRead        = read instanceof fs.ReadStream,
        isFsWrite       = write instanceof fs.WriteStream,
        isGunzip        = allStreams.some((write) => {
            return write instanceof zlib.Gunzip
        }),
        
        isGzip        = allStreams.some((write) => {
            return write instanceof zlib.Gzip
        }),
        
        rm = (event, stream, fn) => {
            stream.removeListener(event, fn);
        },
        
        rmAll = () => {
            rm('error', write, onWriteError);
            rm('error', read, onReadError);
            rm('end', read, onReadEnd);
            rm('finish', write, onWriteFinish);
        };
    
    read.on('end', onReadEnd);
    read.on('error', onReadError);
    
    if (options.end)
        write.on('finish', onWriteFinish);
    
    callWhenOpen(write, (e) => {
        if (e) {
            onWriteError(e);
            read.on('readable', () => {
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
        const justEnd = end && !options.end;
        const bothFinish = end && finish;
        
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
    const isFsWrite = stream instanceof fs.WriteStream;
    const on = (error) => {
        const isError = error instanceof Error;
        
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
    let main;
    
    streams.forEach((stream) => {
        if (!main)
            main = stream;
        else
            main = main.pipe(stream, {
                end: options.end
            });
    });
}

function setListeners(streams, fn) {
    streams.forEach((stream) => {
        stream.on('error', fn);
    });
}

function unsetListeners(streams, fn) {
    streams.forEach((stream) => {
        stream.removeListener('error', fn);
    });
}
