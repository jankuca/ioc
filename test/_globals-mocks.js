var path = require('path');


if (process.argv.indexOf('test/_globals-mocks') === -1) {
  return;
}


global.expect = require('expect.js');


// set up test coverage reporting
var blanket = require('blanket');
var repo_dirname = path.resolve(__dirname, '..');
blanket({
  'pattern': new RegExp('^' + path.join(repo_dirname, 'src', 'test', 'mocks'))
});
