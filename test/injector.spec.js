// @flow

const { expect } = require('chai')

const Injector = require('../src/injector')


describe('Injector', () => {
  describe('instantiation', () => {
    it('should return registered raw instances', () => {
      const injector = new Injector()
      injector.addServices('test', {
        'a': { raw: true },
      })

      expect(injector.getService('a')).to.deep.equal({ raw: true })
    })


    it('should return registered primitives', () => {
      const injector = new Injector()
      injector.addServices('test', {
        'a': 'A',
      })

      expect(injector.getService('a')).to.equal('A')
    })


    it('should create a service instance with registered factories', () => {
      const injector = new Injector()
      injector.addServices('test', {
        'a': () => {
          return { created: true }
        },
      })

      expect(injector.getService('a')).to.deep.equal({ created: true })
    })


    it('should set the factory this context to the global object', (callback) => {
      const injector = new Injector()
      const g = this
      injector.addServices('test', {
        'a': () => {
          expect(this).to.equal(g)
          callback()
        },
      })

      injector.getService('a')
    })


    it('should create a service instance with registered ES5 constructors', () => {
      const injector = new Injector()

      const A = function () {}
      injector.addServices('test', {
        'a': A,
      })

      expect(injector.getService('a')).to.be.instanceof(A)
    })


    it('should invoke the registered ES5 constructors', (callback) => {
      const injector = new Injector()

      const A = function () {
        callback()
      }
      injector.addServices('test', {
        'a': A,
      })

      injector.getService('a')
    })


    it('should invoke the registered ES5 constructors ' +
        'in the context of their respective instances', (callback) => {
      const injector = new Injector()

      const A = function () {
        expect(this).to.be.instanceof(A)
        callback()
      }
      injector.addServices('test', {
        'a': A,
      })

      injector.getService('a')
    })


    it('should create a service instance with registered ES6 constructors', () => {
      const injector = new Injector()

      class A {
        constructor() {}
      }
      class B extends A {
        constructor() {
          super()
        }
      }

      injector.addServices('test', {
        'a': B,
      })

      expect(injector.getService('a')).to.be.instanceof(B)
    })


    it('should invoke the registered ES6 constructors', (callback) => {
      const injector = new Injector()

      class A {
        constructor() {}
      }
      class B extends A {
        constructor() {
          super()
          callback()
        }
      }

      injector.addServices('test', {
        'a': B,
      })

      injector.getService('a')
    })


    it('should invoke the registered ES6 constructors ' +
        'in the context of their respective instances', (callback) => {
      const injector = new Injector()

      class A {
        constructor() {}
      }
      class B extends A {
        constructor() {
          super()
          expect(this).to.be.instanceof(B)
          callback()
        }
      }

      injector.addServices('test', {
        'a': B,
      })

      injector.getService('a')
    })
  })
})
