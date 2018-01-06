/**
 *  Leak Gopher Valve Controller
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
 *  Updates:
 *  -------
 *  01-05-2018 : Initial commit
 *
 */
metadata {
    // Automatically generated. Make future change here.
    definition (name: "My Leak Gopher Valve Controller", namespace: "jscgs350", author: "jscgs350") {
		capability "Alarm"
		capability "Polling"
        capability "Refresh"
        capability "Switch"
		capability "Valve"
        capability "Contact Sensor"
        capability "Configuration"
        capability "Actuator"
        capability "Sensor"
        capability "Health Check"
        
        fingerprint mfr:"0173", prod:"0003", model:"0002", deviceJoinName: "Leak Intelligence Leak Gopher Water Shutoff Valve"
}

	// tile definitions
	tiles(scale: 2) {
		multiAttributeTile(name:"valve", type: "generic", width: 6, height: 4, canChangeIcon: true){
			tileAttribute ("device.valve", key: "PRIMARY_CONTROL") {
				attributeState "open", label: '${name}', action: "valve.close", icon: "st.valves.water.open", backgroundColor: "#51afdb", nextState:"closing"
				attributeState "closed", label: '${name}', action: "valve.open", icon: "st.valves.water.closed", backgroundColor: "#ff0000", nextState:"opening"
				attributeState "opening", label: '${name}', action: "valve.close", icon: "st.valves.water.open", backgroundColor: "#f0b823"
				attributeState "closing", label: '${name}', action: "valve.open", icon: "st.valves.water.closed", backgroundColor: "#f0b823"
			}
		}

		standardTile("refresh", "device.valve", width: 6, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'', action:"refresh.refresh", icon:"st.secondary.refresh"
		}

		main "valve"
		details(["valve","refresh"])
	}

}

def installed() {
	// Device-Watch simply pings if no device events received for 32min(checkInterval)
	sendEvent(name: "checkInterval", value: 2 * 15 * 60 + 2 * 60, displayed: false, data: [protocol: "zwave", hubHardwareId: device.hub.hardwareID, offlinePingable: "1"])
	response(refresh())
}

def updated() {
	// Device-Watch simply pings if no device events received for 32min(checkInterval)
	sendEvent(name: "checkInterval", value: 2 * 15 * 60 + 2 * 60, displayed: false, data: [protocol: "zwave", hubHardwareId: device.hub.hardwareID, offlinePingable: "1"])
	response(refresh())
}

def parse(String description) {
	log.trace "parse description : $description"
	def cmd = zwave.parse(description, [0x20: 1])
	if (cmd) {
		return zwaveEvent(cmd)
	}
	log.debug "Could not parse message"
	return null
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicReport cmd) {
	def value = cmd.value == 0xFF ?  "open" : cmd.value == 0x00 ? "closed" : "unknown"

	return [createEventWithDebug([name: "contact", value: value, descriptionText: "$device.displayName valve is $value"]),
			createEventWithDebug([name: "valve", value: value, descriptionText: "$device.displayName valve is $value"])]
}

def zwaveEvent(physicalgraph.zwave.commands.manufacturerspecificv2.ManufacturerSpecificReport cmd) {   //TODO should show MSR when device is discovered
    log.debug "manufacturerId:   ${cmd.manufacturerId}"
    log.debug "manufacturerName: ${cmd.manufacturerName}"
    log.debug "productId:        ${cmd.productId}"
    log.debug "productTypeId:    ${cmd.productTypeId}"
    def msr = String.format("%04X-%04X-%04X", cmd.manufacturerId, cmd.productTypeId, cmd.productId)
    updateDataValue("MSR", msr)
    return createEventWithDebug([descriptionText: "$device.displayName MSR: $msr", isStateChange: false])
}

def zwaveEvent(physicalgraph.zwave.commands.deviceresetlocallyv1.DeviceResetLocallyNotification cmd) {
    return createEventWithDebug([descriptionText: cmd.toString(), isStateChange: true, displayed: true])
}

def zwaveEvent(physicalgraph.zwave.commands.switchbinaryv1.SwitchBinaryReport cmd) {
	def value = cmd.value == 0xFF ?  "open" : cmd.value == 0x00 ? "closed" : "unknown"

	return [createEventWithDebug([name: "contact", value: value, descriptionText: "$device.displayName valve is $value"]),
			createEventWithDebug([name: "valve", value: value, descriptionText: "$device.displayName valve is $value"])]
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
	return createEvent([:]) // Handles all Z-Wave commands we aren't interested in
}

def on() {
	delayBetween([
        zwave.basicV1.basicSet(value: 0xFF).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

def off() {
	delayBetween([
        zwave.basicV1.basicSet(value: 0x00).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

// This is for when the the valve's ALARM capability is called
def both() {
	log.debug "Closing valve due to an ALARM capability condition"
	delayBetween([
        zwave.basicV1.basicSet(value: 0xFF).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

def open() {
    delayBetween([
            zwave.basicV1.basicSet(value: 0xFF).format(),
            zwave.switchBinaryV1.switchBinaryGet().format()
    ],10000) //wait for a water valve to be completely opened
}

def close() {
    delayBetween([
            zwave.basicV1.basicSet(value: 0x00).format(),
            zwave.switchBinaryV1.switchBinaryGet().format()
    ],10000) //wait for a water valve to be completely closed
}

def poll() {
    zwave.switchBinaryV1.switchBinaryGet().format()
}

/**
 * PING is used by Device-Watch in attempt to reach the Device
 * */
def ping() {
	refresh()
}

def refresh() {
    log.debug "refresh() is called"
    def commands = [zwave.switchBinaryV1.switchBinaryGet().format()]
    if (getDataValue("MSR") == null) {
        commands << zwave.manufacturerSpecificV1.manufacturerSpecificGet().format()
    }
    delayBetween(commands,100)
}

def createEventWithDebug(eventMap) {
	def event = createEvent(eventMap)
	log.debug "Event created with ${event?.descriptionText}"
	return event
}