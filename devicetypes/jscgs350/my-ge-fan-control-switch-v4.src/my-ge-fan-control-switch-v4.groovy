/**
 *  A better functional Device Type for Z-Wave Smart Fan Control Switches, particularly the GE 12730.
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
 *  Version: v4
 *
 *  Updates:
 *  -------
 *  02-18-2016 : Initial commit
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *  08-14-2016 : Completely changed the code to use ST's updated DH for "dimmer switch".  Did not reimplement "adjusting" state.
 *
 */
 
metadata {
	definition (name: "My GE Fan Control Switch v4", namespace: "jscgs350", author: "jscgs350") {
		capability "Switch Level"
		capability "Actuator"
		capability "Indicator"
		capability "Switch"
		capability "Polling"
		capability "Refresh"
		capability "Sensor"

		command "lowSpeed"
		command "medSpeed"
		command "highSpeed"

		attribute "currentState", "string"
        attribute "currentSpeed", "string"
	}

	preferences {
		input "ledIndicator", "enum", title: "LED Indicator", description: "Turn LED indicator... ", required: false, options:["on": "When On", "off": "When Off", "never": "Never"], defaultValue: "off"
        section("Fan Thresholds") {
			input "lowThreshold", "number", title: "Low Threshold", range: "1..99", defaultValue: 30
			input "medThreshold", "number", title: "Medium Threshold", range: "1..99", defaultValue: 60
			input "highThreshold", "number", title: "High Threshold", range: "1..99", defaultValue: 99
		}
	}

	tiles(scale: 2) {
		multiAttributeTile(name:"switch", type: "lighting", width: 6, height: 4, canChangeIcon: true){
			tileAttribute ("device.switch", key: "PRIMARY_CONTROL") {    
				attributeState "on", action:"switch.off", label:'ON', icon:"st.Lighting.light24", backgroundColor:"#79b821", nextState:"turningOff"
				attributeState "off", action:"switch.on", label:'OFF', icon:"st.Lighting.light24", backgroundColor:"#ffffff", nextState:"turningOn"
				attributeState "turningOn", label:'TURNINGON', icon:"st.Lighting.light24", backgroundColor:"#2179b8", nextState: "turningOn"
				attributeState "turningOff", label:'TURNINGOFF', icon:"st.Lighting.light24", backgroundColor:"#2179b8", nextState: "turningOff"
			}   
            tileAttribute ("statusText", key: "SECONDARY_CONTROL") {
           		attributeState "statusText", label:'${currentValue}'
            }
		}
		standardTile("lowSpeed", "device.currentState", inactiveLabel: false, decoration: "flat", width: 2, height: 2) {
			state "LOW", label:'LOW', action: "lowSpeed", icon:"st.Home.home30"
  		}
		standardTile("medSpeed", "device.currentState", inactiveLabel: false, decoration: "flat", width: 2, height: 2) {
			state "MED", label: 'MED', action: "medSpeed", icon:"st.Home.home30"
		}
		standardTile("highSpeed", "device.currentState", inactiveLabel: false, decoration: "flat", width: 2, height: 2) {
			state "HIGH", label: 'HIGH', action: "highSpeed", icon:"st.Home.home30"
		}
		standardTile("indicator", "device.indicatorStatus", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "when off", action:"indicator.indicatorWhenOn", icon:"st.indicators.lit-when-off"
			state "when on", action:"indicator.indicatorNever", icon:"st.indicators.lit-when-on"
			state "never", action:"indicator.indicatorWhenOff", icon:"st.indicators.never-lit"
		}
		standardTile("refresh", "device.switch", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'', action:"refresh.refresh", icon:"st.secondary.refresh"
		}
        valueTile("statusText", "statusText", inactiveLabel: false, decoration: "flat", width: 6, height: 2) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}
		main(["switch"])
		details(["switch", "lowSpeed", "medSpeed", "highSpeed", "indicator", "refresh"])
	}
}

def updated(){
  switch (ledIndicator) {
        case "on":
            indicatorWhenOn()
            break
        case "off":
            indicatorWhenOff()
            break
        case "never":
            indicatorNever()
            break
        default:
            indicatorWhenOn()
            break
    }
}

def parse(String description) {
	def result = null
	if (description != "updated") {
		log.debug "parse() >> zwave.parse($description)"
		def cmd = zwave.parse(description, [0x20: 1, 0x26: 1, 0x70: 1])
		if (cmd) {
			result = zwaveEvent(cmd)
		}
	}
	if (result?.name == 'hail' && hubFirmwareLessThan("000.011.00602")) {
		result = [result, response(zwave.basicV1.basicGet())]
		log.debug "Was hailed: requesting state update"
	} else {
		log.debug "Parse returned ${result?.descriptionText}"
	}
    def statusTextmsg = ""
    statusTextmsg = "Fan speed is set to ${device.currentState('currentSpeed').value}"
    sendEvent("name":"statusText", "value":statusTextmsg)
	return result
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicReport cmd) {
	dimmerEvents(cmd)
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicSet cmd) {
	dimmerEvents(cmd)
}

def zwaveEvent(physicalgraph.zwave.commands.switchmultilevelv1.SwitchMultilevelReport cmd) {
	dimmerEvents(cmd)
}

def zwaveEvent(physicalgraph.zwave.commands.switchmultilevelv1.SwitchMultilevelSet cmd) {
	dimmerEvents(cmd)
}

private dimmerEvents(physicalgraph.zwave.Command cmd) {
	def value = (cmd.value ? "on" : "off")
	def result = [createEvent(name: "switch", value: value)]
	if (cmd.value && cmd.value <= 100) {
		result << createEvent(name: "level", value: cmd.value, unit: "%")
	}
	return result
}

def zwaveEvent(physicalgraph.zwave.commands.configurationv1.ConfigurationReport cmd) {
	log.debug "ConfigurationReport $cmd"
	def value = "when off"
	if (cmd.configurationValue[0] == 1) {value = "when on"}
	if (cmd.configurationValue[0] == 2) {value = "never"}
	createEvent([name: "indicatorStatus", value: value])
}

def zwaveEvent(physicalgraph.zwave.commands.hailv1.Hail cmd) {
	createEvent([name: "hail", value: "hail", descriptionText: "Switch button was pressed", displayed: false])
}

def zwaveEvent(physicalgraph.zwave.commands.manufacturerspecificv2.ManufacturerSpecificReport cmd) {
	log.debug "manufacturerId:   ${cmd.manufacturerId}"
	log.debug "manufacturerName: ${cmd.manufacturerName}"
	log.debug "productId:        ${cmd.productId}"
	log.debug "productTypeId:    ${cmd.productTypeId}"
	def msr = String.format("%04X-%04X-%04X", cmd.manufacturerId, cmd.productTypeId, cmd.productId)
	updateDataValue("MSR", msr)
	updateDataValue("manufacturer", cmd.manufacturerName)
	createEvent([descriptionText: "$device.displayName MSR: $msr", isStateChange: false])
}

def zwaveEvent(physicalgraph.zwave.commands.switchmultilevelv1.SwitchMultilevelStopLevelChange cmd) {
	[createEvent(name:"switch", value:"on"), response(zwave.switchMultilevelV1.switchMultilevelGet().format())]
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
	// Handles all Z-Wave commands we aren't interested in
	[:]
}

def on() {
	sendEvent(name: "switch", value: "on", isStateChange: true)
	delayBetween([
			zwave.basicV1.basicSet(value: 0xFF).format(),
			zwave.switchMultilevelV1.switchMultilevelGet().format()
	],5000)
}

def off() {
	sendEvent(name: "switch", value: "off", isStateChange: true)
	delayBetween([
			zwave.basicV1.basicSet(value: 0x00).format(),
			zwave.switchMultilevelV1.switchMultilevelGet().format()
	],5000)
}

def setLevel(value) {
	log.debug "setLevel >> value: $value"
	def valueaux = value as Integer
	def level = Math.max(Math.min(valueaux, 99), 0)
	if (level > 0) {
		sendEvent(name: "switch", value: "on", isStateChange: true)
	} else {
		sendEvent(name: "switch", value: "off", isStateChange: true)
	}
	delayBetween ([zwave.basicV1.basicSet(value: level).format(), zwave.switchMultilevelV1.switchMultilevelGet().format()], 5000)
}

def setLevel(value, duration) {
	log.debug "setLevel >> value: $value, duration: $duration"
	def valueaux = value as Integer
	def level = Math.max(Math.min(valueaux, 99), 0)
	def dimmingDuration = duration < 128 ? duration : 128 + Math.round(duration / 60)
	def getStatusDelay = duration < 128 ? (duration*1000)+2000 : (Math.round(duration / 60)*60*1000)+2000
	delayBetween ([zwave.switchMultilevelV2.switchMultilevelSet(value: level, dimmingDuration: dimmingDuration).format(),
				   zwave.switchMultilevelV1.switchMultilevelGet().format()], getStatusDelay)
}

def lowSpeed() {
	sendEvent(name: "currentSpeed", value: "LOW" as String)
    sendEvent(name: "currentState", value: "LOW" as String)
	def lowThresholdvalue = (settings.lowThreshold != null && settings.lowThreshold != "") ? settings.lowThreshold.toString() : "33"
	setLevel(lowThresholdvalue)
}

def medSpeed() {
	sendEvent(name: "currentSpeed", value: "MEDIUM" as String)
    sendEvent(name: "currentState", value: "MED" as String)
	def medThresholdvalue = (settings.medThreshold != null && settings.medThreshold != "") ? settings.medThreshold.toString()  : "67"
	setLevel(medThresholdvalue)
}

def highSpeed() {
	sendEvent(name: "currentSpeed", value: "HIGH" as String)
    sendEvent(name: "currentState", value: "HIGH" as String)
	def highThresholdvalue = (settings.highThreshold != null && settings.highThreshold != "") ? settings.highThreshold.toString() : "99"
	setLevel(highThresholdvalue)
}

def poll() {
	zwave.switchMultilevelV1.switchMultilevelGet().format()
}

def refresh() {
	log.debug "refresh() is called"
	def commands = []
	commands << zwave.switchMultilevelV1.switchMultilevelGet().format()
	if (getDataValue("MSR") == null) {
		commands << zwave.manufacturerSpecificV1.manufacturerSpecificGet().format()
	}
	delayBetween(commands,100)
}

void indicatorWhenOn() {
	sendEvent(name: "indicatorStatus", value: "when on", display: false)
	sendHubCommand(new physicalgraph.device.HubAction(zwave.configurationV1.configurationSet(configurationValue: [1], parameterNumber: 3, size: 1).format()))
}

void indicatorWhenOff() {
	sendEvent(name: "indicatorStatus", value: "when off", display: false)
	sendHubCommand(new physicalgraph.device.HubAction(zwave.configurationV1.configurationSet(configurationValue: [0], parameterNumber: 3, size: 1).format()))
}

void indicatorNever() {
	sendEvent(name: "indicatorStatus", value: "never", display: false)
	sendHubCommand(new physicalgraph.device.HubAction(zwave.configurationV1.configurationSet(configurationValue: [2], parameterNumber: 3, size: 1).format()))
}

def invertSwitch(invert=true) {
	if (invert) {
		zwave.configurationV1.configurationSet(configurationValue: [1], parameterNumber: 4, size: 1).format()
	}
	else {
		zwave.configurationV1.configurationSet(configurationValue: [0], parameterNumber: 4, size: 1).format()
	}
}