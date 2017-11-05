'use strict';

var fs = require('fs');
var Writable = require('stream').Transform;
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

Interpreter.prototype._transform = function(result, encoding, callback) {
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
    }.bind(this));
    return;
  }

  this.interpret(result);
  callback(null);
};

Interpreter.prototype._flush = function(done) {
  var summary = this._summary;

  if (!this._whitelist) {
    done();
    return;
  }

  summary.unrecognized.push.apply(summary.unrecognized, Object.keys(this._whitelist));
  if (summary.unrecognized.length > 0) {
    summary.passed = false;
  }

  if (!this._outputFile) {
    this.push(summary);
    done(null);
    return;
  }

  var output = whitelist.update(this._whitelistText, summary);
  fs.writeFile(this._outputFile, output, 'utf-8', function(error) {
    if (error) {
      done(error);
      return;
    }
    this.push(summary);
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
