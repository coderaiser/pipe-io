Util Pipe
=========
### create
Easy way to create pipe which would handle all error events and redirect tham to callback.

```js
    var pipe        = require('util-pipe'),
        NameFrom    = 'README.md',
        NameTo      = 'README_COPY.gz';
    
    pipe.create({
        from        : NameFrom,
        to          : NameTo,
        gzip        : true,
        callback    : function(error) {
            var msg = 'done';
            
            console.log(error || msg);
        }
    });
```

### getBody
Get body of readStream

```js
    var pipe        = require('util-pipe'),
        fs          = require('fs'),
        NAME        = 'README.md',
        readStream  = fs.createReadStream(NAME);
    
    pipe.getBody(readStream, function(error, data) {
        console.log(error || data);
    });
```
