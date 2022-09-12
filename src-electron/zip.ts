import {createWriteStream} from 'fs';
import {constants} from 'zlib';
const archiver = require('archiver');

export function zipDir(directory: string, destination: string, pattern = '**/*'): Promise<string> {

  return new Promise<string>((resolve, reject) => {
    const output = createWriteStream(destination);
    // const output = new BufferStream();
    const archive = archiver('zip', {
      zlib: { level: constants.Z_BEST_SPEED } // Sets the compression level.
    });
// listen for all archive data to be written
// 'close' event is fired only when a file descriptor is involved
    output.on('close', function() {
      resolve(destination);
    });

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
    output.on('end', function() {
      console.log('Data has been drained');
    });

// good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        // log warning
        console.error(err);
      } else {
        reject(err);
      }
    });

// good practice to catch this error explicitly
    archive.on('error', function(err) {
      reject(err);
    });

// pipe archive data to the file
    archive.pipe(output);

// append a file from stream
    archive.glob(pattern, {cwd: directory, dot: true});

// finalize the archive (ie we are done appending files but streams have to finish yet)
// 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize();
  });
}
