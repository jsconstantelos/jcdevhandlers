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
 *  Updates:
 *  -------
 *  02-18-2016 : Initial commit
 *  03-04-2016 : Changed multiAttributeTile type to generic to remove secondary_control data from showing up since other tiles already show those values.
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *  04-05-2016 : Added fingerprint for the PSM01
 *  04-09-2016 : Rewrote several sections of code, added additional config parameter (5) to ensure open/close not disabled
 *  04-13-2016 : Added icon for illuminance
 *  08-27-2016 : Modified the device handler for my liking, primarly for looks and feel.
 *  02-11-2017 : Put battery info into the main tile instead of a separate tile.
 *  03-24-2017 : Changed color schema to match ST's new format.
 *  07-21-2017 : Changed Primary tile for my liking.
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

		fingerprint deviceId: "0x2001", inClusters: "0x80,0x85,0x70,0x72,0x86,0x30,0x31,0x84,0xEF,0x20"

	}

	tiles(scale: 2) {
		multiAttributeTile(name: "temperature", type: "generic", width: 6, height: 4, canChangeIcon: true) {
			tileAttribute("device.temperature", key: "PRIMARY_CONTROL") {
				attributeState "temperature", action:"refresh", icon:"st.Weather.weather2", label: '${currentValue}°',
						backgroundColors: [
								[value: 31, color: "#153591"],
								[value: 44, color: "#1e9cbb"],
								[value: 59, color: "#90d2a7"],
								[value: 74, color: "#44b621"],
								[value: 84, color: "#f1d801"],
								[value: 95, color: "#d04e00"],
								[value: 96, color: "#bc2323"]
						]
			}
            tileAttribute ("device.battery", key: "SECONDARY_CONTROL") {
                attributeState("default", label:'${currentValue}% battery', icon: "https://raw.githubusercontent.com/constjs/jcdevhandlers/master/img/battery-icon-614x460.png")
            }
		}
/*		standardTile("contact", "device.contact", width: 2, height: 2) {
			state "open", label: '${name}', icon: "st.contact.contact.open", backgroundColor: "#e86d13"
			state "closed", label: '${name}', icon: "st.contact.contact.closed", backgroundColor: "#00A0DC"
		}*/
		standardTile("illuminance", "device.illuminance", inactiveLabel: false, decoration: "flat", width: 3, height: 2) {
			state "luminosity", label:'${currentValue} ${unit}', unit:"lux", icon:"st.illuminance.illuminance.bright"
		}
		standardTile("configure", "device.configure", inactiveLabel: false, decoration: "flat", width: 3, height: 2) {
			state "configure", label:'', action:"configuration.configure", icon:"st.secondary.configure"
		}

		main(["temperature"])
		details(["temperature", "illuminance", "configure"])
	}
}

// Parse incoming device messages to generate events
def parse(String description)
{
	def result = []
	def cmd = zwave.parse(description, [0x20: 1, 0x31: 2, 0x30: 2, 0x80: 1, 0x84: 2, 0x85: 2])
	if (cmd) {
		if( cmd.CMD == "8407" ) { result << new physicalgraph.device.HubAction(zwave.wakeUpV1.wakeUpNoMoreInformation().format()) }
		result << createEvent(zwaveEvent(cmd))
	}
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
			break;
		case 3:
			// luminance
			map.value = cmd.scaledSensorValue.toInteger().toString()
			map.unit = "lux"
			map.name = "illuminance"
			break;
		case 5:
			// humidity
			map.value = cmd.scaledSensorValue.toInteger().toString()
			map.unit = "%"
			map.name = "humidity"
			break;
	}
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

/*def zwaveEvent(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
	def map = [:]
	map.name = "battery"
	map.value = cmd.batteryLevel > 0 ? cmd.batteryLevel.toString() : 1
	map.unit = "%"
	map.displayed = false
	map
}*/
def zwaveEvent(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
	def map = [ name: "battery", unit: "%" ]
	if (cmd.batteryLevel == 0xFF) {
		map.value = 1
		map.descriptionText = "${device.displayName} has a low battery"
		map.isStateChange = true
	} else {
		map.value = cmd.batteryLevel > 0 ? cmd.batteryLevel.toString() : 1
	}
    map
}


def zwaveEvent(physicalgraph.zwave.commands.sensorbinaryv1.SensorBinaryReport cmd) {
	def map = [:]
	map.value = cmd.sensorValue ? "open" : "closed"
	map.name = "contact"
	if (map.value == "active") {
		map.descriptionText = "$device.displayName is open"
	}
	else {
		map.descriptionText = "$device.displayName is closed"
	}
	map
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicSet cmd) {
	def map = [:]
	map.value = cmd.value ? "open" : "closed"
	map.name = "contact"
	if (map.value == "active") {
		map.descriptionText = "$device.displayName is open"
	}
	else {
		map.descriptionText = "$device.displayName is closed"
	}
	map
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
	log.debug "Catchall reached for cmd: ${cmd.toString()}}"
	[:]
}

def refresh() {
	log.debug "Executing Refresh per user request"
	delayBetween([
		zwave.switchBinaryV1.switchBinaryGet().format(),
		zwave.sensorBinaryV1.sensorBinaryGet().format(),
        zwave.basicV1.basicGet().format(),
		zwave.alarmV1.alarmGet().format() 
	],100)
}

def configure() {
    log.debug "PSM01: configure() called"
	delayBetween([
        //value of 1 = 30 minutes for reporting times, or 1 = 8 seconds for how long the light stays on.
        zwave.configurationV1.configurationSet(parameterNumber: 5, size: 1, scaledConfigurationValue: 0).format(),  // Enable the door/window function, default 0
//      zwave.configurationV1.configurationSet(parameterNumber: 9, size: 1, scaledConfigurationValue: 0).format(),  // How long the light stays on, default ?     
		zwave.configurationV1.configurationSet(parameterNumber: 10, size: 1, scaledConfigurationValue: 2).format(), // Auto report Battery time 1-127, default 12
		zwave.configurationV1.configurationSet(parameterNumber: 11, size: 1, scaledConfigurationValue: 2).format(), // Auto report Door/Window state time 1-127, default 12
		zwave.configurationV1.configurationSet(parameterNumber: 12, size: 1, scaledConfigurationValue: 2).format(), // Auto report Illumination time 1-127, default 12
        zwave.configurationV1.configurationSet(parameterNumber: 13, size: 1, scaledConfigurationValue: 2).format(), // Auto report Temperature time 1-127, default 12
        zwave.wakeUpV1.wakeUpIntervalSet(seconds: 1 * 3600, nodeid:zwaveHubNodeId).format(),						// Wake up every hour
    ])
}