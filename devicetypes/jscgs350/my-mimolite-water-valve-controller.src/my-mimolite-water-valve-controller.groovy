/**
 *  MIMOlite Water Valve Controller
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
 *  02-18-2016 : Initial commit
 *  03-05-2016 : Changed date format to MM-dd-yyyy h:mm a
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *  07-11-2016 : Added Actuator capability so that the water meter smartapp can see the valve.
 *  08-27-2016 : Modified the device handler for my liking, primarly for looks and feel.
 *  01-08/2017 : Added code for Health Check capabilities/functions. 
 *  02-11-2017 : Cleaned up code, and used secondary_control again for messages.
 *  03-11-2017 : Changed from valueTile to standardTile for a few tiles since ST's mobile app v2.3.x changed something between the two.
 *  04-08-2017 : Updated the updated() section to call configuration().
 *  05-18-2017 : Changed the main tile to be contact instead of switch primarily due to personal functionality preference and not accidentally actuating the valve while in the Room view.
 *  09-23-2017 : Changed layout to look like my Zooz DTH, cleaned up code a lot.
 *
 */
metadata {
    // Automatically generated. Make future change here.
    definition (name: "My MIMOlite Water Valve Controller", namespace: "jscgs350", author: "jscgs350") {
		capability "Alarm"
		capability "Polling"
        capability "Refresh"
        capability "Switch"
		capability "Valve"
        capability "Contact Sensor"
        capability "Configuration"
        capability "Actuator"
        capability "Health Check"
        
        attribute "powered", "string"
        attribute "valveState", "string"
        
        command "refreshHistory"
        
}

    // UI tile definitions
	tiles(scale: 2) {
		multiAttributeTile(name:"switch", type: "generic", width: 6, height: 4, canChangeIcon: true, decoration: "flat"){
			tileAttribute ("device.switch", key: "PRIMARY_CONTROL") {
				attributeState "on", label: 'Closed', action: "switch.off", icon: "st.valves.water.closed", backgroundColor: "#ff0000", nextState:"openingvalve"
				attributeState "off", label: 'Open', action: "switch.on", icon: "st.valves.water.open", backgroundColor: "#53a7c0", nextState:"closingvalve"
				attributeState "closingvalve", label:'Closing', icon:"st.valves.water.closed", backgroundColor:"#f0b823"
				attributeState "openingvalve", label:'Opening', icon:"st.valves.water.open", backgroundColor:"#f0b823"
			}
            tileAttribute ("device.valveState", key: "SECONDARY_CONTROL") {
                attributeState("default", label:'${currentValue}', icon: "https://raw.githubusercontent.com/constjs/jcdevhandlers/master/img/watervalve1.png")
            }
        }
        standardTile("contact", "device.contact", width: 3, height: 2, inactiveLabel: false) {
            state "open", label: 'Open', icon: "st.valves.water.open", backgroundColor: "#53a7c0"
            state "closed", label: 'Closed', icon: "st.valves.water.closed", backgroundColor: "#ff0000"
        }
        standardTile("powered", "device.powered", width: 2, height: 2, inactiveLabel: false) {
			state "powerOn", label: "Power On", icon: "st.switches.switch.on", backgroundColor: "#79b821"
			state "powerOff", label: "Power Off", icon: "st.switches.switch.off", backgroundColor: "#ffa81e"
		}
        standardTile("refresh", "device.switch", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state "default", label:'Refresh', action:"refresh.refresh", icon:"st.secondary.refresh-icon"
        }
		standardTile("configure", "device.configure", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "configure", label:'', action:"configuration.configure", icon:"st.secondary.configure"
		}
        standardTile("blankTile", "statusText", inactiveLabel: false, decoration: "flat", width: 1, height: 1) {
			state "default", label:'', icon:"http://cdn.device-icons.smartthings.com/secondary/device-activity-tile@2x.png"
		}         
        standardTile("statusText", "statusText", inactiveLabel: false, decoration: "flat", width: 5, height: 1) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}
		standardTile("history", "device.history", decoration:"flat",width: 6, height: 2) {
			state "history", label:'${currentValue}', action: "refreshHistory"
		}
        main (["contact"])
        details(["switch", "history", "powered", "refresh", "configure"])
    }
}

def updated(){
	// Device-Watch simply pings if no device events received for 32min(checkInterval)
	sendEvent(name: "checkInterval", value: 2 * 15 * 60 + 2 * 60, displayed: false, data: [protocol: "zwave", hubHardwareId: device.hub.hardwareID])
    response(configure())
}

def parse(String description) {
    def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    def result = null
    def cmd = zwave.parse(description, [0x72: 1, 0x86: 1, 0x71: 1, 0x30: 1, 0x31: 3, 0x35: 1, 0x70: 1, 0x85: 1, 0x25: 1, 0x03: 1, 0x20: 1, 0x84: 1])
	log.debug cmd
    if (cmd.CMD == "7105") {				//Mimo sent a power loss report
    	log.debug "Device lost power"
    	sendEvent(name: "powered", value: "powerOff", descriptionText: "$device.displayName lost power")
    } else {
    	sendEvent(name: "powered", value: "powerOn", descriptionText: "$device.displayName regained power")
    }

	if (cmd) {
        result = createEvent(zwaveEvent(cmd))
    }
    
    def statusTextmsg = ""
    statusTextmsg = "Last refreshed at "+timeString+"."
    sendEvent(name:"statusText", value:statusTextmsg)

    return result
}

def sensorValueEvent(Short value) {
    if (value) {
		log.debug "Main Water Valve is Open"
		sendEvent(name: "contact", value: "open", descriptionText: "$device.displayName is open")
        sendEvent(name: "valveState", value: "Valve is flowing water (tap to close)")
    } else {
    	log.debug "Main Water Valve is Closed"
        sendEvent(name: "contact", value: "closed", descriptionText: "$device.displayName is closed")
        sendEvent(name: "valveState", value: "Valve is NOT flowing water (tap to open)")
    }
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicReport cmd) {
    [name: "switch", value: cmd.value ? "on" : "off", type: "physical"]
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicSet cmd)
{
    sensorValueEvent(cmd.value)
}

def zwaveEvent(physicalgraph.zwave.commands.switchbinaryv1.SwitchBinaryReport cmd) {
    [name: "switch", value: cmd.value ? "on" : "off", type: "digital"]
}

def zwaveEvent(physicalgraph.zwave.commands.sensorbinaryv1.SensorBinaryReport cmd)
{
    sensorValueEvent(cmd.sensorValue)
}

def zwaveEvent(physicalgraph.zwave.commands.alarmv1.AlarmReport cmd)
{
    log.debug "We lost power" //we caught this up in the parse method. This method not used.
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
    // Handles all Z-Wave commands we aren't interested in
    [:]
}

def on() {
	log.debug "Closing Main Water Valve per user request"
	delayBetween([
        zwave.basicV1.basicSet(value: 0xFF).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

def off() {
	log.debug "Opening Main Water Valve per user request"
	delayBetween([
        zwave.basicV1.basicSet(value: 0x00).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

// This is for when the the valve's ALARM capability is called
def both() {
	log.debug "Closing Main Water Valve due to an ALARM capability condition"
	delayBetween([
        zwave.basicV1.basicSet(value: 0xFF).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

// This is for when the the valve's VALVE capability is called
def close() {
	log.debug "Closing Main Water Valve due to a VALVE capability condition"
	delayBetween([
        zwave.basicV1.basicSet(value: 0xFF).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

// This is for when the the valve's VALVE capability is called
def open() {
	log.debug "Opening Main Water Valve due to a VALVE capability condition"
	delayBetween([
        zwave.basicV1.basicSet(value: 0x00).format(),
        zwave.switchBinaryV1.switchBinaryGet().format()
    ])
}

def poll() {
	log.debug "Executing Poll for Main Water Valve"
	delayBetween([
		zwave.switchBinaryV1.switchBinaryGet().format(),
		zwave.sensorBinaryV1.sensorBinaryGet().format(),
        zwave.basicV1.basicGet().format(),
		zwave.alarmV1.alarmGet().format() 
	],100)
    response(refreshHistory())
}

// PING is used by Device-Watch in attempt to reach the Device
def ping() {
	refresh()
}

def refresh() {
	log.debug "Executing Refresh for Main Water Valve per user request"
	delayBetween([
		zwave.switchBinaryV1.switchBinaryGet().format(),
		zwave.sensorBinaryV1.sensorBinaryGet().format(),
        zwave.basicV1.basicGet().format(),
		zwave.alarmV1.alarmGet().format() 
	],100)
    response(refreshHistory())
}

def refreshHistory() {
	def historyDisp = ""
    historyDisp = "Important Device Messages\n-------------------------------------------------------------------\n${device.currentState('statusText')?.value}"
    sendEvent(name: "history", value: historyDisp, displayed: false)
}

def configure() {
	log.debug "Executing Configure for Main Water Valve per user request"
	def cmd = delayBetween([
		zwave.associationV1.associationSet(groupingIdentifier:3, nodeId:[zwaveHubNodeId]).format(), //subscribe to power alarm
        zwave.configurationV1.configurationSet(parameterNumber: 11, configurationValue: [0], size: 1).format() // momentary relay disable=0 (default)
	],100)
    log.debug "zwaveEvent ConfigurationReport: '${cmd}'"
}