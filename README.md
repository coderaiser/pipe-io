Pipe-io
=========
Pipe streams and handle events.

## Install

```
npm i pipe-io --save
```

## API

### pipe
Create pipe between streams and adds callback wich would 
be called once whenever everything is done, or error occures.

```js
var pipe        = require('pipe-io'),
    fs          = require('fs'),
    NAME        = 'README.md',
    NAME2       = 'README2.md',
    readStream  = fs.createReadStream(NAME),
    writeStream = fs.createWritesStream(NAME2);

pipe([readStream, writeStream], function(error) {
    console.log(error || 'done');
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
