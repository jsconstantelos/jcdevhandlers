/**
 *  Zigbee Valve
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
 *  Version: v1
 *
 *  Updates:
 *  -------
 *  02-18-2016 : Initial commit
 *
 */

metadata {
	// Automatically generated. Make future change here.
	definition (name: "My Zigbee Valve", namespace: "jscgs350", author: "SmartThings") {
    	capability "Alarm"
		capability "Polling"
        capability "Refresh"
        capability "Switch"
		capability "Valve"
        capability "Configuration"
	}

	// UI tile definitions
    tiles(scale: 2) {
		multiAttributeTile(name:"switch", type: "generic", width: 6, height: 4, canChangeIcon: true, decoration: "flat"){
			tileAttribute ("device.switch", key: "PRIMARY_CONTROL") {
				attributeState "on", label: 'open', action: "switch.off", icon: "st.valves.water.open", backgroundColor: "#53a7c0"
				attributeState "off", label: 'closed', action: "switch.on", icon: "st.valves.water.closed", backgroundColor: "#ff0000"
			}
        }
        standardTile("refresh", "device.switch", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
            state "default", label:'', action:"refresh.refresh", icon:"st.secondary.refresh"
        }
		standardTile("configure", "device.configure", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "configure", label:'', action:"configuration.configure", icon:"st.secondary.configure"
		}
        main (["switch"])
        details(["switch", "refresh", "configure"])
    }
}

// Parse incoming device messages to generate events
def parse(String description) {
	log.info description
	if (description?.startsWith("catchall:")) {
        def value = name == "switch" ? (description?.endsWith(" 1") ? "on" : "off") : null
		def result = createEvent(name: name, value: value)
        def msg = zigbee.parse(description)
		log.debug "Parse returned ${result?.descriptionText}"
		return result
		log.trace msg
		log.trace "data: $msg.data"
	}
	else {
		def name = description?.startsWith("on/off: ") ? "switch" : null
		def value = name == "switch" ? (description?.endsWith(" 1") ? "on" : "off") : null
		def result = createEvent(name: name, value: value)
		log.debug "Parse returned ${result?.descriptionText}"
		return result
	}
}

def on() {
	log.debug "on()"
	sendEvent(name: "switch", value: "on")
    sendEvent(name: "valve", value: "open")
	"st cmd 0x${device.deviceNetworkId} 1 6 1 {}"
}

def off() {
	log.debug "off()"
	sendEvent(name: "switch", value: "off")
    sendEvent(name: "valve", value: "closed")
	"st cmd 0x${device.deviceNetworkId} 1 6 0 {}"
}

// This is for when the the valve's ALARM capability is called
def both() {
	log.debug "Closing Main Water Valve due to an ALARM capability condition"
	sendEvent(name: "switch", value: "off")
    sendEvent(name: "valve", value: "closed")
	"st cmd 0x${device.deviceNetworkId} 1 6 0 {}"
}

// This is for when the the valve's VALVE capability is called
def open() {
	log.debug "on()"
	sendEvent(name: "switch", value: "on")
    sendEvent(name: "valve", value: "open")
	"st cmd 0x${device.deviceNetworkId} 1 6 1 {}"
}

// This is for when the the valve's VALVE capability is called
def close() {
	log.debug "off()"
	sendEvent(name: "switch", value: "off")
    sendEvent(name: "valve", value: "closed")
	"st cmd 0x${device.deviceNetworkId} 1 6 0 {}"
}

def refresh() {
	log.debug "sending refresh command"
	"st rattr 0x${device.deviceNetworkId} 1 6 0"
}

def configure() {
	log.debug "configure()"
	"zdo bind 0x${device.deviceNetworkId} 1 1 6 {${device.zigbeeId}} {}"
}