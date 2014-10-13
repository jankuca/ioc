var util = require('util');

var IocContainer = require('../../ioc-container');


/**
 * @constructor
 * @extends {IocContainer}
 */
var MockIocContainer = function (options) {
  IocContainer.call(this, options);

  this.constructor_instances_ = [];
  this.mock_constructors_ = [];
  this.deny_create_ = false;

  this.services = {};
  this.middleware = [];
};

util.inherits(MockIocContainer, IocContainer);


MockIocContainer.prototype.mockConstructorInTest = function (Original, Mock) {
  this.mock_constructors_.push({
    Original: Original,
    Mock: Mock
  });
};


MockIocContainer.prototype.mockConstructorsInTest = function (pairs) {
  pairs.forEach(function (pair) {
    this.mockConstructorInTest(pair[0], pair[1]);
  }, this);
};


MockIocContainer.prototype.getConstructorInstanceInTest = function (
    Constructor) {
  var instances = this.constructor_instances_;
  for (var i = 0, ii = instances.length; i < ii; ++i) {
    if (instances[i].Constructor === Constructor) {
      return instances[i].instance;
    }
  }

  return null;
};


MockIocContainer.prototype.denyConstructorInstantiationInTest = function () {
  this.deny_create_ = true;
};


MockIocContainer.prototype.addFactoryMiddleware = function (middleware) {
  this.middleware.push(middleware);

  IocContainer.prototype.addFactoryMiddleware.call(this, middleware);
};


MockIocContainer.prototype.addService = function (key, factory) {
  this.services[key] = factory;

  IocContainer.prototype.addService.call(this, key, factory);
};


MockIocContainer.prototype.addNewService = function (key, factory) {
  if (!this.services[key]) {
    this.services[key] = factory;
  }

  IocContainer.prototype.addNewService.call(this, key, factory);
};


MockIocContainer.prototype.create = function (Constructor /** , ...args */) {
  if (this.deny_create_) {
    throw new Error('Denied by the test.');
  }

  var Mock = this.getMockConstructor_(Constructor);

  var Temp = function () {};
  Temp.prototype = Mock.prototype;

  var instance = new Temp();
  var args = Array.prototype.slice.call(arguments, 1);
  Mock.apply(instance, args);

  this.registerConstructorInstance_(Constructor, instance);
  if (Mock !== Constructor) {
    this.registerConstructorInstance_(Mock, instance);
  }

  return instance;
};


MockIocContainer.prototype.getMockConstructor_ = function (Original) {
  var constructors = this.mock_constructors_;
  for (var i = 0, ii = constructors.length; i < ii; ++i) {
    if (constructors[i].Original === Original) {
      return constructors[i].Mock;
    }
  }

  return Original;
};


MockIocContainer.prototype.registerConstructorInstance_ = function (
    Constructor, instance) {
  this.constructor_instances_.push({
    Constructor: Constructor,
    instance: instance
  });
};


module.exports = MockIocContainer;
