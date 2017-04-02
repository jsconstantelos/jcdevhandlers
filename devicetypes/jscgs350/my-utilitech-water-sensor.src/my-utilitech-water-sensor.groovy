/*
 *  Everspring/Utilitech Water Sensor
 *
 *      Everspring Flood Sensor       ST812-2
 *      Utilitech Water Leak Detector TST01-1 (Lowe's)
 *
 *  Author: tosa68
 *  Date:   2014-07-17
 *
 *  Version 0.8 (2016-11-02): changes to (hopefully) catch all WakeUpNotifications
 *  Version 0.9 (2017-03-07): "passive heartbeat"
 *                            - i.e. option to report WakeUp in activity feed;
 *                            - option to always report Battery status in activity feed
 *                              (will report Battery changes regardless of this setting);
 *                            - confirm WakeUpInterval change in activity feed
 *                             
 *
 *  Features:
 *
 *  1) Battery status updated during configure, at power up, and each wake up
 *  2) User configurable Wake Up Interval
 *
 *  Configure after initial association happens before userWakeUpInterval can be set,
 *  so device will start with default wake up interval of 3600 sec (1 hr).
 *
 *  To set userWakeUpInterval, from the mobile app:
 *    1) enter custom value in device preferences, then
 *         new interval will be set when device next wakes up
 *       OR
 *    3) press 'configure' when the device is awake:
 *         - either just after initial association (within about 10min),
 *         - after power up (remove/reinsert batteries)
 *    
 * 
 *  Copyright 2014 Tony Saye
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

preferences {
    // manufacturer default wake up is every hour; optionally increase for better battery life
    input "userWakeUpInterval", "number", title: "Wake Up Interval (seconds)", description: "Default 3600 sec (60 sec - 194 days)", defaultValue: '3600', required: false, displayDuringSetup: true
    input "alwaysShowWakeUp", "bool", title: "Report WakeUp", description: "Report when device wakes up in activity feed", required: true, displayDuringSetup: true
    input "alwaysShowBattery", "bool", title: "Always Report Battery", description: "Report battery status in activity feed whether or not it has changed", required: true, displayDuringSetup: true
}

metadata {
	definition (name: "My Utilitech Water Sensor", namespace: "jscgs350", author: "tony saye") {
		capability "Water Sensor"
		capability "Battery"
		capability "Configuration"
        
        fingerprint deviceId: "0xA102", inClusters: "0x86,0x72,0x85,0x84,0x80,0x70,0x9C,0x20,0x71"
	}
    
	simulator {
		status "dry": "command: 9C02, payload: 00 05 00 00 00"
		status "wet": "command: 9C02, payload: 00 05 FF 00 00"
        status "wakeup": "command: 8407, payload: "
        status "low batt alarm": "command: 7105, payload: 01 FF"
		status "battery <20%": new physicalgraph.zwave.Zwave().batteryV1.batteryReport(batteryLevel: 0xFF).incomingMessage()
        for (int i = 20; i <= 100; i += 10) {
			status "battery ${i}%": new physicalgraph.zwave.Zwave().batteryV1.batteryReport(batteryLevel: i).incomingMessage()
		}
    }

	tiles(scale: 2) {
		multiAttributeTile(name:"water", type: "generic", width: 6, height: 4){
			tileAttribute ("device.water", key: "PRIMARY_CONTROL") {
				attributeState "dry", icon:"st.alarm.water.dry", backgroundColor:"#ffffff"
				attributeState "wet", icon:"st.alarm.water.wet", backgroundColor:"#00a0dc"
			}
		}
		valueTile("battery", "device.battery", inactiveLabel: false, canChangeBackground: true, width: 3, height: 2) {
			state "battery", label:'${currentValue}%\nBattery', unit:"",
            backgroundColors:[
				[value: 19, color: "#BC2323"],
				[value: 20, color: "#D04E00"],
				[value: 30, color: "#D04E00"],
				[value: 40, color: "#DAC400"],
				[value: 41, color: "#79b821"]
			]
		}
		standardTile("configure", "device.configure", inactiveLabel: false, decoration: "flat", width: 3, height: 2) {
			state "configure", label:'', action:"configuration.configure", icon:"st.secondary.configure"
		}
		main "water"
		details(["water", "battery", "configure"])
	}
}

def parse(String description) {
	log.debug "parse: $description"

	def parsedZwEvent = zwave.parse(description, [0x9C: 1, 0x71: 1, 0x84: 2, 0x30: 1, 0x70: 1])
	def result = []

    if (parsedZwEvent) {
        result = zwaveEvent(parsedZwEvent)
        log.debug "Parsed ${parsedZwEvent} to ${result.inspect()}"
    } else {
        log.debug "Non-parsed event: ${description}"
    }

	return result
}

def zwaveEvent(physicalgraph.zwave.commands.wakeupv2.WakeUpNotification cmd) {
    
    // Appears that the Everspring/Utilitech water sensor responds to batteryGet, but not wakeUpNoMoreInformation(?)
	/* Oct-2016: troubleshooting not getting wakeUpIntervalSet during WakeUpNotification
	/            Was trying to only send wakeUpInterval if it was changed, but sensor didn't seem to be getting command
	/            during wakeup; now sending wakeUpInterval and getting battery status for each wakeup period
	/            Note: some wakeUp events still seem to be missed, perhaps due to SmartThings latency? But shouldn't be a big
	/                  deal if a wakeUp here or there are missed since we're only setting wakeUpInterval and getting battery
	/                  status.
	*/
    
    //def result = [createEvent(descriptionText: "${device.displayName} woke up", isStateChange:  false)]
	def map = [:]
    def result
	map.descriptionText = "${device.displayName} woke up"
	map.displayed = true
    if (alwaysShowWakeUp) { map.isStateChange = true } // always report Wake Up events in activity feed
	result = [createEvent(map)]

    // If user has changed userWakeUpInterval, send the new interval to the device 
	/*def userWake = getUserWakeUp(userWakeUpInterval)
    if (state.wakeUpInterval != userWake) {
        state.wakeUpInterval = userWake
        result << response("delay 200")
        result << response(zwave.wakeUpV2.wakeUpIntervalSet(seconds:state.wakeUpInterval, nodeid:zwaveHubNodeId))
        result << response("delay 200")
        result << response(zwave.wakeUpV2.wakeUpIntervalGet())
    }*/

    // Always send wakeUpInterval and get battery status
	state.wakeUpInterval = getUserWakeUp(userWakeUpInterval)
    result << response(zwave.wakeUpV2.wakeUpIntervalSet(seconds:state.wakeUpInterval, nodeid:zwaveHubNodeId))
    result << response("delay 200")
    result << response(zwave.wakeUpV2.wakeUpIntervalGet())
    result << response("delay 200")
    result << response(zwave.batteryV1.batteryGet())
    
    return result
}

def zwaveEvent(physicalgraph.zwave.commands.sensoralarmv1.SensorAlarmReport cmd) {

	def map = [:]
	if (cmd.sensorType == 0x05) {
		map.name = "water"
		map.value = cmd.sensorState ? "wet" : "dry"
		map.descriptionText = "${device.displayName} is ${map.value}"
	}
    
	createEvent(map)
}

def zwaveEvent(physicalgraph.zwave.commands.sensorbinaryv1.SensorBinaryReport cmd) {

	def map = [:]
	map.name = "water"
	map.value = cmd.sensorValue ? "wet" : "dry"
	map.descriptionText = "${device.displayName} is ${map.value}"
    
	createEvent(map)
}

def zwaveEvent(physicalgraph.zwave.commands.alarmv1.AlarmReport cmd) {

	def map = [:]
    def result
	if (cmd.alarmType == 1) {
        if (cmd.alarmLevel == 0xFF) {
		    map.descriptionText = "${device.displayName} has a low battery alarm"
		    map.displayed = true
        } else if (cmd.alarmLevel == 1) {
		    map.descriptionText = "${device.displayName} battery alarm level 1"   // device sometimes returns alarmLevel 1, 
		    map.displayed = false                                                 //   but this appears to be an undocumented alarmLevel(?)
        }
        result = [createEvent(map)]
        result << response(zwave.batteryV1.batteryGet())                          // try to update battery status, but device doesn't seem to always respond
    } else if (cmd.alarmType == 2 && cmd.alarmLevel == 1) {
        map.descriptionText = "${device.displayName} powered up"
		map.displayed = true
        result = [createEvent(map)]
	} else {
		log.debug cmd
	}

    return result
}

def zwaveEvent(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
	
	def map = [ name: "battery", unit: "%" ]
	if (cmd.batteryLevel == 0xFF) {           // Special value for low battery alert
		map.value = 10                        // will display (and alarm in mobile app) as 10% battery remaining, even though it's really 1%-19% remaining
		map.descriptionText = "${device.displayName} reports a low battery"
        map.isStateChange = true
		map.displayed = true
	} else {
		map.value = cmd.batteryLevel
		if (alwaysShowBattery) { map.isStateChange = true } // always report battery level in activity feed
		map.displayed = true
	}

    createEvent(map)
}

def zwaveEvent(physicalgraph.zwave.commands.wakeupv2.WakeUpIntervalCapabilitiesReport cmd) {

    def map = [ name: "defaultWakeUpInterval", unit: "seconds" ]
	map.value = cmd.defaultWakeUpIntervalSeconds
	map.displayed = false

	state.defaultWakeUpInterval = cmd.defaultWakeUpIntervalSeconds
    createEvent(map)
}

def zwaveEvent(physicalgraph.zwave.commands.wakeupv2.WakeUpIntervalReport cmd) {

	def map = [ name: "reportedWakeUpInterval", unit: "seconds" ]
	map.value = cmd.seconds
	map.displayed = true

    createEvent(map)
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
	
    log.debug "COMMAND CLASS: ${cmd}"
    createEvent(descriptionText: "Command not handled: ${cmd}")
}

def configure() {
    
    state.wakeUpInterval = getUserWakeUp(userWakeUpInterval)
    
    delayBetween([
        zwave.associationV2.associationSet(groupingIdentifier:1, nodeId:zwaveHubNodeId).format(),
        zwave.wakeUpV2.wakeUpIntervalSet(seconds:state.wakeUpInterval, nodeid:zwaveHubNodeId).format(),
        zwave.wakeUpV2.wakeUpIntervalGet().format(),
        zwave.batteryV1.batteryGet().format()
    ], 200)

}

private getUserWakeUp(userWake) {

    if (!userWake)                       { userWake =     '3600' }  // set default 1 hr if no user preference 

    // make sure user setting is within valid range for device 
    if (userWake.toInteger() <       60) { userWake =       '60' }  // 60 sec min
    if (userWake.toInteger() > 16761600) { userWake = '16761600' }  // 194 days max

	/*
     * Ideally, would like to reassign userWakeUpInterval to min or max when needed,
     * so it more obviously reflects in 'preferences' in the IDE and mobile app
     * for the device. Referencing the preference on the RH side is ok, but
     * haven't figured out how to reassign it on the LH side?
     *
     */
    //userWakeUpInterval = userWake 

    return userWake.toInteger()
}