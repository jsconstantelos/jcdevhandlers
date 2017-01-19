/**
 *  Aeon HEM1 (w/no battery tile)
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
 *  Aeon Home Energy Meter gen-1 (US)
 *
 *  Updates:
 *  -------
 *  02-15-2016 : Removed posting to the Activity Feed in the phone app and event log.
 *  02-17-2016 : Fixed preferences for kWh cost from string to number.
 *  02-20-2016 : Enabled battery reporting (parameter 103, value 1), and documented the parameters better.
 *  02-21-2016 : Made certain configuration parameters changeable via device preferences instead of having to tweak code all the time.
 *  02-22-2016 : Fixed kWh cost entry in Preferences not allowing decimals.
 *  02-27-2016 : Changed date formats to be MM-dd-yyyy h:mm a.
 *  02-29-2016 : Changed reportType variable from 0 to 1.
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *  03-19-2016 : Added clarity for preferences.
 *  03-21-2016 : Fixed issue when resetting energy would also reset watts.
 *  03-25-2016 : Removed the \n from the two tiles for resetting watts and energy due to rendering issues on iOS
 *  07-07-2016 : Check for wildly large watts value coming from the HEM and do not process them.  Firmware updates should have resolved this.
 *  08-10-2016 : Check for 0 or negative watts value coming from the HEM and do not process them.  Firmware updates should have resolved this.
 *  08-21-2016 : Created separate tiles to reset min and max instead of having a single tile for both values.  Changed many tiles to different sizes.
 *  08-27-2016 : Modified the device handler for my liking, primarly for looks and feel.
 *  09-16-2016 : During the check for 0 or negative values, use the last power value (state.powerValue) instead of just a hard coded value.
 *  10-17-2016 : Cleaned up code.
 *  10-19-2016 : Provided comments in the code for iOS users to edit so that the rendering of text for certain tiles to work right.  Changed default icon.
 *  10-19-2016 : Added a new parameter in Preferences so that a user can specify the high limit for a watts value instead of hard coding a value.  Related to the change on 7-7-2016.
 *  11-18-2016 : Removed battery tile just for this version.
 *  11-19-2016 : Changed a few tiles from standardTile to valueTile now that ST fixed the rendering issues between Android and iOS.
 *  11-22-2016 : Added resetMeter section that calls the other resets (min, max, energy/cost).  This is for a SmartApp that resets the meter automatically at the 1st day of month.
 *  01-08-2017 : Added code for Health Check capabilities/functions, and cleaned up code in the resetMeter section.
 *  01-12-2017 : No functionality changes.  Just tweaking tiles to see why the 1x1 tile next to the min/max tile dissapears at times.
 *  01-18-2017 : Removed code no longer needed, and added another parameter in Preference to enable or disable the display of values in the Recently tab and device's event log (not Live Logs).  Enabling may be required for some SmartApps.
 *
 */
metadata {
    definition (name: "My Aeon Home Energy Monitor (no battery)", namespace: "jscgs350", author: "SmartThings") 
{
    capability "Energy Meter"
    capability "Power Meter"
    capability "Configuration"
    capability "Sensor"
    capability "Refresh"
    capability "Polling"
    capability "Health Check"
    
    attribute "energyDisp", "string"
    attribute "energyOne", "string"
    attribute "energyTwo", "string"
    
    attribute "powerDisp", "string"
    attribute "powerOne", "string"
    attribute "powerTwo", "string"
    
    command "reset"
    command "configure"
    command "resetmin"
    command "resetmax"
    command "resetMeter"
    
    fingerprint deviceId: "0x2101", inClusters: " 0x70,0x31,0x72,0x86,0x32,0x80,0x85,0x60"

}
// tile definitions
	tiles(scale: 2) {
		multiAttributeTile(name:"powerDisp", type: "lighting", width: 6, height: 4, decoration: "flat"){
			tileAttribute ("device.powerDisp", key: "PRIMARY_CONTROL") {
				attributeState "default", action: "refresh", label: '${currentValue}', icon: "https://raw.githubusercontent.com/constjs/jcdevhandlers/master/img/device-activity-tile@2x.png", backgroundColor: "#79b821"
			}
            tileAttribute ("statusText", key: "SECONDARY_CONTROL") {
//           		attributeState "statusText", label:'${currentValue}'
           		attributeState "statusText", label:''                
            }
		}    
        valueTile("energyDisp", "device.energyDisp", width: 3, height: 1, inactiveLabel: false, decoration: "flat") {
            state("default", label: '${currentValue}', backgroundColor:"#ffffff")
        }
        
        valueTile("energyOne", "device.energyOne", width: 5, height: 1, inactiveLabel: false, decoration: "flat") {
            state("default", label: '${currentValue}', backgroundColor:"#ffffff")
        }

        valueTile("energyTwo", "device.energyTwo", width: 3, height: 1, inactiveLabel: false, decoration: "flat") {
            state("default", label: '${currentValue}', backgroundColor:"#ffffff")
        }
    	standardTile("refresh", "device.power", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
        	state "default", label:'Refresh', action:"refresh.refresh", icon:"st.secondary.refresh-icon"
    	}
    	standardTile("configure", "device.power", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
        	state "configure", label:'', action:"configure", icon:"st.secondary.configure"
    	}
        valueTile("battery", "device.battery", width: 2, height: 1, inactiveLabel: false, decoration: "flat") {
            state "battery", label:'${currentValue}%\nbattery', unit:""
        }        
        standardTile("blankTile", "blankTile", inactiveLabel: false, decoration: "flat", width: 1, height: 1) {
			state "default", icon:"st.secondary.device-activity-tile"
		}
        standardTile("refreshTile", "refreshTile", inactiveLabel: false, decoration: "flat", width: 1, height: 1) {
			state "default", icon:"st.unknown.thing.thing-circle"
		}
        
        valueTile("statusText", "statusText", inactiveLabel: false, decoration: "flat", width: 5, height: 1) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}

        standardTile("resetmin", "device.energy", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state "default", label:'Reset Minimum', action:"resetmin", icon:"st.secondary.refresh-icon"
        }
        standardTile("resetmax", "device.energy", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state "default", label:'Reset Maximum', action:"resetmax", icon:"st.secondary.refresh-icon"
        }        
        standardTile("reset", "device.energy", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'Reset Energy', action:"reset", icon:"st.secondary.refresh-icon"
		}

        main (["powerDisp"])
        details(["powerDisp", "blankTile", "statusText", "refreshTile", "energyOne", "energyDisp", "energyTwo", "resetmin", "resetmax", "resetenergy", "reset", "refresh", "configure"])
        }

        preferences {
        	input "displayEvents", "boolean",
            	title: "Display all events in the Recently tab and the device's event log?", 
            	defaultValue: false,
                required: false,
            	displayDuringSetup: true
            input "kWhCost", "string",
            	title: "Enter your cost per kWh (or just use the default, or use 0 to not calculate):",
            	defaultValue: 0.16,
                required: false,                
            	displayDuringSetup: true
            input "wattsLimit", "number",
            	title: "Sometimes the HEM will send a wildly large watts value.  What limit should be in place so that it's not processed? (in watts)",
            	defaultValue: 20000,
                required: false,                
            	displayDuringSetup: true                
            input "reportType", "number", 
                title: "ReportType: Send watt/kWh data on a time interval (0), or on a change in wattage (1)? Enter a 0 or 1:",  
                defaultValue: 1, 
                required: false, 
                displayDuringSetup: true
            input "wattsChanged", "number", 
                title: "For ReportType = 1, Don't send unless watts have changed by this many watts: (range 0 - 32,000W)",  
                defaultValue: 50, 
                required: false, 
                displayDuringSetup: true
            input "wattsPercent", "number", 
                title: "For ReportType = 1, Don't send unless watts have changed by this percent: (range 0 - 99%)",  
                defaultValue: 10, 
                required: false, 
                displayDuringSetup: true
            input "secondsWatts", "number", 
                title: "For ReportType = 0, Send Watts data every how many seconds? (range 0 - 65,000 seconds)",  
                defaultValue: 15, 
                required: false, 
                displayDuringSetup: true
            input "secondsKwh", "number", 
                title: "For ReportType = 0, Send kWh data every how many seconds? (range 0 - 65,000 seconds)",  
                defaultValue: 60, 
                required: false, 
                displayDuringSetup: true
            input "secondsBattery", "number", 
                title: "(Not used in this DH) Send battery data every how many seconds? (range 0 - 65,000 seconds)",  
                defaultValue: 900, 
                required: false, 
                displayDuringSetup: true 
        }
}

def updated() {
	// Device-Watch simply pings if no device events received for 32min(checkInterval)
	sendEvent(name: "checkInterval", value: 2 * 15 * 60 + 2 * 60, displayed: false, data: [protocol: "zwave", hubHardwareId: device.hub.hardwareID])
    state.displayDisabled = ("true" == displayEvents)
    log.debug "updated (kWhCost: ${kWhCost}, wattsLimit: ${wattsLimit}, reportType: ${reportType}, wattsChanged: ${wattsChanged}, wattsPercent: ${wattsPercent}, secondsWatts: ${secondsWatts}, secondsKwh: ${secondsKwh}, secondsBattery: ${secondsBattery})"
    response(configure())
}

def parse(String description) {
//    log.debug "Parse received ${description}"
    def result = null
    def cmd = zwave.parse(description, [0x31: 1, 0x32: 1, 0x60: 3, 0x80: 1])
    if (cmd) {
        result = createEvent(zwaveEvent(cmd))
    }
//    if (result) log.debug "Parse returned ${result}"
    def statusTextmsg = ""
	statusTextmsg = "Min was ${device.currentState('powerOne')?.value}\nMax was ${device.currentState('powerTwo')?.value}\n"
    sendEvent("name":"statusText", "value":statusTextmsg)
    return result
}

def zwaveEvent(physicalgraph.zwave.commands.meterv1.MeterReport cmd) {
    //log.debug "zwaveEvent received ${cmd}"
    def dispValue
    def newValue
    def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    if (cmd.meterType == 33) {
        if (cmd.scale == 0) {
            newValue = cmd.scaledMeterValue
            if (newValue != state.energyValue) {
                dispValue = String.format("%5.2f",newValue)+"\nkWh"
                sendEvent(name: "energyDisp", value: dispValue as String, unit: "", displayed: false)
                state.energyValue = newValue
                BigDecimal costDecimal = newValue * ( kWhCost as BigDecimal)
                def costDisplay = String.format("%3.2f",costDecimal)
                sendEvent(name: "energyTwo", value: "Cost\n\$${costDisplay}", unit: "", displayed: false)
                if (state.displayDisabled) {
                	[name: "energy", value: newValue, unit: "kWh", displayed: true]
                } else {
                	[name: "energy", value: newValue, unit: "kWh", displayed: false]
                }
            }
        } else if (cmd.scale == 1) {
            newValue = cmd.scaledMeterValue
            if (newValue != state.energyValue) {
                dispValue = String.format("%5.2f",newValue)+"\nkVAh"
                sendEvent(name: "energyDisp", value: dispValue as String, unit: "", displayed: false)
                state.energyValue = newValue
                if (state.displayDisabled) {
                	[name: "energy", value: newValue, unit: "kVAh", displayed: true]
                } else {
                	[name: "energy", value: newValue, unit: "kVAh", displayed: false]
                }
            }
        }
        else if (cmd.scale==2) {                
            newValue = Math.round(cmd.scaledMeterValue*100)/100
            if (newValue <= 0) {newValue = state.powerValue}	// Don't want to see 0w or negative numbers as a valid minimum value (something isn't right with the meter)
			if (newValue < wattsLimit) {								// don't handle any wildly large readings due to firmware issues	
	            if (newValue != state.powerValue) {
	                dispValue = newValue+"w"
	                sendEvent(name: "powerDisp", value: dispValue as String, unit: "", displayed: false)
	                if (newValue < state.powerLow) {
	                    dispValue = newValue+"w"+" on "+timeString
	                    sendEvent(name: "powerOne", value: dispValue as String, unit: "", displayed: false)
	                    state.powerLow = newValue
	                }
	                if (newValue > state.powerHigh) {
	                    dispValue = newValue+"w"+" on "+timeString
	                    sendEvent(name: "powerTwo", value: dispValue as String, unit: "", displayed: false)
	                    state.powerHigh = newValue
	                }
	                state.powerValue = newValue
                    if (state.displayDisabled) {
                        [name: "power", value: newValue, unit: "W", displayed: true]
                    } else {
                        [name: "power", value: newValue, unit: "W", displayed: false]
                    }
	            }
			}            
        }
    }
}

def zwaveEvent(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
    def map = [:]
    map.name = "battery"
    map.unit = "%"
    if (cmd.batteryLevel == 0xFF) {
        map.value = 1
        map.descriptionText = "${device.displayName} has a low battery"
        map.isStateChange = true
    } else {
        map.value = cmd.batteryLevel
        sendEvent(name: "battery", value: map.value as String, displayed: false)
    }
    return map
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
    // Handles all Z-Wave commands we aren't interested in
    log.debug "Unhandled event ${cmd}"
    [:]
}

def refresh() {
    log.debug "Refreshed ${device.name}"
    delayBetween([
    zwave.meterV2.meterGet(scale: 0).format(),
    zwave.meterV2.meterGet(scale: 2).format()
	])
}

def poll() {
    refresh()
}

// PING is used by Device-Watch in attempt to reach the Device
def ping() {
	refresh()
}

def reset() {
    log.debug "${device.name} reset kWh/Cost values"

	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "energyOne", value: "Energy Data (kWh/Cost) Reset On:\n"+timeString, unit: "")       
    sendEvent(name: "energyDisp", value: "", unit: "")
    sendEvent(name: "energyTwo", value: "Cost\n--", unit: "")

    def cmd = delayBetween( [
        zwave.meterV2.meterReset().format(),
        zwave.meterV2.meterGet(scale: 0).format(),
    	zwave.meterV2.meterGet(scale: 2).format()
    ])
    
    cmd
}

def resetmin() {
    log.debug "${device.name} reset minimum watt value"
    state.powerLow = 99999
    
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "energyOne", value: "Watts Data Minimum Value Reset On:\n"+timeString, unit: "")
    sendEvent(name: "powerOne", value: "", unit: "")    

    def cmd = delayBetween( [
        zwave.meterV2.meterGet(scale: 0).format(),
    	zwave.meterV2.meterGet(scale: 2).format()
    ])
    
    cmd
}

def resetmax() {
    log.debug "${device.name} reset maximum watt value"
    state.powerHigh = 0
    
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "energyOne", value: "Watts Data Maximum Value Reset On:\n"+timeString, unit: "")    
    sendEvent(name: "powerTwo", value: "", unit: "")    

    def cmd = delayBetween( [
        zwave.meterV2.meterGet(scale: 0).format(),
    	zwave.meterV2.meterGet(scale: 2).format()
    ])
    
    cmd
}

def resetMeter() {
	log.debug "Resetting all home energy meter values..."
    state.powerHigh = 0
    state.powerLow = 99999
    sendEvent(name: "powerOne", value: "", unit: "")
	sendEvent(name: "powerTwo", value: "", unit: "")
    sendEvent(name: "energyDisp", value: "", unit: "")
    sendEvent(name: "energyTwo", value: "Cost\n--", unit: "")
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "energyOne", value: "Aeon HEM was reset on "+timeString, unit: "")
    def cmd = delayBetween( [
        zwave.meterV2.meterReset().format(),
        zwave.meterV2.meterGet(scale: 0).format(),
    	zwave.meterV2.meterGet(scale: 2).format()
    ])
    cmd
}

def configure() {
    log.debug "${device.name} configuring..."
    
    if (reportType == 0) {
		log.debug "Setting reportType to ${reportType} per user request."
	} else if (reportType == 1) {
		log.debug "Setting reportType to ${reportType} per user request."
	}
    else {
        def reportType = 1
        log.debug "Setting reportType to ${reportType} because an invalid value was provided."
    }
    
    if (wattsChanged < 0) {
        def wattsChanged = 50
        log.debug "Setting wattsChanged to ${wattsChanged} (device default) because an invalid value was provided."
	} else if (wattsChanged < 32001) {
		log.debug "Setting wattsChanged to ${wattsChanged} per user request."
	}
    else {
        def wattsChanged = 50
        log.debug "Setting wattsChanged to ${wattsChanged} (device default) because an invalid value was provided."
    }    

    if (wattsPercent < 0) {
        def wattsPercent = 10
        log.debug "Setting wattsPercent to ${wattsPercent} (device default) because an invalid value was provided."
	} else if (wattsPercent < 100) {
		log.debug "Setting wattsPercent to ${wattsPercent} per user request."
	}
    else {
        def wattsPercent = 10
        log.debug "Setting wattsPercent to ${wattsPercent} (device default) because an invalid value was provided."
    } 

    if (secondsWatts < 0) {
        def secondsWatts = 600
        log.debug "Setting secondsWatts to ${secondsWatts} (device default) because an invalid value was provided."
	} else if (secondsWatts < 65000) {
		log.debug "Setting secondsWatts to ${secondsWatts} per user request."
	}
    else {
        def secondsWatts = 600
        log.debug "Setting secondsWatts to ${secondsWatts} (device default) because an invalid value was provided."
    } 

    if (secondsKwh < 0) {
        def secondsKwh = 600
        log.debug "Setting secondsKwh to ${secondsKwh} (device default) because an invalid value was provided."
	} else if (secondsKwh < 65000) {
		log.debug "Setting secondsKwh to ${secondsKwh} per user request."
	}
    else {
        def secondsKwh = 600
        log.debug "Setting secondsKwh to ${secondsKwh} (device default) because an invalid value was provided."
    }

    if (secondsBattery < 0) {
        def secondsBattery = 3600
        log.debug "Setting secondsBattery to ${secondsBattery} (device default) because an invalid value was provided."
	} else if (secondsBattery < 65000) {
		log.debug "Setting secondsBattery to ${secondsBattery} per user request."
	}
    else {
        def secondsBattery = 3600
        log.debug "Setting secondsBattery to ${secondsBattery} (device default) because an invalid value was provided."
    }

    def cmd = delayBetween([

 	// Performs a complete factory reset.  Use this all by itself and comment out all others below.  Once reset, comment this line out and uncomment the others to go back to normal
//  zwave.configurationV1.configurationSet(parameterNumber: 255, size: 4, scaledConfigurationValue: 1).format()

	// Accumulate kWh energy when Battery Powered. By default this is disabled to assist saving battery power. (0 == disable, 1 == enable)
	zwave.configurationV1.configurationSet(parameterNumber: 12, size: 1, scaledConfigurationValue: 1).format(),	    
	    
    // Send data based on a time interval (0), or based on a change in wattage (1).  0 is default and enables parameters 111, 112, and 113. 1 enables parameters 4 and 8.
    zwave.configurationV1.configurationSet(parameterNumber: 3, size: 1, scaledConfigurationValue: reportType).format(),
        
    // If parameter 3 is 1, don't send unless watts have changed by 50 <default> for the whole device.   
    zwave.configurationV1.configurationSet(parameterNumber: 4, size: 2, scaledConfigurationValue: wattsChanged).format(),
        
    // If parameter 3 is 1, don't send unless watts have changed by 10% <default> for the whole device.        
    zwave.configurationV1.configurationSet(parameterNumber: 8, size: 1, scaledConfigurationValue: wattsPercent).format(),

	// Defines the type of report sent for Reporting Group 1 for the whole device.  1->Battery Report, 4->Meter Report for Watt, 8->Meter Report for kWh
    zwave.configurationV1.configurationSet(parameterNumber: 101, size: 4, scaledConfigurationValue: 4).format(), //watts

    // If parameter 3 is 0, report every XX Seconds (for Watts) for Reporting Group 1 for the whole device.
	zwave.configurationV1.configurationSet(parameterNumber: 111, size: 4, scaledConfigurationValue: secondsWatts).format(),

    // Defines the type of report sent for Reporting Group 2 for the whole device.  1->Battery Report, 4->Meter Report for Watt, 8->Meter Report for kWh
    zwave.configurationV1.configurationSet(parameterNumber: 102, size: 4, scaledConfigurationValue: 8).format(), //kWh

    // If parameter 3 is 0, report every XX seconds (for kWh) for Reporting Group 2 for the whole device.
	zwave.configurationV1.configurationSet(parameterNumber: 112, size: 4, scaledConfigurationValue: secondsKwh).format(),

	// Defines the type of report sent for Reporting Group 3 for the whole device.  1->Battery Report, 4->Meter Report for Watt, 8->Meter Report for kWh
    zwave.configurationV1.configurationSet(parameterNumber: 103, size: 4, scaledConfigurationValue: 1).format(), //battery
    
    // If parameter 3 is 0, report every XX seconds (for battery) for Reporting Group 2 for the whole device.    
    zwave.configurationV1.configurationSet(parameterNumber: 113, size: 4, scaledConfigurationValue: secondsBattery).format()
        
    ])

    cmd
}