'use strict';

var commentPattern = /#.*$/;

function readLine(line) {
  return line.replace(commentPattern, '').trim();
}

exports.parse = function parseWhitelist(contents) {
  return contents.split('\n')
    .map(readLine)
    .filter(function(line) {
      return line.length > 0;
    })
    .reduce(function(table, filename) {
      table[filename] = true;
      return table;
    }, Object.create(null));
};

exports.update = function updateWhitelist(contents, summary) {
  var toRemove = summary.disallowed.success
    .concat(summary.disallowed.failure)
    .concat(summary.unrecognized);
  var toAdd = summary.disallowed.falsePositive
    .concat(summary.disallowed.falseNegative);

  return contents.split('\n')
    .map(function(line) {
      var testID = readLine(line);

      if (toRemove.indexOf(testID) > -1) {
        return null;
      }

      return line;
    })
    .filter(function(line) {
      return line !== null;
    })
    .concat(toAdd)
    .join('\n');
};
