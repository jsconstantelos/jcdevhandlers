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
 *  Version: v3
 *
 *  Updates:
 *  -------
 *  02-18-2016 : Initial commit
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *  08-14-2016 : Using SECONDARY_CONTROL again.
 *
 */
 
metadata {
	
	definition (name: "My GE Fan Control Switch", namespace: "jscgs350", author: "SmartThings") {
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

		//fingerprint inClusters: "0x26"
	}
	tiles (scale:2) {
		multiAttributeTile(name: "switch", type: "lighting", width: 6, height: 4, canChangeIcon: true) {
			tileAttribute ("device.currentState", key: "PRIMARY_CONTROL") {
				attributeState "default", label:'${currentValue}', action:"switch.off", icon:"st.Lighting.light24", backgroundColor:"#2179b8", nextState: "turningOff"
				attributeState "HIGH", label:'HIGH', action:"switch.off", icon:"st.Lighting.light24", backgroundColor:"#486e13", nextState: "turningOff"
				attributeState "MED", label:'MED', action:"switch.off", icon:"st.Lighting.light24", backgroundColor:"#60931a", nextState: "turningOff"
				attributeState "LOW", label:'LOW', action:"switch.off", icon:"st.Lighting.light24", backgroundColor:"#79b821", nextState: "turningOff"
				attributeState "OFF", label:'OFF', action:"switch.on", icon:"st.Lighting.light24", backgroundColor:"#ffffff", nextState: "turningOn"
				attributeState "turningOn", action:"switch.on", label:'TURNINGON', icon:"st.Lighting.light24", backgroundColor:"#2179b8", nextState: "turningOn"
				attributeState "turningOff", action:"switch.off", label:'TURNINGOFF', icon:"st.Lighting.light24", backgroundColor:"#2179b8", nextState: "turningOff"
				attributeState "changingState", action:"refresh.refresh", label:'ADJUSTING', icon:"st.Lighting.light24", backgroundColor:"#2179b8"
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
		standardTile("refresh", "device.switch", inactiveLabel: false, decoration: "flat", width: 3, height: 2) {
			state "default", label:"", action:"refresh.refresh", icon:"st.secondary.refresh"
		}
		standardTile("indicator", "device.indicatorStatus", inactiveLabel: false, decoration: "flat", width: 3, height: 2) {
			state "when off", action:"indicator.indicatorWhenOn", icon:"st.indicators.lit-when-off"
			state "when on", action:"indicator.indicatorNever", icon:"st.indicators.lit-when-on"
			state "never", action:"indicator.indicatorWhenOff", icon:"st.indicators.never-lit"
		}
        valueTile("statusText", "statusText", inactiveLabel: false, decoration: "flat", width: 6, height: 2) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}
		main(["switch"])
		details(["switch", "lowSpeed", "medSpeed", "highSpeed", "indicator", "refresh"])
	}
	preferences {
		section("Fan Thresholds") {
			input "lowThreshold", "number", title: "Low Threshold", range: "1..99"
			input "medThreshold", "number", title: "Medium Threshold", range: "1..99"
			input "highThreshold", "number", title: "High Threshold", range: "1..99"
		}
	}
}

def parse(String description) {
	def item1 = [
		canBeCurrentState: false,
		linkText: getLinkText(device),
		isStateChange: false,
		displayed: false,
		descriptionText: description,
		value:  description
	]
	def result
	def cmd = zwave.parse(description, [0x20: 1, 0x26: 1, 0x70: 1])
	if (cmd) {
		result = createEvent(cmd, item1)
	}
	else {
		item1.displayed = displayed(description, item1.isStateChange)
		result = [item1]
	}
	log.debug "Parse returned ${result?.descriptionText}"
    def statusTextmsg = ""
    statusTextmsg = "Fan speed is set to ${device.currentState('currentSpeed').value}"
    sendEvent("name":"statusText", "value":statusTextmsg)
	result
}

def createEvent(physicalgraph.zwave.commands.basicv1.BasicReport cmd, Map item1) {
	def result = doCreateEvent(cmd, item1)
	for (int i = 0; i < result.size(); i++) {
  	result[i].type = "physical"
	}
	log.trace "BasicReport"
  result
}

def createEvent(physicalgraph.zwave.commands.basicv1.BasicSet cmd, Map item1) {
	def result = doCreateEvent(cmd, item1)
	for (int i = 0; i < result.size(); i++) {
		result[i].type = "physical"
	}
	log.trace "BasicSet"
	result
}

def createEvent(physicalgraph.zwave.commands.switchmultilevelv1.SwitchMultilevelStartLevelChange cmd, Map item1) {
	[]
	log.trace "StartLevel"
}

def createEvent(physicalgraph.zwave.commands.switchmultilevelv1.SwitchMultilevelStopLevelChange cmd, Map item1) {
	[response(zwave.basicV1.basicGet())]
}

def createEvent(physicalgraph.zwave.commands.switchmultilevelv1.SwitchMultilevelSet cmd, Map item1) {
	def result = doCreateEvent(cmd, item1)
	for (int i = 0; i < result.size(); i++) {
		result[i].type = "physical"
	}
	log.trace "SwitchMultiLevelSet"
	result
}

def createEvent(physicalgraph.zwave.commands.switchmultilevelv1.SwitchMultilevelReport cmd, Map item1) {
	def result = doCreateEvent(cmd, item1)
	result[0].descriptionText = "${item1.linkText} is ${item1.value}"
	result[0].handlerName = cmd.value ? "statusOn" : "statusOff"
	for (int i = 0; i < result.size(); i++) {
		result[i].type = "digital"
	}
	log.trace "SwitchMultilevelReport"
	result
}

def doCreateEvent(physicalgraph.zwave.Command cmd, Map item1) {
	def result = [item1]
	def lowThresholdvalue = (settings.lowThreshold != null && settings.lowThreshold != "") ? settings.lowThreshold.toString() : "30"
	def medThresholdvalue = (settings.medThreshold != null && settings.medThreshold != "") ? settings.medThreshold.toString() : "62"
	def highThresholdvalue = (settings.highThreshold != null && settings.highThreshold != "") ? settings.highThreshold.toString() : "99"

	item1.name = "switch"
	item1.value = cmd.value ? "on" : "off"
	if (item1.value == "off") {
		sendEvent(name: "currentState", value: "OFF" as String, isStateChange: true)
        sendEvent(name: "switch", value: "off" as String, isStateChange: true)
	}
	item1.handlerName = item1.value
	item1.descriptionText = "${item1.linkText} was turned ${item1.value}"
	item1.canBeCurrentState = true
	item1.isStateChange = isStateChange(device, item1.name, item1.value)
	item1.displayed = false

	if (cmd.value) {
		def item2 = new LinkedHashMap(item1)
		item2.name = "level"
		item2.value = cmd.value as String
		item2.unit = "%"
		item2.descriptionText = "${item1.linkText} dimmed ${item2.value} %"
		item2.canBeCurrentState = true
		item2.isStateChange = isStateChange(device, item2.name, item2.value)
		item2.displayed = false

		if (item2.value <= lowThresholdvalue) {
			sendEvent(name: "currentState", value: "LOW" as String, isStateChange: true)
            sendEvent(name: "currentSpeed", value: "LOW" as String)
		}
		if (item2.value >= lowThresholdvalue+1 && item2.value <= medThresholdvalue) {
			sendEvent(name: "currentState", value: "MED" as String, isStateChange: true)
            sendEvent(name: "currentSpeed", value: "MED" as String)
	 	}
		if (item2.value >= medThresholdvalue+1) {
			sendEvent(name: "currentState", value: "HIGH" as String, isStateChange: true)
            sendEvent(name: "currentSpeed", value: "HIGH" as String)
		}

		result << item2
	}
	log.trace "doCreateEvent"
	result
}

def zwaveEvent(physicalgraph.zwave.commands.configurationv1.ConfigurationReport cmd) {
	def value = "when off"
	log.trace "ConfigurationReport"
	if (cmd.configurationValue[0] == 1) {value = "when on"}
	if (cmd.configurationValue[0] == 2) {value = "never"}
	[name: "indicatorStatus", value: value, display: false]
}

def createEvent(physicalgraph.zwave.Command cmd,  Map map) {
	// Handles any Z-Wave commands we aren't interested in
	log.debug "UNHANDLED COMMAND $cmd"
}

def on() {
	log.info "on"
	delayBetween([zwave.basicV1.basicSet(value: 0xFF).format(), zwave.switchMultilevelV1.switchMultilevelGet().format()], 1000)
}

def off() {
	log.info "off"
	delayBetween ([zwave.basicV1.basicSet(value: 0x00).format(), zwave.switchMultilevelV1.switchMultilevelGet().format()], 1000)
    sendEvent(name: "currentState", value: "OFF" as String, isStateChange: true)
    sendEvent(name: "switch", value: "off" as String, isStateChange: true)
}

def setLevel(value) {
	sendEvent(name: "currentState", value: "changingState" as String, displayed: false)
	def level = Math.min(value as Integer, 99)
	log.trace "setLevel(value): ${level}"
	delayBetween ([zwave.basicV1.basicSet(value: level as Integer).format(), zwave.switchMultilevelV1.switchMultilevelGet().format()], 1000)
}

def setLevel(value, duration) {
	sendEvent(name: "currentState", value: "changingState" as String, displayed: false)
	def level = Math.min(value as Integer, 99)
	def dimmingDuration = duration < 128 ? duration : 128 + Math.round(duration / 60)
	zwave.switchMultilevelV2.switchMultilevelSet(value: level, dimmingDuration: dimmingDuration).format()
}

def lowSpeed() {
	def lowThresholdvalue = (settings.lowThreshold != null && settings.lowThreshold != "") ? settings.lowThreshold.toString() : "33"
	setLevel(lowThresholdvalue)
}

def medSpeed() {
	def medThresholdvalue = (settings.medThreshold != null && settings.medThreshold != "") ? settings.medThreshold.toString()  : "67"
	setLevel(medThresholdvalue)
}

def highSpeed() {
	def highThresholdvalue = (settings.highThreshold != null && settings.highThreshold != "") ? settings.highThreshold.toString() : "99"
	setLevel(highThresholdvalue)
}

def poll() {
	zwave.switchMultilevelV1.switchMultilevelGet().format()
}

def refresh() {
	zwave.switchMultilevelV1.switchMultilevelGet().format()
}

def indicatorWhenOn() {
	sendEvent(name: "indicatorStatus", value: "when on", display: false)
	zwave.configurationV1.configurationSet(configurationValue: [1], parameterNumber: 3, size: 1).format()
}

def indicatorWhenOff() {
	sendEvent(name: "indicatorStatus", value: "when off", display: false)
	zwave.configurationV1.configurationSet(configurationValue: [0], parameterNumber: 3, size: 1).format()
}

def indicatorNever() {
	sendEvent(name: "indicatorStatus", value: "never", display: false)
	zwave.configurationV1.configurationSet(configurationValue: [2], parameterNumber: 3, size: 1).format()
}