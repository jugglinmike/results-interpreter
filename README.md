# results-interpreter

A [Node.js writeable
stream](https://nodejs.org/dist/latest-v8.x/docs/api/stream.html) for
interpreting streaming test results in accordance with a whitelist file.

## Installation

    npm install --save-dev results-interpreter

## Usage

```js
var TestInterpreter = require('results-interpreter');

// See the following section, "Input: results stream"
var testResultStream = runMyTests();
// See the following section, "Input: whitelist file"
var interpreter = new TestInterpreter('path/to/a-whitelist-file.txt');

testResultStream.pipe(interpreter)
  .on('error', function(error) {
    console.error(error);
    process.exitCode = 1;
  })
  .on('finish', function() {
    // See the following section: "Output: `summary` object"
    console.log(JSON.stringify(this.summary));
    process.exitCode = this.summary.passed ? 0 : 1;
  });
```

### Input: test results stream

Users of this library should provide [a Readable object
stream](https://nodejs.org/dist/latest-v8.x/docs/api/stream.html) which emits
data describing test results. Each object must define the following properties:

- `id`  - type: string; unique identifier describing the test; must be stable
  across test executions
- `expected` - type: string; the outcome that was expected; either "pass" or
  "fail"
- `actual` - type: string; the outcome that was observed; either "pass" or
  "fail"

### Input: whitelist file

The whitelist file is read as a UTF-8-formatted text file. Test IDs must be
separated by a newline character. Any text following the "number sign"
character (`#`) will be interpreted as a comment and ignored.

### Output: `summary` object

The `summary` property of the stream contains information about the test
results.

- The following properties contain arrays of testIDs which satisfy
  expectations:
  - the `actual` and `expected` values match, and there is no corresponding
    entry in the whitelist file
    - `summary.allowed.success`
    - `summary.allowed.failure`
  - the `actual` and `expected` values do not match, but there is a
    corresponding entry in the whitelist file
    - `summary.allowed.falsePositive`
    - `summary.allowed.falseNegative`
- The following properties contain arrays of test IDs which violate
  expectations. If any of these arrays are non-empty, the results are
  considered "failing", and the `summary.passed` attribute referenced below
  will be `false`
  - the `actual` and `expected` values match, but there is a corresponding
    entry in the whitelist file
    - `summary.disallowed.success
    - `summary.disallowed.failure
  - the `actual` and `expected` values do not match, and there is no
    corresponding entry in the whitelist file
    - `summary.disallowed.falsePositive`
    - `summary.disallowed.falseNegative`
  - the test ID was included in the whitelist file, but the provided stream did
    not emit an object describing a corresponding result
    - `summary.unrecognized`
- `summary.passed` - a boolean attribute describing whether the results
  completely meet expectations

## License

Copyright 2017 Mike Pennisi under [the GNU General Public License
v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
