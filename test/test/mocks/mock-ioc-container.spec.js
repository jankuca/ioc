
var MockIocContainer = require('../../../src/test/mocks/mock-ioc-container');


describe('MockIocContainer', function () {
  it('should mock constructors', function () {
    var ioc = new MockIocContainer();

    var Original = function () {};
    var Mock = function () {};
    ioc.mockConstructorInTest(Original, Mock);

    var instance = ioc.create(Original);
    expect(instance).to.be.a(Mock);
  });


  it('should mock multiple constructors at once', function () {
    var ioc = new MockIocContainer();

    var OriginalA = function () {};
    var OriginalB = function () {};
    var MockA = function () {};
    var MockB = function () {};
    ioc.mockConstructorsInTest([
      [ OriginalA, MockA ],
      [ OriginalB, MockB ]
    ]);

    var instance_a = ioc.create(OriginalA);
    var instance_b = ioc.create(OriginalB);
    expect(instance_a).to.be.a(MockA);
    expect(instance_b).to.be.a(MockB);
  });


  it('should return constructor instances by constructor', function () {
    var ioc = new MockIocContainer();

    var Constructor = function () {};
    var instance = ioc.create(Constructor);

    expect(ioc.getConstructorInstanceInTest(Constructor)).to.be(instance);
  });


  it('should return null if no constructor instance has been created',
      function () {
    var ioc = new MockIocContainer();

    var Constructor = function () {};
    expect(ioc.getConstructorInstanceInTest(Constructor)).to.be(null);
  });


  it('should accept service factories via addService()', function () {
    var ioc = new MockIocContainer();

    var factory_a = function () {};
    var factory_b = function () {};

    ioc.addService('a', factory_a);
    ioc.addService('b', factory_b);
    expect(ioc.services['a']).to.be(factory_a);
    expect(ioc.services['b']).to.be(factory_b);
  });


  it('should accept service factories via addNewService()', function () {
    var ioc = new MockIocContainer();

    var factory_a = function () {};
    var factory_b = function () {};

    ioc.addNewService('a', factory_a);
    ioc.addNewService('b', factory_b);
    expect(ioc.services['a']).to.be(factory_a);
    expect(ioc.services['b']).to.be(factory_b);
  });


  it('should not overwrite existing service factories via addNewService()',
      function () {
    var ioc = new MockIocContainer();

    var factory_a = function () {};
    var factory_b = function () {};

    ioc.addService('a', factory_a);
    ioc.addNewService('a', factory_b);
    expect(ioc.services['a']).to.be(factory_a);
  });


  it('should accept factory middleware', function () {
    var ioc = new MockIocContainer();

    var middleware_a = function () {};
    var middleware_b = function () {};

    ioc.addFactoryMiddleware(middleware_a);
    ioc.addFactoryMiddleware(middleware_b);
    expect(ioc.middleware).to.have.length(2);
    expect(ioc.middleware[0]).to.be(middleware_a);
    expect(ioc.middleware[1]).to.be(middleware_b);
  });


  it('should allow disabling of all constructor instantiations', function () {
    var ioc = new MockIocContainer();

    var Constructor = function () {};
    ioc.addService('a', Constructor);

    ioc.denyConstructorInstantiationInTest();
    expect(function () {
      ioc.create(Constructor);
    }).to.throwError();
  });


  it('should allow disabling of new service instantiation', function () {
    var ioc = new MockIocContainer();

    var Constructor = function () {};
    ioc.addService('a', Constructor);

    ioc.denyConstructorInstantiationInTest();
    expect(function () {
      ioc.getService('a');
    }).to.throwError();
  });
});
