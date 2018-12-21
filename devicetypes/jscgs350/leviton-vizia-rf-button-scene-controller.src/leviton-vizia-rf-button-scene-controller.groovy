// vim :set tabstop=2 shiftwidth=2 sts=2 expandtab smarttab :
/**
 *
 *  VIZIA RF 1 BUTTON SCENE CONTROLLER
 *  VRCS1 - 1-Button Scene Controller
 *  https://products.z-wavealliance.org/products/316
 *
 *  Leviton VRCS4-M0Z Vizia RF + 4-Button Remote Scene Controller
 *  https://products.z-wavealliance.org/products/318
 *
 *  Copyright 2017-2018 Brian Aker
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 *
 */

import physicalgraph.*

String getDriverVersion () {
  return "v1.73"
}

metadata {
  definition (name: "Leviton Vizia RF Button Scene Controller", namespace: "jscgs350", author: "Brian Aker") {
    capability "Actuator"
    capability "Button"
    capability "Sensor"
    capability "Switch"
    capability "Refresh"
    capability "Polling"

    attribute "logMessage", "string"        // Important log messages.
    attribute "lastError", "string"        // Last error message

    attribute "ManufacturerCode", "string"
    attribute "ProduceTypeCode", "string"
    attribute "ProductCode", "string"
    attribute "firmwareVersion", "string"
    attribute "zWaveProtocolVersion", "string"
    attribute "driverVersion", "string"

    attribute "hail", "string"

    attribute "Scene", "number"
    attribute "setScene", "enum", ["Unknown", "Set", "Setting"]

    attribute "NIF", "string"

    fingerprint mfr: "001D", prod: "0902", model: "0224", deviceJoinName: "Leviton VRCS1-1LZ Vizia RF + 1-Button Scene Controller"
    fingerprint mfr: "001D", prod: "0802", model: "0261", deviceJoinName: "Leviton VRCS4-M0Z Vizia RF + 4-Button Remote Scene Controller"
  }


  simulator {
    // TODO: define status and reply messages here
  }

  preferences {
    input name: "associatedDevice", type: "number", title: "Associated Device", description: "... ", required: false
    input name: "debugLevel", type: "number", title: "Debug Level", description: "Adjust debug level for log", range: "1..5", displayDuringSetup: false
  }

  tiles {
    valueTile("scene", "device.Scene", width: 2, height: 2, decoration: "flat", inactiveLabel: false) {
      state "default", label: '${currentValue}'
    }

    valueTile("setScene", "device.setScene", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
      state "Set", label: '${name}', nextState: "Setting"
      state "Setting", label: '${name}' //, nextState: "Set_Scene"
    }

    valueTile("driverVersion", "device.driverVersion", width:2, height: 2, decoration: "flat", inactiveLabel: false) {
      state "default", label: '${currentValue}'
    }
	standardTile("refresh", "device.refresh", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
		state "default", label:'Refresh', action:"refresh", icon:"st.secondary.refresh-icon"
	}
    main ("scene")
    details(["scene", "setScene", "driverVersion", "refresh"])
  }
}

def getCommandClassVersions() {
  [
    0x20: 1,  // Basic
    0x2D: 1,  // Scene Controller Conf
    0x72: 1,  // Manufacturer Specific
    0x73: 1,  // Powerlevel
    // 0x77: 1,  // Node Naming
    0x82: 1,  // Hail
    0x85: 2,  // Association  0x85  V1 V2
    0x86: 1,  // Version
    0x91: 1,  // Man Prop
    // Note: Controlled but not supported
    0x2B: 1,  // SceneActivation
    0x2C: 1,  // Scene Actuator Conf
    0x25: 1,  //
    0x22: 1,  // Application Status
    0x7C: 1,  // Remote Association Activate
    //    0x56: 1,  // Crc16 Encap
    //    0x25: 1,  // Switch Binary
    //    0x91: 1, // Manufacturer Proprietary
    // Stray commands that show up
    0x54: 1,  // Network Management Primary
  ]
}

// parse events into attributes
def parse(String description) {
  def result = []

  if (description && description.startsWith("Err")) {
    log.error "parse error: ${description}"
    result << createEvent(name: "lastError", value: "Error parse() ${description}", descriptionText: description)

    if (description.startsWith("Err 106")) {
      result << createEvent(
          descriptionText: "Security, possible key exchange error.",
          eventType: "ALERT",
          name: "secureInclusion",
          value: "failed",
          isStateChange: true,
        )
    }
  } else if (! description) {
    logger( "parse() called with NULL description", "warn")
  } else if (description.contains("command: 9100")) {
    logger("PROP $description", "ERROR")
    //handleManufacturerProprietary(description, result)
  } else if (description != "updated") {
    def cmd = zwave.parse(description, getCommandClassVersions())

    if (cmd) {
      zwaveEvent(cmd, result)
    } else {
      logger( "zwave.parse(CC) failed for: ${description}", "parse")

      cmd = zwave.parse(description)
      if (cmd) {
        zwaveEvent(cmd, result)
      } else {
        logger( "zwave.parse() failed for: ${description}", "error")
      }
    }
  }

  return result
}

def on() {
  logger("$device.displayName on()")
}

def off() {
  logger("$device.displayName off()")

  logger(device.currentValue("switch"))
  if (device.currentValue("switch") == "on") {
    if (0) {
      sendEvent(name: "switch", value: "off", type: "digital", isStateChange: true, displayed: true)
    }
    response( zwave.basicV1.basicSet(value: 0x00) )
  }

  if (0) {
    unsetScene(false)
  }
}

def childOn(String childID) {
  logger("$device.displayName childOn( $childID )")

  Integer buttonId = childID?.split("/")[1] as Integer
}

def childOff(String childID) {
  logger("$device.displayName childOff( $childID )")

  Integer buttonId = childID?.split("/")[1] as Integer
}

def childLevel(String childID, Integer val) {
  logger("$device.displayName childLevel( $childID, $val )")

  Integer buttonId = childID?.split("/")[1] as Integer
}

def handleManufacturerProprietary(String description, result) {
  // log.debug "Handling manufacturer-proprietary command: '${description}'"
  logger("$device.displayName $description")
}

def buttonEvent(String exec_cmd, Integer button_pressed, Boolean isHeld) {
  logger("buttonEvent: $button_pressed  exec: $exec_cmd held: $isHeld")

  String heldType = isHeld ? "held" : "pushed"

  if (button_pressed > 0) {
    sendEvent(name: "button", value: "$heldType", data: [buttonNumber: button_pressed], descriptionText: "$device.displayName $exec_cmd button $button_pressed was pushed", isStateChange: true, type: "physical")
  } else {
    sendEvent(name: "button", value: "default", descriptionText: "$device.displayName $exec_cmd button released", isStateChange: true, type: "physical")
  }
}

def zwaveEvent(zwave.commands.basicv1.BasicGet cmd, result) {
  logger("$cmd")

  def currentValue = device.currentState("switch").value.equals("on") ? 255 : 0
  result << zwave.basicV1.basicReport(value: currentValue).format()
}

def zwaveEvent(zwave.commands.basicv1.BasicReport cmd, result) {
  logger("$cmd")

  Short value = cmd.value

  if (value == 0) {
    result << createEvent(name: "switch", value: "off", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: 0, isStateChange: true, displayed: true)
    }
  } else if (value < 100 || value == 255) {
    result << createEvent(name: "switch", value: "on", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: basic == 255 ? 100 : value, isStateChange: true, displayed: true)
    }
  } else if (value < 254) {
    logger("BasicReport returned reserved state ($value)", "warn")
  } else if (value == 254) {
    logger("BasicReport unknown state (254)", "warn")
  } else {
    logger("BasicReport reported value unknown to API ($value)", "warn")
  }
}

def zwaveEvent(zwave.commands.basicv1.BasicSet cmd, result) {
  logger("$cmd")

  Short value = cmd.value

  if (value == 0) {
    result << createEvent(name: "switch", value: "off", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: 0, isStateChange: true, displayed: true)
    }
  } else if (value < 100 || value == 255) {
    result << createEvent(name: "switch", value: "on", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: 100, isStateChange: true, displayed: true)
    }
  } else if (value < 254) {
    logger("BasicSet returned reserved state ($value)", "warn")
  } else if (value == 254) {
    logger("BasicSet unknown state (254)", "warn")
  } else {
    logger("BasicSet reported value unknown to API ($value)", "warn")
  }
} 


def zwaveEvent(zwave.commands.switchbinaryv1.SwitchBinaryGet cmd, result) {
  logger("$cmd")

  def value = device.currentState("switch").value.equals("on") ? 255 : 0
  result << zwave.basicV1.switchBinaryReport(value: value).format()
}

def zwaveEvent(zwave.commands.switchbinaryv1.SwitchBinaryReport cmd, result) {
  logger("$cmd")

  Short value = cmd.value

  if (value == 0) {
    result << createEvent(name: "switch", value: "off", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: 0, isStateChange: true, displayed: true)
    }
  } else if (value == 255) {
    result << createEvent(name: "switch", value: "on", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: 100, isStateChange: true, displayed: true)
    }
  } else if (value < 254) {
    logger("SwitchBinaryReport returned reserved state ($value)", "warn")
  } else if (value == 254) {
    logger("SwitchBinaryReport unknown state (254)", "warn")
  } else {
    logger("SwitchBinaryReport reported value unknown to API ($value)", "warn")
  }
}

def zwaveEvent(zwave.commands.switchbinaryv1.SwitchBinarySet cmd, result) {
  logger("$cmd")

  Short value = cmd.switchValue

  if (value == 0) {
    result << createEvent(name: "switch", value: "off", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: 0, isStateChange: true, displayed: true)
    }
  } else if (value < 100 || value == 255) {
    result << createEvent(name: "switch", value: "on", isStateChange: true, displayed: true)
    if (device.displayName.endsWith("Dimmer")) {
      result << createEvent(name: "level", value: 100, isStateChange: true, displayed: true)
    }
  } else if (value < 254) {
    logger("SwitchBinarySet returned reserved state ($value)", "warn")
  } else if (value == 254) {
    logger("SwitchBinarySet unknown state (254)", "warn")
  } else {
    logger("SwitchBinarySet reported value unknown to API ($value)", "warn")
  }
} 

def zwaveEvent(physicalgraph.zwave.commands.switchmultilevelv3.SwitchMultilevelReport cmd, result) {
  logger("$device.displayName $cmd")
}

def zwaveEvent(physicalgraph.zwave.commands.switchmultilevelv3.SwitchMultilevelStartLevelChange cmd, result) {	
  logger("$device.displayName $cmd")
}

def zwaveEvent(physicalgraph.zwave.commands.switchmultilevelv3.SwitchMultilevelStopLevelChange cmd, result) {	
  logger("$device.displayName $cmd")
}

def zwaveEvent(physicalgraph.zwave.commands.applicationstatusv1.ApplicationBusy cmd, result) {
  logger("$device.displayName $cmd")
  switch (cmd.status) {
    case 0:
    logger("Try again later ${cmd.waitTime}")
    break
    case 1:
    logger("Try again in ${cmd.waitTime} seconds")
    break
    case 2:
    logger("Request queued ${cmd.waitTime}")
    break
    default:
    logger("Unknown Status ${cmd.status}", "error")
    break
  }
}

def zwaveEvent(physicalgraph.zwave.commands.applicationstatusv1.ApplicationRejectedRequest cmd, result) {
  logger("$device.displayName $cmd")
}

def zwaveEvent(physicalgraph.zwave.commands.scenecontrollerconfv1.SceneControllerConfReport cmd, result) {
  logger("$device.displayName $cmd")

  if (cmd.groupId != cmd.sceneId) {
    result << response(delayBetween([
      zwave.sceneControllerConfV1.sceneControllerConfSet(groupId: cmd.groupId, sceneId: cmd.sceneId).format(),
      zwave.sceneControllerConfV1.sceneControllerConfGet(groupId: cmd.groupId).format(),
    ]))
  }

  updateDataValue("Group #${cmd.groupId} Scene", "$cmd.sceneId")
  updateDataValue("Group #${cmd.groupId} Duration", "$cmd.dimmingDuration")
}

def zwaveEvent(physicalgraph.zwave.commands.scenecontrollerconfv1.SceneControllerConfSet cmd, result) {
  logger("$device.displayName $cmd")
}

def zwaveEvent(physicalgraph.zwave.commands.scenecontrollerconfv1.SceneControllerConfGet cmd, result) {
  logger("$device.displayName $cmd")
  sendCommands([
    zwave.sceneControllerConfV1.sceneControllerConfReport(groupId: cmd.groupId, dimmingDuration: 0xFF, sceneId: cmd.groupId),
  ])
}

def zwaveEvent(physicalgraph.zwave.commands.sceneactivationv1.SceneActivationSet cmd, result) {
  logger("$device.displayName $cmd")

  if (state.lastScene == cmd.sceneId && (state.repeatCount < 4) && (now() - state.repeatStart < 3000)) {
    logger("Button was repeated")
    state.repeatCount = state.repeatCount + 1
  } else {
    state.lastScene = cmd.sceneId
    state.lastLevel = 0
    state.repeatCount = 0
    state.repeatStart = now()

    setScene( cmd.sceneId )
  }
}

def setScene( sceneId ) {
  state.Scene = sceneId

  sendEvent(name: "Scene", value: state.Scene, isStateChange: true)
  sendEvent(name: "setScene", value: "Setting", isStateChange: true)

  if (state.buttons && state.Scene >= 1 && state.Scene <= state.buttons) {
    sendEvent(name: "switch", value: "on", type: "digital", isStateChange: true, displayed: true)
    buttonEvent("setScene", state.Scene, true)
  } else if (state.buttons && state.Scene > state.buttons && state.Scene <= state.buttons * 2) {
    sendEvent(name: "switch", value: "off", type: "digital", isStateChange: true, displayed: true)
    buttonEvent("setScene", state.Scene - state.buttons, false)
  } else {
    buttonEvent("setScene", state.Scene, true)
  }
}

def unsetScene(Boolean isPhysical) {
  if ( state.Scene ) {
    if (state.buttons && state.Scene >= 1 && state.Scene <= state.buttons) {
      if (isPhysical) {
        buttonEvent("unsetScene", state.Scene, false)
      }
      sendEvent(name: "switch", value: "off", type: isPhysical ? "physical" : "digital", isStateChange: true, displayed: true)
    } else if (device.currentValue("switch") == "on") {
      sendEvent(name: "switch", value: "off", type: isPhysical ? "physical" : "digital", isStateChange: true, displayed: true)
    }

    state.Scene = 0
    sendEvent(name: "Scene", value: state.Scene, isStateChange: true)
  } else if (device.currentValue("switch") == "on") {
    sendEvent(name: "switch", value: "off", type: isPhysical ? "physical" : "digital", isStateChange: true, displayed: true)
  }
}

def zwaveEvent(physicalgraph.zwave.commands.sceneactuatorconfv1.SceneActuatorConfGet cmd, result) {
  logger("$device.displayName $cmd")
  logger("$device.displayName lastScene: $state.lastScene")

  Short scene_id = 0

  if ( cmd.sceneId ) {
    scene_id = cmd.sceneId
  } else if ( state.sceneId ) {
    scene_id = state.sceneId
  }

  result << createEvent(name: "setScene", value: "Set", isStateChange: true, displayed: true)
  sendCommands( [ zwave.sceneActuatorConfV1.sceneActuatorConfReport(
    dimmingDuration: 0,
    level: 0xFF, 
    sceneId: scene_id
  ),
  ])
}

def zwaveEvent(physicalgraph.zwave.commands.zwavecmdclassv1.NodeInfo cmd, result) {
  logger("$device.displayName $cmd")
  result << createEvent(name: "NIF", value: "$cmd", descriptionText: "$cmd", isStateChange: true, displayed: true)
}

def zwaveEvent(physicalgraph.zwave.commands.associationv2.AssociationGroupingsReport cmd, result) {
  logger("$device.displayName $cmd")
  def cmds = []

  result << createEvent(name: "numberOfButtons", value: cmd.supportedGroupings * 2, isStateChange: true, displayed: false)

  if (cmd.supportedGroupings) {
    for (def x = 1; x <= cmd.supportedGroupings; x++) {
      cmds << zwave.associationV1.associationGet(groupingIdentifier: x).format();
    }
  }

  result << response( delayBetween(cmds, 2000) )
}

def zwaveEvent(physicalgraph.zwave.commands.remoteassociationactivatev1.RemoteAssociationActivate cmd, result) {
  logger("$device.displayName $cmd")
  updateDataValue("RemoteAssociationActivate", "${cmd.groupingIdentifier}")
}

def zwaveEvent(physicalgraph.zwave.commands.associationv2.AssociationReport cmd, result) {
  logger("$device.displayName $cmd")

  Integer[] associate =  []
  if (0) {
    associate +=  1 // Add SIS (assumption)
  }

  def string_of_assoc = ""
  cmd.nodeId.each {
    string_of_assoc += "${it}, "
  }
  def lengthMinus2 = string_of_assoc.length() ? string_of_assoc.length() - 3 : 0
  String final_string = lengthMinus2 ? string_of_assoc.getAt(0..lengthMinus2) : string_of_assoc

  state.isAssociated = true
  if (! cmd.nodeId.any { it == zwaveHubNodeId }) {
    logger("Hub is not associated", "warn")

    result << response( zwave.associationV1.associationSet(groupingIdentifier: cmd.groupingIdentifier, nodeId: zwaveHubNodeId) )
    return
  }

  def cmds = []
  for (def x = (cmd.groupingIdentifier * 2) -1; x <= cmd.groupingIdentifier * 2; x++) {
    cmds << zwave.sceneControllerConfV1.sceneControllerConfGet(groupId: x).format();
  }


  if ( associatedDevice  && ! cmd.nodeId.any { it == associatedDevice }) {
    cmds << zwave.associationV1.associationSet(groupingIdentifier: cmd.groupingIdentifier, nodeId: associatedDevice).format()
  }

  if ( cmds.size ) {
    result << response(delayBetween(cmds, 1000))
  }

  String group_association_name =  "Group #${cmd.groupingIdentifier}"
  updateDataValue("$group_association_name", "${final_string}");
}

def zwaveEvent(physicalgraph.zwave.commands.versionv1.VersionReport cmd, result) {
  logger("$device.displayName $cmd")

  def text = "$device.displayName: firmware version: ${cmd.applicationVersion}.${cmd.applicationSubVersion}, Z-Wave version: ${cmd.zWaveProtocolVersion}.${cmd.zWaveProtocolSubVersion}"
  def zWaveProtocolVersion = "${cmd.zWaveProtocolVersion}.${cmd.zWaveProtocolSubVersion}"
  state.firmwareVersion = cmd.applicationVersion+'.'+cmd.applicationSubVersion
  result << createEvent(name: "firmwareVersion", value: "V ${state.firmwareVersion}", descriptionText: "$text", isStateChange: true)
  result << createEvent(name: "zWaveProtocolVersion", value: "${zWaveProtocolVersion}", descriptionText: "${device.displayName} ${zWaveProtocolVersion}", isStateChange: true)
}

def zwaveEvent(physicalgraph.zwave.commands.powerlevelv1.PowerlevelReport cmd, result) {
  logger("zwaveEvent(): Powerlevel Report received: ${cmd}")
  String device_power_level = (cmd.powerLevel > 0) ? "minus${cmd.powerLevel}dBm" : "NormalPower"
  updateDataValue("Powerlevel Report", "Power: ${device_power_level}, Timeout: ${cmd.timeout}")
}

def zwaveEvent(physicalgraph.zwave.commands.powerlevelv1.PowerlevelTestNodeReport cmd, result) {
  logger("$device.displayName $cmd")
}

def zwaveEvent(physicalgraph.zwave.commands.manufacturerspecificv1.ManufacturerSpecificReport cmd, result) {
  logger("$device.displayName $cmd")

  def cmds = []

  String manufacturerCode = String.format("%04X", cmd.manufacturerId)
  String productTypeCode = String.format("%04X", cmd.productTypeId)
  String productCode = String.format("%04X", cmd.productId)
  String manufacturerName = cmd.manufacturerName ? cmd.manufacturerName : "Leviton"
  updateDataValue("manufacturer", manufacturerName)

  String msr = String.format("%04X-%04X-%04X", cmd.manufacturerId, cmd.productTypeId, cmd.productId)
  updateDataValue("MSR", msr)

  if (0 && ! childDevices) {
    createChildDevices(state.buttons)
  }

  if ( cmds.size ) {
    result << response(delayBetween(cmds, 1000))
  }

  result << createEvent(name: "ManufacturerCode", value: manufacturerCode)
  result << createEvent(name: "ProduceTypeCode", value: productTypeCode)
  result << createEvent(name: "ProductCode", value: productCode)

  result << response(zwave.versionV1.versionGet())
}

def zwaveEvent(physicalgraph.zwave.Command cmd, result) {
  logger("$device.displayName no implementation of $cmd", "error")
}

def zwaveEvent(physicalgraph.zwave.commands.hailv1.Hail cmd, result) {
  logger("$device.displayName command not implemented: $cmd")
  result << createEvent(name: "hail", value: "hail", descriptionText: "Switch button was pressed", displayed: false)
}

def zwaveEvent(physicalgraph.zwave.commands.networkmanagementprimaryv1.ControllerChangeStatus cmd, result) {
  logger("$device.displayName command not implemented: $cmd", "error")
}

/**
 * PING is used by Device-Watch in attempt to reach the Device
 * */
def ping() {
  logger ("$device.displayName ping()")
  delayBetween([
    zwave.manufacturerSpecificV1.manufacturerSpecificGet().format(),
  ])
}

def refresh () {
	log.debug "Refreshing..."
  logger ("$device.displayName refresh()")
  delayBetween([
    zwave.manufacturerSpecificV1.manufacturerSpecificGet().format(),
  ])
}

def poll() {
  logger ("$device.displayName poll()")
  response( delayBetween([
    zwave.manufacturerSpecificV1.manufacturerSpecificGet().format(),
  ]))
}

private void createChildDevices(Integer numberOfSwitches) {
  // Save the device label for updates by updated()
  state.oldLabel = device.label

  // Add child devices for four button presses
  for ( Integer x in 1..numberOfSwitches ) {
    def childDevice = addChildDevice(
      "smartthings",
      "Child Switch",
      "${device.deviceNetworkId}/$x",
      "",
      [
      label         : "$device.displayName Switch $x",
      completedSetup: true,
      isComponent: true,
      ]);

    childDevice.ignoreDigital()
  }
}

def prepDevice() {
  [
    zwave.powerlevelV1.powerlevelSet(powerLevel: 0, timeout: 0),
    zwave.associationV1.associationGroupingsGet(),
    zwave.manufacturerSpecificV1.manufacturerSpecificGet(),
    // zwave.remoteAssociationActivateV1.remoteAssociationActivate(groupingIdentifier:1),
    // zwave.versionV1.versionGet(),
    // zwave.associationV1.associationGet(groupingIdentifier: 0x01),
    // zwave.basicV1.basicGet(),
    zwave.zwaveCmdClassV1.requestNodeInfo(),
  ]
}

def installed() {
  log.info("$device.displayName installed()")

  sendEvent(name: "driverVersion", value: getDriverVersion(), descriptionText: getDriverVersion(), isStateChange: true, displayed: true)

  // Device-Watch simply pings if no device events received for 32min(checkInterval)
  // sendEvent(name: "checkInterval", value: 2 * 15 * 60 + 2 * 60, displayed: false, data: [protocol: "zwave", hubHardwareId: device.hub.hardwareID, offlinePingable: "1"])

  sendCommands( prepDevice(), 3000 )
}

def updated() {
  if (state.updatedDate && (Calendar.getInstance().getTimeInMillis() - state.updatedDate) < 5000 ) {
    return
  }
  log.info("$device.displayName updated() debug: ${settings.debugLevel}")

  sendEvent(name: "lastError", value: "", displayed: false)
  sendEvent(name: "logMessage", value: "", displayed: false)

  sendEvent(name: "driverVersion", value: getDriverVersion(), descriptionText: getDriverVersion(), isStateChange: true, displayed: true)

  if ( childDevices ) {
    childDevices.each { logger("${it.deviceNetworkId}") }
  }

  sendCommands( prepDevice(), 3000 )

  // Avoid calling updated() twice
  state.updatedDate = Calendar.getInstance().getTimeInMillis()
}

/*****************************************************************************************************************
 *  Private Helper Functions:
 *****************************************************************************************************************/

/**
 *  encapCommand(cmd)
 *
 *  Applies security or CRC16 encapsulation to a command as needed.
 *  Returns a physicalgraph.zwave.Command.
 **/
private encapCommand(physicalgraph.zwave.Command cmd) {
  if (state.sec) {
    return zwave.securityV1.securityMessageEncapsulation().encapsulate(cmd)
  }
  else if (state.useCrc16) {
    return zwave.crc16EncapV1.crc16Encap().encapsulate(cmd)
  }
  else {
    return cmd
  }
}

/**
 *  prepCommands(cmds, delay=200)
 *
 *  Converts a list of commands (and delays) into a HubMultiAction object, suitable for returning via parse().
 *  Uses encapCommand() to apply security or CRC16 encapsulation as needed.
 **/
private prepCommands(cmds, delay) {
  return response(delayBetween(cmds.collect{ (it instanceof physicalgraph.zwave.Command ) ? encapCommand(it).format() : it }, delay))
}

/**
 *  sendCommands(cmds, delay=200)
 *
 *  Sends a list of commands directly to the device using sendHubCommand.
 *  Uses encapCommand() to apply security or CRC16 encapsulation as needed.
 **/
private sendCommands(cmds, delay=200) {
  sendHubCommand( cmds.collect{ (it instanceof physicalgraph.zwave.Command ) ? response(encapCommand(it)) : response(it) }, delay)
}

private logger(msg, level = "trace") {
  String device_name = "$device.displayName"

  switch(level) {
    case "warn":
    if (settings.debugLevel >= 2) {
      log.warn "$device_name ${msg}"
    }
    sendEvent(name: "logMessage", value: "${msg}", displayed: false, isStateChange: true)
    break;

    case "info":
    if (settings.debugLevel >= 3) {
      log.info "$device_name ${msg}"
    }
    break;

    case "debug":
    if (settings.debugLevel >= 4) {
      log.debug "$device_name ${msg}"
    }
    break;

    case "trace":
    if (settings.debugLevel >= 5) {
      log.trace "$device_name ${msg}"
    }
    break;

    case "error":
    default:
    log.error "$device_name ${msg}"
    sendEvent(name: "lastError", value: "${msg}", displayed: false, isStateChange: true)
    break;
  }
}