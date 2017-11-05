'use strict';

var Readable = require('stream').Readable;
var util = require('util');

function MockStream(objects) {
  Readable.call(this, { objectMode: true });

  this._objects = objects;
}

util.inherits(MockStream, Readable);

MockStream.prototype._read = function() {
  if (this._objects.length === 0) {
    this.push(null);
    return;
  }

  this.push(this._objects.shift());
};

module.exports = MockStream;
