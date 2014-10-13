var path = require('path');


if (process.argv.indexOf('test/_globals') === -1) {
  return;
}


global.expect = require('expect.js');


// set up test coverage reporting
if (process.argv.indexOf('html-cov') !== -1) {
  var blanket = require('blanket');
  var repo_dirname = path.resolve(__dirname, '..');
  blanket({
    'pattern': new RegExp('^' + path.join(
      repo_dirname,
      'src',
      '(?!' + path.join('test', 'mocks') + ')'
    ))
  });
}


var timeout_queue = [];

global.setTimeout = function (callback, timeout) {
  return timeout_queue.push({
    timeout: timeout,
    callback: callback
  });
};

global.setImmediate = function (callback) {
  return timeout_queue.push({
    timeout: -1,
    callback: callback
  });
};

global.clearTimeout = function (id) {
  if (!id) return;
  timeout_queue[id - 1] = null;
};

global.setTimeout.clearInTest = function () {
  timeout_queue.forEach(function (item, index) {
    timeout_queue[index] = null;
  });
};

global.setTimeout.flushInTest = function (ms) {
  var some = timeout_queue.some(function (item, index) {
    if (!item) {
      return false;
    }
    if (typeof ms !== 'number' || item.timeout <= ms) {
      timeout_queue[index] = null;
      item.callback.call(null);
      return true;
    } else if (typeof ms === 'number') {
      item.timeout -= ms;
      return false;
    }
  });

  if (some) {
    global.setTimeout.flushInTest(ms);
  }
};
