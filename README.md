Pipe-io
=========
Pipe streams and handle events

## Install

```
npm i pipe-io
```
## API
### create
Easy way to create pipe which would handle all error events and redirect tham to callback.

```js
    var pipe        = require('pipe-io'),
        NameFrom    = 'README.md',
        NameTo      = 'README_COPY.gz',
        
        options     = {
            gzip: true
        };
    
    pipe.create(NameFrom, NameTo, options, function(error) {
        var msg = 'done';
        
        console.log(error || msg);
    });
```

### getBody
Get body of readStream

```js
    var pipe        = require('pipe-io'),
        fs          = require('fs'),
        NAME        = 'README.md',
        readStream  = fs.createReadStream(NAME);
    
    pipe.getBody(readStream, function(error, data) {
        console.log(error || data);
    });
```

## License
MIT
