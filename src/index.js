'use strict';

var fs = require('fs');
var Writable = require('stream').Writable;
var util= require('util');

var whitelist = require('./whitelist');

var Interpreter = module.exports = function Interpreter(whitelist, options) {
  options = options || {};
  options.objectMode = true;
  Writable.call(this, options);

  this._whitelistName = whitelist;
  this._whitelistText = null;
  this._whitelist = null;
  this._outputFile = options.outputFile;
  // This property will store a bound version of the `_cleanup` method in the
  // event that the stream is closed before the whitelist file has been read.
  this._deferredCleanup = null;
  this.summary = null;
  this._summary = {
    passed: true,
    allowed: {
      success: [],
      failure: [],
      falsePositive: [],
      falseNegative: [],
    },
    disallowed: {
      success: [],
      failure: [],
      falsePositive: [],
      falseNegative: [],
    },
    unrecognized: []
  };
};

util.inherits(Interpreter, Writable);

Interpreter.prototype._write = function(result, encoding, callback) {
  if (this._whitelist === null) {
    fs.readFile(this._whitelistName, 'utf-8', function(err, contents) {
      if (err) {
        callback(err);
        return;
      }

      this._whitelistText = contents;
      this._whitelist = whitelist.parse(contents);

      this.interpret(result);
      callback(null);

      if (this._deferredCleanup) {
        this._deferredCleanup();
        this._deferredCleanup = null;
      }
    }.bind(this));
    return;
  }

  this.interpret(result);
  callback(null);
};

/**
 * If the stream has been configured to write a new whitelist file to disk, the
 * `finish` event should be delayed until after the write operation has
 * completed successfully.
 *
 * Override `Writable.prototype.end` in order to achieve this.
 */
Interpreter.prototype.end = function(chunk, encoding, callback) {
  var end = Writable.prototype.end.bind(this, null, null, callback);

  if (chunk) {
    this.write(chunk, encoding, function(err) {
      if (err) {
        return;
      }

      this._cleanup(end);
    }.bind(this));
    return;
  }
  this._cleanup(end);
};

Interpreter.prototype._cleanup = function(done) {
  var summary = this._summary;

  if (!this._whitelist) {
    this._deferredCleanup = this._cleanup.bind(this, done);
    return;
  }

  summary.unrecognized.push.apply(summary.unrecognized, Object.keys(this._whitelist));
  if (summary.unrecognized.length > 0) {
    summary.passed = false;
  }

  if (!this._outputFile) {
    this.summary = summary;
    done(null);
    return;
  }

  var output = whitelist.update(this._whitelistText, summary);
  fs.writeFile(this._outputFile, output, 'utf-8', function(error) {
    if (error) {
      done(error);
      return;
    }
    this.summary = summary;
    done(null);
  }.bind(this));
};

Interpreter.prototype.interpret = function(result) {
  var inWhitelist = result.id in this._whitelist;
  var classification, isAllowed;

  delete this._whitelist[result.id];

  if (result.expected === 'pass') {
    if (result.actual === 'pass') {
      classification = 'success';
      isAllowed = !inWhitelist;
    } else {
      classification = 'falseNegative';
      isAllowed = inWhitelist;
    }
  } else {
    if (result.actual === 'pass') {
      classification = 'falsePositive';
      isAllowed = inWhitelist;
    } else {
      classification = 'failure';
      isAllowed = !inWhitelist;
    }
  }

  this._summary.passed = this._summary.passed && isAllowed;
  this._summary[isAllowed ? 'allowed' : 'disallowed'][classification]
    .push(result.id);
};
