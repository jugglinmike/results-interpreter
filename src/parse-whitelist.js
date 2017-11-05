'use strict';

var commentPattern = /#.*$/;

module.exports = function parseWhitelist(contents) {
  return contents.split('\n')
    .map(function(line) {
      return line.replace(commentPattern, '').trim();
    })
    .filter(function(line) {
      return line.length > 0;
    })
    .reduce(function(table, filename) {
      table[filename] = true;
      return table;
    }, Object.create(null));
};
