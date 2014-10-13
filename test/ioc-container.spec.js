
var IocContainer = require('../src/ioc-container.js');

describe('IocContainer', function () {
  it('should accept new factories', function () {
    var ioc = new IocContainer();
    ioc.addService('a', function () {
      return {};
    });
  });


  it('should accept new prepared instances', function () {
    var ioc = new IocContainer();
    ioc.addService('a', {});
    ioc.addNewService('b', {});
  });


  it('should not overwrite existing instances', function () {
    var ioc = new IocContainer();

    var a = {};
    var b = {};
    ioc.addService('a', a);
    ioc.addNewService('a', b);

    expect(ioc.getService('a')).to.be(a);
  });


  it('should return prepared instances', function () {
    var ioc = new IocContainer();

    var a = {};
    var b = {};
    ioc.addService('a', a);
    ioc.addNewService('b', b);

    expect(ioc.getService('a')).to.be(a);
    expect(ioc.getService('b')).to.be(b);
  });


  it('should return factory-created instances', function () {
    var ioc = new IocContainer();

    var a = {};
    ioc.addService('a', function () {
      return a;
    });

    expect(ioc.getService('a')).to.be(a);
  });


  it('should return fn.bind() factory-created instances', function () {
    var ioc = new IocContainer();

    var a = {};
    ioc.addService('a', function () {
      return a;
    }.bind(null));

    expect(ioc.getService('a')).to.be(a);
  });


  it('should instantiate new services if possible', function () {
    var ioc = new IocContainer();

    var A = function () {};
    ioc.addService('a', A);

    var a = ioc.getService('a');
    expect(a).to.be.an(A);
  });


  it('should provide constructors with dependencies', function () {
    var ioc = new IocContainer();

    var called = 0;
    var A = function (b, c) {
      called += 1;
      expect(b).to.be(expected_b);
      expect(c).to.be(expected_c);
    };
    var expected_b = {};
    var expected_c = {};
    ioc.addService('a', A);
    ioc.addService('b', expected_b);
    ioc.addService('c', expected_c);

    var a = ioc.getService('a');
    expect(called).to.be(1);
    expect(a).to.be.an(A);
  });


  it('should default missing optional dependencies to null', function () {
    var ioc = new IocContainer();

    var expected_b = {};
    ioc.addService('b', expected_b);

    var called = 0;
    var A = function (b, c, d) {
      called += 1;
      expect(b).to.be(expected_b);
      expect(c).to.be(null);
      expect(d).to.be(null);
    };

    var a = ioc.create(A);
    expect(called).to.be(1);
    expect(a).to.be.an(A);
  });


  it('should return a replacements returned by constructors', function () {
    var ioc = new IocContainer();

    var expected = {};
    var A = function () {
      return expected;
    };
    ioc.addService('a', A);

    var a = ioc.getService('a');
    expect(a).to.be(expected);
  });


  it('should throw on a missing service request', function () {
    var ioc = new IocContainer();

    expect(function () {
      ioc.getService('a');
    }).to.throwError(
        /((missing|unknown).*?\sservice|service\s.*?(missing|unknown))/i);
  });


  it('should not create multiple instances of one service', function () {
    var ioc = new IocContainer();

    var a = {};
    var count = 0;
    ioc.addService('a', function () {
      count += 1;
      return a;
    });

    ioc.getService('a');
    ioc.getService('a');
    expect(count).to.be(1);
  });


  it('should instantiate a constructor providing it with correct dependencies',
      function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var expected_b = {};
    var count = 0;

    ioc.addService('a', expected_a);
    ioc.addService('b', expected_b);

    var Constructor = function (a, b) {
      count += 1;
      expect(a).to.be(expected_a);
      expect(b).to.be(expected_b);
    };
    Constructor.prototype.$deps = [ 'a', 'b' ];

    ioc.create(Constructor);
    expect(count).to.be(1);
  });


  it('should inject dependencies to a constructor with a prepared instance',
      function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var expected_b = {};
    var ctx = {};
    var count = 0;

    ioc.addService('a', expected_a);
    ioc.addService('b', expected_b);

    var Constructor = function (a, b) {
      count += 1;
      expect(a).to.be(expected_a);
      expect(b).to.be(expected_b);
      expect(this).to.be(ctx);
    };
    Constructor.prototype.$deps = [ 'a', 'b' ];

    ioc.inject(Constructor, ctx);
    expect(count).to.be(1);
  });


  it('should fallback to reading dependencies from the argument list',
      function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var expected_b = {};
    var count = 0;

    ioc.addService('a', expected_a);
    ioc.addService('b', expected_b);

    var Constructor = function (a, b) {
      count += 1;
      expect(a).to.be(expected_a);
      expect(b).to.be(expected_b);
    };

    ioc.inject(Constructor, {});
    expect(count).to.be(1);
  });


  it('should parse multiline argument lists', function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var expected_b = {};
    var expected_c = {};
    var expected_d = {};
    var count = 0;

    ioc.addService('a', expected_a);
    ioc.addService('b', expected_b);
    ioc.addService('c', expected_c);
    ioc.addService('d', expected_d);

    var ConstructorA = function (
        a, b) {
      count += 1;
      expect(a).to.be(expected_a);
      expect(b).to.be(expected_b);
    };
    var ConstructorB = function (a, b,
        c,
        d) {
      count += 1;
      expect(a).to.be(expected_a);
      expect(b).to.be(expected_b);
      expect(c).to.be(expected_c);
      expect(d).to.be(expected_d);
    };

    ioc.inject(ConstructorA, {});
    ioc.inject(ConstructorB, {});
    expect(count).to.be(2);
  });


  it('should tolerate missing services for trailing arguments', function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var expected_b = {};
    var count = 0;

    ioc.addService('a', expected_a);
    ioc.addService('b', expected_b);

    var Constructor = function (a, b, c, d) {
      count += 1;
      expect(a).to.be(expected_a);
      expect(b).to.be(expected_b);
    };

    ioc.inject(Constructor, {});
    expect(count).to.be(1);
  });


  it('should not tolerate missing services before the last existing service',
      function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var expected_b = {};
    var count = 0;

    ioc.addService('a', expected_a);
    ioc.addService('b', expected_b);

    var Constructor = function (a, c, b, d) {};

    expect(function () {
      ioc.inject(Constructor, {});
    }).to.throwError(
        /((missing|unknown).*?\sservice|service\s.*?(missing|unknown))/i);
  });


  it('should correctly pass provided extra arguments even if services exist',
      function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var count = 0;

    ioc.addService('a', expected_a);
    ioc.addService('b', {});

    var Constructor = function (a, b) {
      count += 1;
      expect(a).to.be(expected_a);
      expect(b).to.be('B');
    };

    ioc.inject(Constructor, {}, 'B');
    expect(count).to.be(1);
  });


  it('should pass provided custom arguments after dependencies', function () {
    var ioc = new IocContainer();
    var expected_a = {};
    var expected_arg1 = 1;
    var expected_arg2 = 2;
    var count = 0;

    ioc.addService('a', expected_a);

    var Constructor = function (a, arg1, arg2) {
      count += 1;
      expect(arg1).to.be(expected_arg1);
      expect(arg2).to.be(expected_arg2);
    };
    Constructor.prototype.$deps = [ 'a' ];

    ioc.create(Constructor, expected_arg1, expected_arg2);
    expect(count).to.be(1);
  });


  it('should create an instance which has no dependencies', function () {
    var ioc = new IocContainer();

    /**
     * @constructor
     */
    var Constructor = function () {};

    ioc.create(Constructor);
  });


  it('should create child containers', function () {
    var parent = new IocContainer();

    var child = parent.createChildContainer();
    expect(child).to.be.a(IocContainer);
    expect(child).to.not.be(parent);
  });


  describe('child injector', function () {
    it('should know about services added to parents before child creation',
        function () {
      var parent = new IocContainer();
      var a = {};
      parent.addService('a', a);

      var child = parent.createChildContainer();
      expect(child.getService('a')).to.be(a);
    });


    it('should know about services added to parents after child creation',
        function () {
      var parent = new IocContainer();
      var child = parent.createChildContainer();

      var a = {};
      parent.addService('a', a);

      expect(child.getService('a')).to.be(a);
    });


    it('should not affect parents when new services are added', function () {
      var parent = new IocContainer();
      var child = parent.createChildContainer();

      var a = {};
      child.addService('a', a);

      expect(child.getService('a')).to.be(a);
      expect(function () {
        parent.getService('a');
      }).to.throwError();
    });
  });


  describe('middleware', function () {
    it('should accept factory middleware', function () {
      var ioc = new IocContainer();

      var middleware = function (key) {};
      ioc.addFactoryMiddleware(middleware);
    });


    it('should request a service instance from middleware', function () {
      var ioc = new IocContainer();
      var expected_service = {};
      var count = 0;

      var middleware = function (key) {
        count += 1;
        return expected_service;
      };
      ioc.addFactoryMiddleware(middleware);

      var service = ioc.getService('abc');
      expect(count).to.be(1);
      expect(service).to.be(expected_service);
    });


    it('should not request a service instance from middleware if not needed',
        function () {
      var ioc = new IocContainer();
      var expected_service = {};
      var count = 0;

      var middleware = function (key) {
        count += 1;
      };
      ioc.addService('abc', expected_service);
      ioc.addFactoryMiddleware(middleware);

      var service = ioc.getService('abc');
      expect(count).to.be(0);
      expect(service).to.be(expected_service);
    });
  });
});
