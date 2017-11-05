'use strict';

var fs = require('fs');
var Writable = require('stream').Transform;
var util= require('util');

var parseWhitelist = require('./parse-whitelist');

var Interpreter = module.exports = function Interpreter(whitelist, options) {
  options = options || {};
  options.objectMode = true;
  Writable.call(this, options);

  this._whitelistName = whitelist;
  this._whitelist = null;
  this.summary = {
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
    this._readWhitelist(function(err) {
      if (err) {
        this.emit('error', err);
        return;
      }

      callback(this.interpret(result));
    }.bind(this));
    return;
  }

  callback(this.interpret(result));
};

Interpreter.prototype._readWhitelist = function(done) {
  fs.readFile(this._whitelistName, 'utf-8', function(err, contents) {
    if (!err) {
      this._whitelist = parseWhitelist(contents);
    }

    done(err);
  }.bind(this));
};

Interpreter.prototype._flush = function(done) {
  this.summary.unrecognized.push.apply(this.summary.unrecognized, Object.keys(this._whitelist));
  if (this.summary.unrecognized.length > 0) {
    this.summary.passed = false;
  }
  done();
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

  this.summary.passed = this.summary.passed && isAllowed;
  this.summary[isAllowed ? 'allowed' : 'disallowed'][classification]
    .push(result.id);
};
