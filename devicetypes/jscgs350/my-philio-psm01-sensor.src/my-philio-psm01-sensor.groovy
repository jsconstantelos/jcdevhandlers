/*
 *  Philio PSM01 3-in-1 Multi Sensor Device Type
 *  based on SmartThings' Aeon Multi Sensor Reference Device Type
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
 *  Version: v2.1
 *
 *  Updates:
 *  -------
 *  02-18-2016 : Initial commit
 *  03-04-2016 : Changed multiAttributeTile type to generic to remove secondary_control data from showing up since other tiles already show those values.
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *  04-05-2016 : Added fingerprint for the PSM01
 *
 */ 
 metadata {


	definition (name: "My Philio PSM01 Sensor", namespace: "jscgs350", author: "SmartThings") {
		capability "Contact Sensor"
		capability "Temperature Measurement"
		capability "Illuminance Measurement"
		capability "Configuration"
		capability "Sensor"
		capability "Battery"
        capability "Refresh"
		capability "Polling"

		fingerprint deviceId: "0x2001", inClusters: "0x30,0x31,0x80,0x84,0x70,0x85,0x72,0x86"

	}

	tiles(scale: 2) {
		multiAttributeTile(name:"contact", type: "generic", width: 6, height: 4){
			tileAttribute ("device.contact", key: "PRIMARY_CONTROL") {
				attributeState "closed", label: 'Closed', icon: "st.contact.contact.closed", backgroundColor: "#79b821"
				attributeState "open", label: 'Open', icon: "st.contact.contact.open", backgroundColor: "#ffa81e"
			}
//            tileAttribute ("statusText", key: "SECONDARY_CONTROL") {
//           		attributeState "statusText", label:'${currentValue}'       		
//            }
		}
		valueTile("temperature", "device.temperature", width: 3, height: 2, inactiveLabel: false) {
			state "temperature", icon:"st.tesla.tesla-hvac", label:'${currentValue}°',
			backgroundColors:[
				[value: 31, color: "#153591"],
				[value: 44, color: "#1e9cbb"],
				[value: 59, color: "#90d2a7"],
				[value: 74, color: "#44b621"],
				[value: 84, color: "#f1d801"],
				[value: 95, color: "#d04e00"],
				[value: 96, color: "#bc2323"]
			]
		}

		valueTile("illuminance", "device.illuminance", width: 3, height: 2, inactiveLabel: false) {
			state "luminosity", label:'${currentValue} ${unit}', unit:"lux"
		}
        
		valueTile("battery", "device.battery", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "battery", label:'${currentValue}% battery', unit:""
		}
        
		standardTile("configure", "device.configure", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "configure", label:'', action:"configuration.configure", icon:"st.secondary.configure"
		}

		standardTile("refresh", "device.refresh", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", action:"polling.poll", icon:"st.secondary.refresh"
		}

        valueTile("statusText", "statusText", inactiveLabel: false, width: 2, height: 2) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}

		main(["contact", "temperature", "illuminance"])
		details(["contact", "temperature", "illuminance", "battery", "configure", "refresh"])
		}

		preferences {
			input description: "This feature allows you to correct any temperature variations by selecting an offset. Ex: If your sensor consistently reports a temp that's 5 degrees too warm, you'd enter \"-5\". If 3 degrees too cold, enter \"+3\".", displayDuringSetup: false, type: "paragraph", element: "paragraph"
			input "tempOffset", "number", title: "Temperature Offset", description: "Adjust temperature by this many degrees", range: "*..*", displayDuringSetup: false
		}

}

preferences {
}

def installed() {
	log.debug "PSM01: Installed with settings: ${settings}"
	configure()
}

def updated() {
	log.debug "PSM01: Updated with settings: ${settings}"
    configure()

}

// parse() with a Map argument is called after a sendEvent(device)
// In this case, we are receiving an event from the PSM01 Helper App to generate a "inactive" event
def parse(Map evt){
//	log.debug "Parse(Map) called with map ${evt}"
    def result = [];
    if (evt)
    	result << evt;
//    log.debug "Parse(Map) returned ${result}"

    return result
}

// Parse incoming device messages to generate events
def parse(String description)
{
//    log.debug "Parse called with ${description}"
	def result = []
	def cmd = zwave.parse(description, [0x20: 1, 0x31: 2, 0x30: 2, 0x80: 1, 0x84: 2, 0x85: 2])
	if (cmd) {
		if( cmd.CMD == "8407" ) { result << new physicalgraph.device.HubAction(zwave.wakeUpV1.wakeUpNoMoreInformation().format()) }
		def evt = zwaveEvent(cmd)
        result << createEvent(evt)
	}

	def statusTextmsg = ""
    statusTextmsg = "Door is ${device.currentState('contact').value}, temp is ${device.currentState('temperature').value}°, and illuminance is ${device.currentState('illuminance').value} LUX."
    sendEvent("name":"statusText", "value":statusTextmsg)
    log.debug statusTextmsg

	log.debug "Parse returned ${result}"
	return result
}

// Event Generation
def zwaveEvent(physicalgraph.zwave.commands.wakeupv1.WakeUpNotification cmd)
{
	[descriptionText: "${device.displayName} woke up", isStateChange: false]
}

def zwaveEvent(physicalgraph.zwave.commands.sensormultilevelv2.SensorMultilevelReport cmd)
{
	def map = [:]
	switch (cmd.sensorType) {
		case 1:
			// temperature
			def cmdScale = cmd.scale == 1 ? "F" : "C"
			map.value = convertTemperatureIfNeeded(cmd.scaledSensorValue, cmdScale, cmd.precision)
			map.unit = getTemperatureScale()
			map.name = "temperature"
            if (tempOffset) {
				def offset = tempOffset as int
				def v = map.value as int
				map.value = v + offset
			}
            log.debug "Adjusted temp value ${map.value}"
			break;
		case 3:
			// luminance
			map.value = cmd.scaledSensorValue.toInteger().toString()
			map.unit = "lux"
			map.name = "illuminance"
			break;
	}
	map
}

def zwaveEvent(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
	def map = [:]
	map.name = "battery"
	map.value = cmd.batteryLevel > 0 ? cmd.batteryLevel.toString() : 1
	map.unit = "%"
	map.displayed = false
	map
}

def zwaveEvent(physicalgraph.zwave.commands.sensorbinaryv2.SensorBinaryReport cmd) {
    log.debug "PSM01: SensorBinaryReport ${cmd.toString()}}"
    def map = [:]
    switch (cmd.sensorType) {
        case 10: // contact sensor
            map.name = "contact"
            if (cmd.sensorValue) {
                map.value = "open"
                map.descriptionText = "$device.displayName is open"
            } else {
                map.value = "closed"
                map.descriptionText = "$device.displayName is closed"
            }
            break;
    }
    map
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
	log.debug "PSM01: Catchall reached for cmd: ${cmd.toString()}}"
	[:]
}

def configure() {
    log.debug "PSM01: configure() called"
    
	delayBetween([
		
        //1 tick = 30 minutes
		zwave.configurationV1.configurationSet(parameterNumber: 10, size: 1, scaledConfigurationValue: 4).format(), // Auto report Battery time 1-127, default 12
		zwave.configurationV1.configurationSet(parameterNumber: 11, size: 1, scaledConfigurationValue: 2).format(), // Auto report Door/Window state time 1-127, default 12
		zwave.configurationV1.configurationSet(parameterNumber: 12, size: 1, scaledConfigurationValue: 2).format(), // Auto report Illumination time 1-127, default 12
        zwave.configurationV1.configurationSet(parameterNumber: 13, size: 1, scaledConfigurationValue: 2).format(), // Auto report Temperature time 1-127, default 12
        zwave.wakeUpV1.wakeUpIntervalSet(seconds: 1 * 3600, nodeid:zwaveHubNodeId).format(),						// Wake up every hour

    ])
}