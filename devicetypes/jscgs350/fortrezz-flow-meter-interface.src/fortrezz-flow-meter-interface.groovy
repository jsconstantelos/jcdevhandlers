/**
 *  FortrezZ Flow Meter Interface
 *
 *  Copyright 2016 FortrezZ, LLC
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
 *  07-06-2016 : Original commit.
 *  07-13-2016 : Modified the device handler for my liking, primarly for looks and feel.
 *
 */
metadata {
	definition (name: "FortrezZ Flow Meter Interface", namespace: "jscgs350", author: "Daniel Kurin") {
		capability "Battery"
		capability "Energy Meter"
		capability "Image Capture"
		capability "Temperature Measurement"
        capability "Sensor"
        capability "Water Sensor"
        capability "Configuration"
        capability "Polling"
        capability "Refresh"
        
        attribute "gpm", "number"
		attribute "gpmHigh", "number"
        attribute "cumulative", "number"
        attribute "alarmState", "string"
        attribute "chartMode", "string"
        attribute "lastThreshhold", "number"

        command "chartMode"
        command "resetHigh"
        command "zero"
        command "setHighFlowLevel", ["number"]

	    fingerprint deviceId: "0x2101", inClusters: "0x5E, 0x86, 0x72, 0x5A, 0x73, 0x71, 0x85, 0x59, 0x32, 0x31, 0x70, 0x80, 0x7A"
	}

	simulator {
		// TODO: define status and reply messages here
	}
    
    preferences {
       input "reportThreshhold", "decimal", title: "Reporting Rate Threshhold", description: "The time interval between meter reports while water is flowing. 6 = 60 seconds, 1 = 10 seconds.  Options are 1, 2, 3, 4, 5, or 6 (default).", defaultValue: 6, required: false, displayDuringSetup: true
       input "gallonThreshhold", "decimal", title: "High Flow Rate Threshhold", description: "Flow rate (in gpm) that will trigger a notification.", defaultValue: 5, required: false, displayDuringSetup: true
       input("registerEmail", type: "email", required: false, title: "Email Address", description: "Register your device with FortrezZ", displayDuringSetup: true)
    }

	tiles(scale: 2) {
    	carouselTile("flowHistory", "device.image", width: 6, height: 3) { }

		valueTile("battery", "device.battery", inactiveLabel: false, width: 2, height: 2) {
			state "battery", label:'${currentValue}%\n Battery', unit:""
		}
		valueTile("temperature", "device.temperature", width: 3, height: 2) {
            state("temperature", label:'${currentValue}°',
                backgroundColors:[
                    [value: 31, color: "#153591"],
                    [value: 44, color: "#1e9cbb"],
                    [value: 59, color: "#90d2a7"],
                    [value: 74, color: "#44b621"],
                    [value: 84, color: "#f1d801"],
                    [value: 95, color: "#d04e00"],
                    [value: 96, color: "#bc2323"]
                ]
            )
        }
        valueTile("gpm", "device.gpm", inactiveLabel: false, width: 3, height: 2) {
			state "gpm", label:'Now: ${currentValue}\ngpm', unit:""
		}
        valueTile("gpmHigh", "device.gpmHigh", inactiveLabel: false, width: 3, height: 2, decoration: "flat") {
			state "default", label:'Highest recorded flow was at ${currentValue}', action: 'resetHigh'
		}        
		standardTile("powerState", "device.powerState", width: 3, height: 2) { 
			state "reconnected", label: "Power On", icon: "st.switches.switch.on", backgroundColor: "#79b821"
			state "disconnected", label: "Power Off", icon: "st.switches.switch.off", backgroundColor: "#ffa81e"
			state "batteryReplaced", icon:"http://swiftlet.technology/wp-content/uploads/2016/04/Full-Battery-96.png", backgroundColor:"#cccccc"
			state "noBattery", icon:"http://swiftlet.technology/wp-content/uploads/2016/04/No-Battery-96.png", backgroundColor:"#cc0000"
		}
		standardTile("waterState", "device.waterState", width: 3, height: 2, canChangeIcon: true, decoration: "flat") {
			state "none", icon:"http://cdn.device-icons.smartthings.com/Outdoor/outdoor16-icn@2x.png", backgroundColor:"#cccccc", label: "No Flow"
			state "flow", icon:"http://cdn.device-icons.smartthings.com/Outdoor/outdoor16-icn@2x.png", backgroundColor:"#0000ff", label: "Flow"
			state "overflow", icon:"http://cdn.device-icons.smartthings.com/Outdoor/outdoor16-icn@2x.png", backgroundColor:"#ff0000", label: "High Flow"
		}
		standardTile("heatState", "device.heatState", width: 2, height: 2) {
			state "normal", label:'Normal', icon:"st.alarm.temperature.normal", backgroundColor:"#ffffff"
			state "freezing", label:'Freezing', icon:"st.alarm.temperature.freeze", backgroundColor:"#2eb82e"
			state "overheated", label:'Overheated', icon:"st.alarm.temperature.overheat", backgroundColor:"#F80000"
		}
        standardTile("take1", "device.image", width: 2, height: 2, canChangeIcon: false, inactiveLabel: true, canChangeBackground: false, decoration: "flat") {
            state "take", label: "", action: "Image Capture.take", icon:"st.secondary.refresh"
        }
		valueTile("chartMode", "device.chartMode", width: 2, height: 2, canChangeIcon: false, canChangeBackground: false, decoration: "flat") {
			state "day", label:'Chart Format:\n24 Hours', nextState: "week", action: 'chartMode'
			state "week", label:'Chart Format:\n7 Days', nextState: "month", action: 'chartMode'
			state "month", label:'Chart Format:\n4 Weeks', nextState: "day", action: 'chartMode'
		}
        valueTile("zeroTile", "device.zero", width: 6, height: 2, canChangeIcon: false, canChangeBackground: false, decoration: "flat") {
			state "zero", label:'Reset Meter', action: 'zero'
		}
		standardTile("configure", "device.configure", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "configure", label: "", action: "configuration.configure", icon: "st.secondary.configure"
		}
		main (["waterState"])
		details(["flowHistory", "waterState", "temperature", "gpm", "gpmHigh", "chartMode", "take1", "battery", "powerState", "configure"])
	}
    
}

// parse events into attributes
def parse(String description) {
	def results = []
	if (description.startsWith("Err")) {
	    results << createEvent(descriptionText:description, displayed:true)
	} else {
		def cmd = zwave.parse(description, [ 0x80: 1, 0x84: 1, 0x71: 2, 0x72: 1 ])
		if (cmd) {
			results << createEvent( zwaveEvent(cmd) )
		}
	}
	//log.debug "\"$description\" parsed to ${results.inspect()}"
    if(gallonThreshhold != device.currentValue("lastThreshhold"))
    {
    	results << setThreshhold(gallonThreshhold)
    }
	log.debug "zwave parsed to ${results.inspect()}"
	return results
}

def setHighFlowLevel(level)
{
	setThreshhold(level)
}

def take() {
	def mode = device.currentValue("chartMode")
    if(mode == "day")
    {
    	take1()
    }
    else if(mode == "week")
    {
    	take7()
    }
    else if(mode == "month")
    {
    	take28()
    }
}

def chartMode(string) {
	def state = device.currentValue("chartMode")
    def tempValue = ""
	switch(state)
    {
    	case "day":
        	tempValue = "week"
            break
        
        case "week":
        	tempValue = "month"
            break
            
        case "month":
        	tempValue = "day"
            break
            
        default:
        	tempValue = "day"
            break
    }
	sendEvent(name: "chartMode", value: tempValue)
    take()
}

def take1() {
    api("24hrs", "") {
        log.debug("Image captured")

        if(it.headers.'Content-Type'.contains("image/png")) {
            if(it.data) {
                storeImage(getPictureName("24hrs"), it.data)
            }
        }
    }
}

def take7() {
    api("7days", "") {
        log.debug("Image captured")

        if(it.headers.'Content-Type'.contains("image/png")) {
            if(it.data) {
                storeImage(getPictureName("7days"), it.data)
            }
        }
    }
}

def take28() {
    api("4weeks", "") {
        log.debug("Image captured")

        if(it.headers.'Content-Type'.contains("image/png")) {
            if(it.data) {
                storeImage(getPictureName("4weeks"), it.data)
            }
        }
    }
}

def zero()
{
	log.debug "Resetting water meter..."
    delayBetween([
		zwave.meterV3.meterReset().format(),
        zwave.meterV3.meterGet().format(),
        zwave.firmwareUpdateMdV2.firmwareMdGet().format(),
    ], 100)
}

def resetHigh()
{
	log.debug "Resetting high value for GPM..."
    state.deltaHigh = 0
    sendEvent(name: "gpmHigh", value: "(resently reset)")
}

def zwaveEvent(physicalgraph.zwave.commands.sensormultilevelv5.SensorMultilevelReport cmd)
{
	log.debug cmd
	def map = [:]
	if(cmd.sensorType == 1) {
		map = [name: "temperature"]
        if(cmd.scale == 0) {
        	map.value = getTemperature(cmd.scaledSensorValue)
        } else {
	        map.value = cmd.scaledSensorValue
        }
        map.unit = location.temperatureScale
	}
	return map
}

def zwaveEvent(physicalgraph.zwave.commands.meterv3.MeterReport cmd)
{
    def dispValue
    def timeString = new Date().format("MM-dd-yyyy h:mm a", location.timeZone)
	def map = [:]
    map.name = "gpm"
    def delta = cmd.scaledMeterValue - cmd.scaledPreviousMeterValue
    if (delta < 0) {
    	delta = 0
    }
    map.value = delta
    map.unit = "gpm"
    sendDataToCloud(delta)
    sendEvent(name: "cumulative", value: cmd.scaledMeterValue, displayed: false, unit: "gal")

	if (delta > state.deltaHigh) {
		dispValue = delta+" gpm "+"on "+timeString
		sendEvent(name: "gpmHigh", value: dispValue as String, displayed: false)
		state.deltaHigh = delta
	}

	return map
}

def zwaveEvent(physicalgraph.zwave.commands.alarmv2.AlarmReport cmd)
{
	def map = [:]
    if (cmd.zwaveAlarmType == 8) // Power Alarm
    {
    	map.name = "powerState" // For Tile (shows in "Recently")
        if (cmd.zwaveAlarmEvent == 2) // AC Mains Disconnected
        {
            map.value = "disconnected"
            sendAlarm("acMainsDisconnected")
        }
        else if (cmd.zwaveAlarmEvent == 3) // AC Mains Reconnected
        {
            map.value = "reconnected"
            sendAlarm("acMainsReconnected")
        }
        else if (cmd.zwaveAlarmEvent == 0x0B) // Replace Battery Now
        {
            map.value = "noBattery"
            sendAlarm("replaceBatteryNow")
        }
        else if (cmd.zwaveAlarmEvent == 0x00) // Battery Replaced
        {
            map.value = "batteryReplaced"
            sendAlarm("batteryReplaced")
        }
    }
    else if (cmd.zwaveAlarmType == 4) // Heat Alarm
    {
    	map.name = "heatState"
        if (cmd.zwaveAlarmEvent == 0) // Normal
        {
            map.value = "normal"
        }
        else if (cmd.zwaveAlarmEvent == 1) // Overheat
        {
            map.value = "overheated"
            sendAlarm("tempOverheated")
        }
        else if (cmd.zwaveAlarmEvent == 5) // Underheat
        {
            map.value = "freezing"
            sendAlarm("tempFreezing")
        }
    }
    else if (cmd.zwaveAlarmType == 5) // Water Alarm
    {
    	map.name = "waterState"
        if (cmd.zwaveAlarmEvent == 0) // Normal
        {
            map.value = "none"
            sendEvent(name: "water", value: "dry")
        }
        else if (cmd.zwaveAlarmEvent == 6) // Flow Detected
        {
        	if(cmd.eventParameter[0] == 2)
            {
                map.value = "flow"
                sendEvent(name: "water", value: "dry")
            }
            else if(cmd.eventParameter[0] == 3)
            {
            	map.value = "overflow"
                sendAlarm("waterOverflow")
                sendEvent(name: "water", value: "wet")
            }
        }
    }
    //log.debug "alarmV2: $cmd"
    
	return map
}

def zwaveEvent(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
	def map = [:]
	if(cmd.batteryLevel == 0xFF) {
		map.name = "battery"
		map.value = 1
		map.descriptionText = "${device.displayName} has a low battery"
		map.displayed = true
	} else {
		map.name = "battery"
		map.value = cmd.batteryLevel > 0 ? cmd.batteryLevel.toString() : 1
		map.unit = "%"
		map.displayed = false
	}
	return map
}

def zwaveEvent(physicalgraph.zwave.Command cmd)
{
	log.debug "COMMAND CLASS: $cmd"
}

def sendDataToCloud(double data)
{
    def params = [
        uri: "https://iot.swiftlet.technology",
        path: "/fortrezz/post.php",
        body: [
            id: device.id,
            value: data,
            email: registerEmail
        ]
    ]

	//log.debug("POST parameters: ${params}")
    try {
        httpPostJson(params) { resp ->
            resp.headers.each {
                //log.debug "${it.name} : ${it.value}"
            }
            log.debug "query response: ${resp.data}"
        }
    } catch (e) {
        log.debug "something went wrong: $e"
    }
}

def getTemperature(value) {
	if(location.temperatureScale == "C"){
		return value
    } else {
        return Math.round(celsiusToFahrenheit(value))
    }
}


private getPictureName(category) {
  //def pictureUuid = device.id.toString().replaceAll('-', '')
  def pictureUuid = java.util.UUID.randomUUID().toString().replaceAll('-', '')

  def name = "image" + "_$pictureUuid" + "_" + category + ".png"
  return name
}

def api(method, args = [], success = {}) {
  def methods = [
    //"snapshot":        [uri: "http://${ip}:${port}/snapshot.cgi${login()}&${args}",        type: "post"],
    "24hrs":      [uri: "https://iot.swiftlet.technology/fortrezz/chart.php?uuid=${device.id}&tz=${location.timeZone.ID}&type=1", type: "get"],
    "7days":      [uri: "https://iot.swiftlet.technology/fortrezz/chart.php?uuid=${device.id}&tz=${location.timeZone.ID}&type=2", type: "get"],
    "4weeks":     [uri: "https://iot.swiftlet.technology/fortrezz/chart.php?uuid=${device.id}&tz=${location.timeZone.ID}&type=3", type: "get"],
  ]

  def request = methods.getAt(method)

  return doRequest(request.uri, request.type, success)
}

private doRequest(uri, type, success) {
  log.debug(uri)

  if(type == "post") {
    httpPost(uri , "", success)
  }

  else if(type == "get") {
    httpGet(uri, success)
  }
}

def sendAlarm(text)
{
	sendEvent(name: "alarmState", value: text, descriptionText: text, displayed: false)
}

def setThreshhold(rate)
{
	log.debug "Setting Threshhold to ${rate}"
    
    def event = createEvent(name: "lastThreshhold", value: rate, displayed: false)
    def cmds = []
    cmds << zwave.configurationV2.configurationSet(configurationValue: [(int)Math.round(rate*10)], parameterNumber: 5, size: 1).format()
    sendEvent(event)
    return response(cmds) // return a list containing the event and the result of response()
}

def configure() {
	log.debug "Setting reporting interval to ${reportThreshhold}"
    def cmds = []
    cmds << zwave.configurationV2.configurationSet(configurationValue: [(int)Math.round(reportThreshhold)], parameterNumber: 4, size: 1).format()
    response(cmds) // return a list containing the event and the result of response()
}