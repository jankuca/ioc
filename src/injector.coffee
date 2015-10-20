_ = require 'lodash'


class Injector
  constructor: ->
    @_factories = {}
    @_instances = {}
    @_sourceStacks = {}

    @_groups = {}
    @_allowedGroupDependencies = {}
    @_deniedGroupDependencies = {}

    @addServices('injectors', injector: this)

  ###*
  # Adds a new service definition.
  # @param {string} key A service key.
  # @param {!Function} factory A service factory or a constructor.
  # @param {(Array.<string>|string|null)=} groups A service group list.
  ###
  _addService: (key, factory, groups) ->
    stack = @_parseStack(new Error().stack)
    if @_instances[key] or @_factories[key]
      @_warnAboutMultipleDefinitions(key, stack)

    if typeof factory == 'function'
      @_factories[key] = factory
    else
      @_instances[key] = factory

    @_addServiceToGroups(groups, key) if groups

    @_sourceStacks[key] = stack

  addServices: (groups..., services) ->
    for key, service of services
      @_addService(key, service, groups)

  ###*
  # Adds a new service definition unless a service of the provided key has
  # already been defined.
  # @param {string} key A service key.
  # @param {!Function} factory A service factory or a constructor.
  # @param {(Array.<string>|string|null)=} groups A service group list.
  #   If there already is a service with the same provided key, the service is
  #   still added to the provided group(s).
  ###
  _addNewService: (key, factory, groups) ->
    if @_instances[key] or @_factories[key]
      @_addServiceToGroups(groups, key) if group
      return

    @_addService(key, factory, groups)

  addNewServices: (groups..., services) ->
    for key, service of services
      @_addNewService(key, service, groups)

  ###*
  # Adds the service of the provided key to the provided groups.
  # Groups are a way of defining permission relationships between services
  # in the sense of "who can request whom".
  # @param {!Array.<string>|string} groups A service group list.
  # @param {string} key A service key.
  ###
  _addServiceToGroups: (groups, key) ->
    return if !groups
    if Array.isArray(groups)
      for group in groups
        @_addServiceToGroup(group, key)
    else
      @_addServiceToGroup(groups, key)

  ###*
  # Adds the service of the provided key to the provided group.
  # Groups are a way of defining permission relationships between services
  # in the sense of "who can request whom".
  # @param {string} group A service group.
  # @param {string} key A service key.
  ###
  _addServiceToGroup: (group, key) ->
    @_groups[group] ?= []
    if @_groups[group].indexOf(key) == -1
      @_groups[group].push(key)

  allowGroupDependency: (group, dependencyGroup) ->
    @_allowedGroupDependencies[group] ?= []
    if @_allowedGroupDependencies[group].indexOf(dependencyGroup) == -1
      @_allowedGroupDependencies[group].push(dependencyGroup)

  denyGroupDependency: (group, dependencyGroup) ->
    @_deniedGroupDependencies[group] ?= []
    if @_deniedGroupDependencies[group].indexOf(dependencyGroup) == -1
      @_deniedGroupDependencies[group].push(dependencyGroup)

  ###*
  # Returns an existing service instance, otherwise requests a new instance
  # and returns that if a service of the provided key is defined.
  # @param {string} key A service key.
  # @return {Object} A service instance.
  ###
  getService: (key) ->
    instance = @_instances[key]
    return instance if instance

    Constructor = @_factories[key]
    return null if !Constructor

    groups = @_getGroupsOfService(key)
    if groups.length == 0
      instance = @create(Constructor)
    else
      instance = @_createGroupMember(Constructor, groups, key)

    @_instances[key] = instance
    return instance

  ###*
  # Creates a new instance using the provided factory or a constructor.
  # A dependency list is read from the argument list of the function.
  # Any extra arguments are passed prepended to the argument list applied
  # to the factory.
  # @param {!Function} Constructor A service factory or a constructor.
  # @param {...*} args Arguments to pass to the factory/constructor.
  # @return {!Object} A new instance.
  ###
  create: (Constructor, args...) ->
    return @createInGroup(Constructor, null, args...)

  createInGroup: (Constructor, groups, args...) ->
    name = Constructor.name
    return @_createGroupMember(Constructor, groups, name, args...)

  _createGroupMember: (Constructor, groups, dependantKey, args...) ->
    depTypes = @_getDependencyList(Constructor)
    depKeys = _.keys(depTypes)

    if Array.isArray(groups)
      @_validateDependencyList(depKeys, groups, dependantKey)
    else if groups
      @_validateDependencyList(depKeys, [ groups ], dependantKey)

    return @_createWithDependencyList(
        Constructor, depTypes, dependantKey, args...)

  _createWithDependencyList: (Constructor, depTypes, dependantKey, args...) ->
    services = {}
    for depKey, depType of depTypes
      dep = @getService(depKey)
      if !dep
        throw new Error "
          Dependency not provided:
          #{dependantKey}(#{depKey})
        "
      services[depKey] = dep

    # Preserve the constructor name property
    createTempConstructor = new Function(
        'return function ' + Constructor.name + '() {};')

    ###* @constructor ###
    Temp = createTempConstructor()
    Temp.prototype = Constructor.prototype

    instance = new Temp()
    newInstance = Constructor.apply(instance, [ args..., services ])
    return newInstance or instance

  _getGroupsOfService: (key) ->
    groups = []
    for group, keys of @_groups
      if keys.indexOf(key) != -1
        groups.push(group)

    return groups

  _getDependencyList: (Constructor) ->
    serviceTypes = Constructor::serviceTypes
    if serviceTypes
      return serviceTypes

    name = Constructor.name
    if name
      console.debug "
        The constructor/factory \"#{name}\" does not provide
        a service list. No services will be injected.
      "

    return null

  _validateDependencyList: (depKeys, groups, dependantKey) ->
    groupPolicy = @_getGroupPolicyAggregation(groups)
    return if not groupPolicy.limited

    for depKey in depKeys
      denied = groupPolicy.deniedDependencies.indexOf(depKey) != -1
      allowed = groupPolicy.allowedDependencies.indexOf(depKey) != -1
      if denied and not allowed
        throw new Error "
          Denied access to dependency:
          #{dependantKey}(#{depKey})
        "

  _getGroupPolicyAggregation: (groups) ->
    policy =
      limited: false
      allowedDependencies: []
      deniedDependencies: []

    for group in groups
      groupPolicy = @_getGroupPolicy(group)
      if groupPolicy.limited
        policy.limited = true
        policy.allowedDependencies = _.union policy.allowedDependencies,
          groupPolicy.allowedDependencies
        policy.deniedDependencies = _.union policy.deniedDependencies,
          groupPolicy.deniedDependencies

    return policy

  _getGroupPolicy: (group) ->
    allowedDepKeys = @_allowedGroupDependencies[group]
    deniedDepKeys = @_deniedGroupDependencies[group]

    groupPolicy =
      limited: (allowedDepKeys?.length > 0 or deniedDepKeys?.length > 0)
      allowedDependencies: @_collectGroupDependencies(group, allowedDepKeys)
      deniedDependencies: @_collectGroupDependencies(group, deniedDepKeys)

    return groupPolicy

  _collectGroupDependencies: (group, groupDependencies) ->
    results = []
    return results if !groupDependencies

    for dependencyGroup in groupDependencies
      keys = @_groups[dependencyGroup]
      continue if !keys
      results = _.union(results, keys)

    return results

  _parseStack: (rawStack) ->
    stackLines = rawStack.split('\n')
    stack = stackLines.slice(2).join('\n')
    return stack

  _warnAboutMultipleDefinitions: (key, stack) ->
    originalStack = @_sourceStacks[key]
    console.warn """
      Service '#{key}' is being overwritten.
      Newly defined at: #{stack}
      Originally defined at: #{originalStack}
    """


module.exports = Injector
