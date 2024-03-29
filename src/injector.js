// @flow

type GroupPolicy = {
  limited: boolean,
  allowedDependencies: Array<string>,
  deniedDependencies: Array<string>,
}


module.exports = class Injector {
  _factories = {}
  _instances = {}
  _sourceStacks = {}

  _groups = {}
  _allowedGroupDependencies = {}
  _deniedGroupDependencies = {}

  constructor() {
    this.addGroupServices('injectors', {
      injector: this,
    })
  }

  _addService(
    key: string,
    factory: mixed,
    groups: Array<string> | string | null = null
  ) {
    const stack = this._parseStack(new Error().stack)
    if (this._instances[key] || this._factories[key]) {
      this._warnAboutMultipleDefinitions(key, stack)
    }

    if (typeof factory === 'function') {
      this._factories[key] = factory
    } else {
      this._instances[key] = factory
    }

    if (groups) {
      this._addServiceToGroups(groups, key)
    }

    this._sourceStacks[key] = stack
  }

  addServices(
    services: { [key: string]: mixed },
  ) {
    Object.keys(services).forEach((key) => {
      const service = services[key]
      this._addService(key, service, null)
    })
  }

  addGroupServices(
    groups: Array<string> | string,
    services: { [key: string]: mixed }
  ) {
    groups = Array.isArray(groups) ? groups : [ groups ]

    Object.keys(services).forEach((key) => {
      const service = services[key]
      this._addService(key, service, groups)
    })
  }

  getServices(...groups: Array<string>): {
    [key: string]: any,
  } {
    if (groups.length === 0) {
      return this.getAllServices()
    }

    const services = {}
    const keys = []

    groups.forEach((group) => {
      const groupServiceKeys = this._groups[group]
      groupServiceKeys.forEach((key) => {
        if (keys.indexOf(key) > -1) {
          return
        }

        if (this._instances[key]) {
          services[key] = this._instances[key]
        } else if (this._factories[key]) {
          Object.defineProperty(services, key, {
            enumerable: true,
            get: this.getService.bind(this, key),
          })
        }
      })
    })

    return services
  }

  getAllServices(): {
    [key: string]: any,
  } {
    const services = { ...this._instances }

    Object.keys(this._factories).forEach((key) => {
      const factory = this._factories[key]
      if (typeof services[key] === 'undefined') {
        Object.defineProperty(services, key, {
          enumerable: true,
          get: this.getService.bind(this, key),
        })
      }
    })

    return services
  }

  getAllServicesAs(group: string): {
    [key: string]: any,
  } {
    const groupPolicy = this._getGroupPolicy(group)
    if (!groupPolicy.limited) {
      return this.getAllServices()
    }

    const isAllowedForGroup = (key) => {
      const denied = (groupPolicy.deniedDependencies.indexOf(key) !== -1)
      const allowed = (groupPolicy.allowedDependencies.indexOf(key) !== -1)
      return allowed || !denied
    }

    const services = {}
    Object.keys(this._instances).forEach((key) => {
      if (isAllowedForGroup(key)) {
        services[key] = this._instances[key]
      }
    })

    Object.keys(this._factories).forEach((key) => {
      if (typeof services[key] === 'undefined' && isAllowedForGroup(key)) {
        Object.defineProperty(services, key, {
          enumerable: true,
          get: this.getService.bind(this, key),
        })
      }
    })

    return services
  }

  /**
   * Adds a new service definition unless a service of the provided key has
   * already been defined.
   * @param {string} key A service key.
   * @param {!Function} factory A service factory or a constructor.
   * @param {(Array.<string>|string|null)=} groups A service group list.
   *   If (there already is a service with the same provided key, the service is)
   *   still added to the provided group(s).
   */
  _addNewService(
    key: string,
    factory: mixed,
    groups: Array<string> | string | null = null
  ) {
    if (this._instances[key] || this._factories[key]) {
      if (groups) {
        this._addServiceToGroups(groups, key)
      }
      return
    }

    this._addService(key, factory, groups)
  }

  addNewGroupServices(
    groups: Array<string> | string,
    services: { [key: string]: mixed }
  ) {
    groups = Array.isArray(groups) ? groups : [ groups ]

    Object.keys(services).forEach((key) => {
      const service = services[key]
      this._addNewService(key, service, groups)
    })
  }

  addNewServices(
    services: { [key: string]: mixed }
  ) {
    Object.keys(services).forEach((key) => {
      const service = services[key]
      this._addNewService(key, service, null)
    })
  }

  /**
   * Adds the service of the provided key to the provided groups.
   * Groups are a way of defining permission relationships between services
   * in the sense of "who can request whom".
   * @param {!Array.<string>|string} groups A service group list.
   * @param {string} key A service key.
   */
  _addServiceToGroups(groups: Array<string> | string, key: string) {
    if (!groups) {
      return
    }

    if (Array.isArray(groups)) {
      groups.forEach((group) => {
        this._addServiceToGroup(group, key)
      })
    } else {
      this._addServiceToGroup(groups, key)
    }
  }

  /**
   * Adds the service of the provided key to the provided group.
   * Groups are a way of defining permission relationships between services
   * in the sense of "who can request whom".
   * @param {string} group A service group.
   * @param {string} key A service key.
   */
  _addServiceToGroup(group: string, key: string) {
    this._groups[group] = this._groups[group] || []
    if (this._groups[group].indexOf(key) === -1) {
      this._groups[group].push(key)
    }
  }

  allowGroupDependency(group: string, dependencyGroup: string) {
    this._allowedGroupDependencies[group] = this._allowedGroupDependencies[group] || []
    if (this._allowedGroupDependencies[group].indexOf(dependencyGroup) === -1) {
      this._allowedGroupDependencies[group].push(dependencyGroup)
    }
  }

  denyGroupDependency(group: string, dependencyGroup: string) {
    this._deniedGroupDependencies[group] = this._deniedGroupDependencies[group] || []
    if (this._deniedGroupDependencies[group].indexOf(dependencyGroup) === -1) {
      this._deniedGroupDependencies[group].push(dependencyGroup)
    }
  }

  /**
   * Returns an existing service instance, otherwise requests a new instance
   * and returns that if (a service of the provided key is defined.)
   * @param {string} key A service key.
   * @return {Object} A service instance.
   */
  getService(key: string): * {
    let instance = this._instances[key]
    if (instance) {
      return instance
    }

    const Constructor = this._factories[key]
    if (!Constructor) {
      return null
    }

    const groups = this._getGroupsOfService(key)
    if (groups.length === 0) {
      instance = this.create(Constructor)
    } else {
      instance = this._createGroupMember(Constructor, groups, key)
    }

    this._instances[key] = instance
    return instance
  }

  /**
   * Creates a new instance using the provided factory or a constructor.
   * A dependency list is read from the argument list of the function.
   * Any extra arguments are passed prepended to the argument list applied
   * to the factory.
   * @param {!Function} Constructor A service factory or a constructor.
   * @param {...*} args Arguments to pass to the factory/constructor.
   * @return {!Object} A new instance.
   */
  create(Constructor: Function, ...args: Array<*>): * {
    return this.createInGroup(Constructor, null, ...args)
  }

  createInGroup(
    Constructor: Function,
    groups: Array<string> | string | null,
    ...args: Array<*>
  ): * {
    const name = Constructor.name
    return this._createGroupMember(Constructor, groups, name, ...args)
  }

  _createGroupMember(
    Constructor: Function,
    groups: Array<string> | string | null,
    dependantKey: string,
    ...args: Array<*>
  ): * {
    const depTypes = this._getDependencyList(Constructor) || {}
    const depKeys = Object.keys(depTypes)

    if (Array.isArray(groups)) {
      this._validateDependencyList(depKeys, groups, dependantKey)
    } else if (groups) {
      this._validateDependencyList(depKeys, [ groups ], dependantKey)
    }

    return this._createWithDependencyList(
      Constructor,
      depTypes,
      dependantKey,
      ...args
    )
  }

  _createWithDependencyList(
    Constructor: Function,
    depTypes: { [key: string]: boolean },
    dependantKey: string,
    ...args: Array<*>
  ): * {
    const services = {}
    Object.keys(depTypes).forEach((depKey) => {
      const depType = depTypes[depKey]
      const dep = this.getService(depKey)
      if (!dep) {
        const message = `Dependency not provided: ${dependantKey}(${depKey})`
        if (depType === false) {
          console.warn(`[Injector] ${message}`)
        } else {
          throw new Error(message)
        }
      }

      services[depKey] = dep
    })

    try {
      return Reflect.construct(Constructor, [ ...args, services ])
    } catch (err) {
      try {
        return Constructor(...args, services) || null
      } catch (subErr) {
        const message = `Failed to instantiate service: ${dependantKey}`
        console.error(`[Injector] ${message}\n`, err, '\n', subErr)
        throw new Error(message)
      }
    }
  }

  _getGroupsOfService(key: string): Array<string> {
    const groups = []
    Object.keys(this._groups).forEach((group) => {
      const keys = this._groups[group]
      if (keys.indexOf(key) !== -1) {
        groups.push(group)
      }
    })

    return groups
  }

  _getDependencyList(Constructor: Function): ?{
    [key: string]: boolean,
  } {
    const serviceTypes = (
      (Constructor.prototype ? Constructor.prototype.serviceTypes : null) ||
      Constructor.serviceTypes
    )

    if (serviceTypes) {
      return serviceTypes
    }

    const name = Constructor.name
    if (name) {
      console.debug(
        `[Injector] The constructor/factory "${name}" does not provide a service list. ` +
        'No services will be injected.'
      )
    }

    return null
  }

  _validateDependencyList(
    depKeys: Array<string>,
    groups: Array<string>,
    dependantKey: string
  ) {
    const groupPolicy = this._getGroupPolicyAggregation(groups)
    if (!groupPolicy.limited) {
      return
    }

    depKeys.forEach((depKey) => {
      const denied = (groupPolicy.deniedDependencies.indexOf(depKey) !== -1)
      const allowed = (groupPolicy.allowedDependencies.indexOf(depKey) !== -1)
      if (denied && !allowed) {
        throw new Error(`Denied access to dependency: ${dependantKey}(${depKey})`)
      }
    })
  }

  _getGroupPolicyAggregation(groups: Array<string>): GroupPolicy {
    const policy = {
      limited: false,
      allowedDependencies: [],
      deniedDependencies: [],
    }

    groups.forEach((group) => {
      const groupPolicy = this._getGroupPolicy(group)
      if (groupPolicy.limited) {
        policy.limited = true

        policy.allowedDependencies = groupPolicy.allowedDependencies.reduce(
          (allowedDependencies, depKey) => {
            return (allowedDependencies.indexOf(depKey) === -1) ?
              allowedDependencies.concat([ depKey ]) :
              allowedDependencies
          },
          policy.allowedDependencies
        )

        policy.deniedDependencies = groupPolicy.deniedDependencies.reduce(
          (deniedDependencies, depKey) => {
            return (deniedDependencies.indexOf(depKey) === -1) ?
              deniedDependencies.concat([ depKey ]) :
              deniedDependencies
          },
          policy.deniedDependencies
        )
      }
    })

    return policy
  }

  _getGroupPolicy(group: string): GroupPolicy {
    const allowedDepKeys = this._allowedGroupDependencies[group] || []
    const deniedDepKeys = this._deniedGroupDependencies[group] || []

    const groupPolicy = {
      limited: (allowedDepKeys.length > 0 || deniedDepKeys.length > 0),
      allowedDependencies: this._collectGroupDependencies(group, allowedDepKeys),
      deniedDependencies: this._collectGroupDependencies(group, deniedDepKeys),
    }

    return groupPolicy
  }

  _collectGroupDependencies(
    group: string,
    groupDependencies: Array<string>
  ): Array<string> {
    return groupDependencies.reduce((results, dependencyGroup) => {
      return (this._groups[dependencyGroup] || []).reduce((results, key) => {
        return (results.indexOf(key) === -1) ? results.concat([ key ]) : results
      }, results)
    }, [])
  }

  _parseStack(rawStack: string): string {
    const stackLines = rawStack.split('\n')
    const stack = stackLines.slice(2).join('\n')
    return stack
  }

  _warnAboutMultipleDefinitions(key: string, stack: string) {
    const originalStack = this._sourceStacks[key]
    console.warn(
      `[Injector] Service '${key}' is being overwritten.` +
      `Newly defined at: ${stack}` +
      `Originally defined at: ${originalStack}`
    )
  }
}
