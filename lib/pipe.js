'use strict';

const fs = require('fs');
const zlib = require('zlib');
const assert = require('assert');

module.exports = (streams, options, callback) => {
    if (!callback) {
        callback = options;
        
        options = {
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
    let error, finish, end;
    let readError, writeError;
    let writeOpened = false;
    
    const streams = allStreams.slice();
    const read = streams.shift();
    const write = streams.pop();

    const isGunzip = allStreams.some((write) => write instanceof zlib.Gunzip);
    const isGzip = allStreams.some((write) => write instanceof zlib.Gzip);
    const isFsWriteStream = allStreams.some((write) => write instanceof fs.WriteStream);
    
    const rm = (event, stream, fn) => {
        stream.removeListener(event, fn);
    };
    
    const rmAll = () => {
        rm('error', write, onWriteError);
        rm('error', read, onReadError);
        rm('end', read, onReadEnd);
        rm('finish', write, onWriteFinish);
    };
    
    read.on('end', onReadEnd);
    read.on('error', onReadError);
    
    if (options.end)
        write.on('finish', onWriteFinish);
    
    write.on('error', onWriteError);
    write.on('open', onWriteOpen);
    
    setListeners(streams, onError);
    fullPipe(allStreams, options);
    
    function onWriteOpen() {
        writeOpened = true;
        onResult();
    }
    
    function onWriteError(error) {
        writeError  = true;
        finish      = true;
        
        read.on('readable',function() {
            this.read()
        });
        
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
        
        destroy(finish, write);
        
        if (!end && !finish)
            onResult();
    }
    
    function onResult() {
        const justEnd = end && !options.end;
        const bothFinish = end && finish;
        
        if (writeError && end)
            return onEnd();
        
        if (readError && writeOpened)
            return onEnd();
        
        if (readError && !isFsWriteStream)
            return onEnd();
        
        if (bothFinish || justEnd)
            return onEnd();
        
        if (error && (isGzip || isGunzip))
            return onEnd();
    }
    
    function onEnd() {
        rmAll();
        unsetListeners(streams, onError);
        
        callback(error);
    }
}

function fullPipe(streams, options) {
    let main;
    
    streams.forEach((stream) => {
        if (!main)
            return main = stream;
        
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

function destroy(finish, stream) {
    if (!finish || !stream.destroy)
        return;
    
    stream.destroy();
}

function unsetListeners(streams, fn) {
    streams.forEach((stream) => {
        stream.removeListener('error', fn);
    });
}

