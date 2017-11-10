'use strict';

var fs = require('fs');
var test = require('tape');
var MockStream = require('./mock-stream');
var Interpreter = require('..');

test('empty whitelist (passing)', function(t) {
  var results = new MockStream([
    { id: 'a', expected: 'fail', actual: 'fail' },
    { id: 'b', expected: 'pass', actual: 'pass' },
    { id: 'c', expected: 'pass', actual: 'pass' },
    { id: 'd', expected: 'fail', actual: 'fail' }
  ]);

  results.pipe(new Interpreter(__dirname + '/whitelists/empty.txt'))
    .on('finish', function() {
      t.deepEqual(this.summary, {
        passed: true,
        allowed: {
          success: ['b', 'c'],
          failure: ['a', 'd'],
          falsePositive: [],
          falseNegative: []
        },
        disallowed: {
          success: [],
          failure: [],
          falsePositive: [],
          falseNegative: []
        },
        unrecognized: []
      });

      t.end();
    });
});

test('empty whitelist (failing)', function(t) {
  var results = new MockStream([
    { id: 'a', expected: 'pass', actual: 'pass' },
    { id: 'b', expected: 'pass', actual: 'fail' },
    { id: 'c', expected: 'fail', actual: 'pass' },
    { id: 'd', expected: 'fail', actual: 'fail' }
  ]);

  results.pipe(new Interpreter(__dirname + '/whitelists/empty.txt'))
    .on('finish', function() {
      t.deepEqual(this.summary, {
        passed: false,
        allowed: {
          success: ['a'],
          failure: ['d'],
          falsePositive: [],
          falseNegative: []
        },
        disallowed: {
          success: [],
          failure: [],
          falsePositive: ['c'],
          falseNegative: ['b']
        },
        unrecognized: []
      });

      t.end();
    });
});

test('non-empty whitelist (passing)', function(t) {
  var results = new MockStream([
    { id: 'a', expected: 'fail', actual: 'pass' },
    { id: 'e', expected: 'pass', actual: 'fail' },
    { id: 'i', expected: 'pass', actual: 'fail' },
    { id: 'o', expected: 'fail', actual: 'pass' },
    { id: 'u', expected: 'fail', actual: 'pass' },
    { id: 'y', expected: 'fail', actual: 'fail' },
    { id: 'z', expected: 'pass', actual: 'pass' }
  ]);

  results.pipe(new Interpreter(__dirname + '/whitelists/vowels.txt'))
    .on('finish', function() {
      t.deepEqual(this.summary, {
        passed: true,
        allowed: {
          success: ['z'],
          failure: ['y'],
          falsePositive: ['a', 'o', 'u'],
          falseNegative: ['e', 'i']
        },
        disallowed: {
          success: [],
          failure: [],
          falsePositive: [],
          falseNegative: []
        },
        unrecognized: []
      });

      t.end();
    });
});

test('non-empty whitelist (failing)', function(t) {
  var results = new MockStream([
    { id: 'a', expected: 'fail', actual: 'fail' },
    { id: 'e', expected: 'pass', actual: 'pass' },
    { id: 'i', expected: 'pass', actual: 'pass' },
    { id: 'o', expected: 'fail', actual: 'fail' },
    { id: 'u', expected: 'fail', actual: 'fail' },
    { id: 'y', expected: 'fail', actual: 'fail' },
    { id: 'z', expected: 'pass', actual: 'pass' }
  ]);

  results.pipe(new Interpreter(__dirname + '/whitelists/vowels.txt'))
    .on('finish', function() {
      t.deepEqual(this.summary, {
        passed: false,
        allowed: {
          success: ['z'],
          failure: ['y'],
          falsePositive: [],
          falseNegative: []
        },
        disallowed: {
          success: ['e', 'i'],
          failure: ['a', 'o', 'u'],
          falsePositive: [],
          falseNegative: []
        },
        unrecognized: []
      });

      t.end();
    });
});

test('unrecognized whitelist entries', function(t) {
  var results = new MockStream([
    { id: 'a', expected: 'fail', actual: 'pass' },
    { id: 'i', expected: 'pass', actual: 'fail' },
    { id: 'u', expected: 'fail', actual: 'pass' },
    { id: 'y', expected: 'fail', actual: 'fail' },
    { id: 'z', expected: 'pass', actual: 'pass' }
  ]);

  results.pipe(new Interpreter(__dirname + '/whitelists/vowels.txt'))
    .on('finish', function() {
      t.deepEqual(this.summary, {
        passed: false,
        allowed: {
          success: ['z'],
          failure: ['y'],
          falsePositive: ['a', 'u'],
          falseNegative: ['i']
        },
        disallowed: {
          success: [],
          failure: [],
          falsePositive: [],
          falseNegative: []
        },
        unrecognized: ['e', 'o']
      });

      t.end();
    });
});

test('non-existent whitelist', function(t) {
  var results = new MockStream([
    { id: 'a', expected: 'pass', actual: 'pass' }
  ]);

  results.pipe(new Interpreter(__dirname + '/whitelists/non-existent-file.txt'))
    .on('error', function(err) {
      t.equal(this.summary, null);
      t.ok(err);
      t.end();
    })
    .on('finish', function() {
      t.error(new Error('Unexpected "data" event.'));
      t.end();
    });
});

test('update whitelist', function(t) {
  var src = __dirname + '/whitelists/vowels.txt';
  var dest = __dirname + '/whitelists/vowels-copy.txt';
  function end() {
    fs.unlink(dest, function(error) {
      if (error) {
        t.error(error);
      }
      t.end();
    });
  }
  var expectedWhitelist = [
    '# This is a comment',
    'a # this comment follows a test ID',
    '',
    '# empty lines should be tolerated, too',
    '        # along with lots of trailing whitespace    ',
    'e       # even on lines containing test IDs         ',
    '',
    '',
    'x',
    'w'
  ];
  var results = new MockStream([
    { id: 'a', expected: 'fail', actual: 'pass' },
    { id: 'e', expected: 'pass', actual: 'fail' },
    { id: 'i', expected: 'pass', actual: 'pass' },
    { id: 'o', expected: 'fail', actual: 'fail' },
    { id: 'w', expected: 'pass', actual: 'fail' },
    { id: 'x', expected: 'fail', actual: 'pass' },
    { id: 'y', expected: 'fail', actual: 'fail' },
    { id: 'z', expected: 'pass', actual: 'pass' }
  ]);

  results.pipe(new Interpreter(src, { outputFile: dest }))
    .on('error', function(error) {
      t.error(error);
      end();
    })
    .on('finish', function() {
      t.deepEqual(this.summary, {
        passed: false,
        allowed: {
          success: ['z'],
          failure: ['y'],
          falsePositive: ['a'],
          falseNegative: ['e']
        },
        disallowed: {
          success: ['i'],
          failure: ['o'],
          falsePositive: ['x'],
          falseNegative: ['w']
        },
        unrecognized: ['u']
      });

      fs.readFile(dest, 'utf-8', function(error, contents) {
        if (error) {
          t.error(error);
          end();
          return;
        }

        t.deepEqual(contents.split('\n'), expectedWhitelist);
        end();
      });
    });
});
