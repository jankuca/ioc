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


    it('should create a service instance with registered ES5 constructors', () => {
      const injector = new Injector()

      const A = function () {}
      injector.addServices('test', {
        'a': A,
      })

      expect(injector.getService('a')).to.be.instanceof(A)
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
  })
})
