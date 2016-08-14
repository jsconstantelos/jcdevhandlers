/**
 *  Utilitech/Everspring Siren
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
 *  02-19-2016 : Initial commit
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *  08-14-2016 : Reimplemented SECONDARY_CONTROL (looks like formatting issues were fixed.
 *
 */
metadata {
	definition (name: "My Utilitech Z-Wave Siren", namespace: "jscgs350", author: "SmartThings") {
		capability "Actuator"
        capability "Alarm"
        capability "Battery"
        capability "Polling"
        capability "Refresh"
        capability "Sensor"
		capability "Switch"
		attribute "alarmState", "string"

	}

	tiles(scale: 2) {
		multiAttributeTile(name:"alarm", type: "lighting", width: 6, height: 4, canChangeIcon: true){
			tileAttribute ("device.alarm", key: "PRIMARY_CONTROL") {
				attributeState "both", label:'alarm!', action:'alarm.off', icon:"st.alarm.alarm.alarm", backgroundColor:"#e86d13"
				attributeState "off", label:'off', action:'alarm.strobe', icon:"st.alarm.alarm.alarm", backgroundColor:"#79b821"
			}
            tileAttribute ("statusText", key: "SECONDARY_CONTROL") {
           		attributeState "statusText", label:'${currentValue}'
//                attributeState "statusText", label:''
            }
		}
		standardTile("off", "device.alarm", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'', action:"alarm.off", icon:"st.secondary.off"
		}
        valueTile("battery", "device.battery", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "battery", label:'${currentValue}% battery', unit:""
		}
        standardTile("refresh", "device.refresh", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'', action:"refresh.refresh", icon:"st.secondary.refresh"
		}
        valueTile("statusText", "statusText", inactiveLabel: false, decoration: "flat", width: 6, height: 2) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}      
		main "alarm"
//		details(["alarm","statusText","battery","refresh"])
		details(["alarm","battery","refresh"])        
	}
}

def parse(String description) {
	log.debug "parse($description)"
	def result = null
	def cmd = zwave.parse(description, [0x20: 1])
	if (cmd) {
		result = createEvents(cmd)
	}
    
    def statusTextmsg = ""
    statusTextmsg = "Siren is ${device.currentState('alarmState').value} (tap to toggle on/off)."
    sendEvent("name":"statusText", "value":statusTextmsg)
//    log.debug statusTextmsg

	log.debug "Parse returned ${result?.descriptionText}"
	return result
}

def createEvents(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
	def map = [ name: "battery", unit: "%" ]
	if (cmd.batteryLevel == 0xFF) {
		map.value = 1
		map.descriptionText = "$device.displayName has a low battery"
	} else {
		map.value = cmd.batteryLevel
	}
	state.lastbatt = new Date().time
	createEvent(map)
}

def poll() {
	if (secondsPast(state.lastbatt, 36*60*60)) {
		return zwave.batteryV1.batteryGet().format
	} else {
		return null
	}
}

private Boolean secondsPast(timestamp, seconds) {
	if (!(timestamp instanceof Number)) {
		if (timestamp instanceof Date) {
			timestamp = timestamp.time
		} else if ((timestamp instanceof String) && timestamp.isNumber()) {
			timestamp = timestamp.toLong()
		} else {
			return true
		}
	}
	return (new Date().time - timestamp) > (seconds * 1000)
}

def on() {
	log.debug "sending on"
	[
		zwave.basicV1.basicSet(value: 0xFF).format(),
		zwave.basicV1.basicGet().format()
	]
}

def off() {
	log.debug "sending off"
	[
		zwave.basicV1.basicSet(value: 0x00).format(),
		zwave.basicV1.basicGet().format()
	]
}

def strobe() {
	log.debug "sending stobe/on command"
	[
		zwave.basicV1.basicSet(value: 0xFF).format(),
		zwave.basicV1.basicGet().format()
	]
}

def both() {
	log.debug "Sending ON command to ${device.displayName} even though BOTH was called"
	[
		zwave.basicV1.basicSet(value: 0xFF).format(),
		zwave.basicV1.basicGet().format()
	]
}

def refresh() {
	log.debug "sending battery refresh command"
	zwave.batteryV1.batteryGet().format()
}

def createEvents(physicalgraph.zwave.commands.basicv1.BasicReport cmd)
{
	def switchValue = cmd.value ? "on" : "off"
	def alarmValue
	if (cmd.value == 0) {
		alarmValue = "off"
        sendEvent(name: "alarmState", value: "waiting for events")
	}
	else if (cmd.value <= 33) {
		alarmValue = "strobe"
        sendEvent(name: "alarmState", value: "ON - strobe only!")
	}
	else if (cmd.value <= 66) {
		alarmValue = "siren"
        sendEvent(name: "alarmState", value: "ON - siren only!")
	}
	else {
		alarmValue = "both"
        sendEvent(name: "alarmState", value: "ON - strobe and siren!")
	}
	[
		createEvent([name: "switch", value: switchValue, type: "digital", displayed: false]),
		createEvent([name: "alarm", value: alarmValue, type: "digital"])
	]
}

def createEvents(physicalgraph.zwave.Command cmd) {
	log.warn "UNEXPECTED COMMAND: $cmd"
}