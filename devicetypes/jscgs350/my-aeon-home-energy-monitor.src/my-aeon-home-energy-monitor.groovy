/**
 *  Aeon HEM1
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
 *  Aeon Home Energy Meter v1 (US)
 *
 *  Version: v3
 *
 *  Updates:
 *  -------
 *  02-15-2016 : Removed posting to the Activity Feed in the phone app and event log.
 *  02-17-2016 : Fixed preferences for kWh cost from string to number.
 *  02-20-2016 : Enabled battery reporting (parameter 103, value 1), and documented the parameters better.
 *
 */
metadata {
    definition (name: "My Aeon Home Energy Monitor", namespace: "jscgs350", author: "SmartThings") 
{
    capability "Energy Meter"
    capability "Power Meter"
    capability "Configuration"
    capability "Sensor"
    capability "Refresh"
    capability "Polling"
    capability "Battery"
    
    attribute "energy", "string"
    attribute "energyDisp", "string"
    attribute "energyOne", "string"
    attribute "energyTwo", "string"
    
    attribute "power", "string"
    attribute "powerDisp", "string"
    attribute "powerOne", "string"
    attribute "powerTwo", "string"
    
    command "reset"
    command "configure"
    command "resetmaxmin"
    
    fingerprint deviceId: "0x2101", inClusters: " 0x70,0x31,0x72,0x86,0x32,0x80,0x85,0x60"

}
// tile definitions
	tiles(scale: 2) {
		multiAttributeTile(name:"powerDisp", type: "lighting", width: 6, height: 4, decoration: "flat", canChangeIcon: true, canChangeBackground: true){
			tileAttribute ("device.powerDisp", key: "PRIMARY_CONTROL") {
				attributeState "default", action: "refresh", label: '${currentValue}', icon: "st.switches.light.on", backgroundColor: "#79b821"
			}
            tileAttribute ("statusText", key: "SECONDARY_CONTROL") {
           		attributeState "statusText", label:'${currentValue}'       		
            }
		}    

        valueTile("energyDisp", "device.energyDisp", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state("default", label: '${currentValue}', backgroundColor:"#ffffff")
        }
        valueTile("energyOne", "device.energyOne", width: 6, height: 2, inactiveLabel: false, decoration: "flat") {
            state("default", label: '${currentValue}', backgroundColor:"#ffffff")
        }        
        valueTile("energyTwo", "device.energyTwo", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state("default", label: '${currentValue}', backgroundColor:"#ffffff")
        }

    	standardTile("refresh", "device.power", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
        	state "default", label:'', action:"refresh.refresh", icon:"st.secondary.refresh"
    	}
    	standardTile("configure", "device.power", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
        	state "configure", label:'', action:"configure", icon:"st.secondary.configure"
    	}
    
        valueTile("battery", "device.battery", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state "battery", label:'${currentValue}%\nbattery', unit:""
        }
    
        valueTile("statusText", "statusText", width: 3, height: 2, inactiveLabel: false) {
            state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
        }

        valueTile("min", "powerOne", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state "default", label:'Min:\n${currentValue}', backgroundColor:"#ffffff"
        }

        valueTile("max", "powerTwo", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state "default", label:'Max:\n${currentValue}', backgroundColor:"#ffffff"
        }

        standardTile("resetmaxmin", "device.energy", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
            state "default", label:'Reset\nWatts', action:"resetmaxmin", icon:"st.secondary.refresh-icon"
        }
        standardTile("reset", "device.energy", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'Reset\nEnergy', action:"reset", icon:"st.secondary.refresh-icon"
		}
          
        main (["powerDisp"])
        details(["powerDisp", "battery", "energyDisp", "energyTwo", "energyOne", "resetmaxmin", "resetenergy", "reset", "refresh", "configure"])
        }

        preferences {
            input "kWhCost", "number", title: "\$/kWh (0.16)", defaultValue: "0.16" as String, displayDuringSetup: true
        }
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
    statusTextmsg = "Min was ${device.currentState('powerOne')?.value}\nMax was ${device.currentState('powerTwo')?.value}"
    sendEvent("name":"statusText", "value":statusTextmsg)
//    log.debug statusTextmsg
    return result
}

def zwaveEvent(physicalgraph.zwave.commands.meterv1.MeterReport cmd) {
    //log.debug "zwaveEvent received ${cmd}"
    def dispValue
    def newValue
    def timeString = new Date().format("yyyy-MM-dd h:mm a", location.timeZone)
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
                [name: "energy", value: newValue, unit: "kWh", displayed: false]
            }
        } else if (cmd.scale == 1) {
            newValue = cmd.scaledMeterValue
            if (newValue != state.energyValue) {
                dispValue = String.format("%5.2f",newValue)+"\nkVAh"
                sendEvent(name: "energyDisp", value: dispValue as String, unit: "", displayed: false)
                state.energyValue = newValue
                [name: "energy", value: newValue, unit: "kVAh", displayed: false]
            }
        }
        else if (cmd.scale==2) {                
            newValue = Math.round( cmd.scaledMeterValue )       // really not worth the hassle to show decimals for Watts
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
                [name: "power", value: newValue, unit: "W", displayed: false]
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

def reset() {
    log.debug "${device.name} reset kWh/Cost values"
    state.powerHigh = 0
	state.powerLow = 99999

	def timeString = new Date().format("yyyy-MM-dd h:mm a", location.timeZone)
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

def resetmaxmin() {
    log.debug "${device.name} reset max/min values"
    state.powerHigh = 0
    state.powerLow = 99999
    
	def timeString = new Date().format("yyyy-MM-dd h:mm a", location.timeZone)
    sendEvent(name: "energyOne", value: "Watts Data (min/max) Reset On:\n"+timeString, unit: "")
    sendEvent(name: "powerOne", value: "", unit: "")    
    sendEvent(name: "powerTwo", value: "", unit: "")    

    def cmd = delayBetween( [
        zwave.meterV2.meterGet(scale: 0).format(),
    	zwave.meterV2.meterGet(scale: 2).format()
    ])
    
    cmd
}

def configure() {
    log.debug "${device.name} configuring device"
    def cmd = delayBetween([

 	// Performs a complete factory reset.  Use this all by itself and comment out all others below.  Once reset, comment this line out and uncomment the others to go back to normal
//  zwave.configurationV1.configurationSet(parameterNumber: 255, size: 4, scaledConfigurationValue: 1).format()

    // Send data based on a time interval (0), or based on a change in wattage (1).  0 is default and enables parameters 111, 112, and 113. 1 enables parameters 4 and 8.
    zwave.configurationV1.configurationSet(parameterNumber: 3, size: 1, scaledConfigurationValue: 1).format(),
        
    // If parameter 3 is 1, don't send unless watts have changed by 50 <default> for the whole device.   
    zwave.configurationV1.configurationSet(parameterNumber: 4, size: 2, scaledConfigurationValue: 5).format(),
        
    // If parameter 3 is 1, don't send unless watts have changed by 10% <default> for the whole device.        
    zwave.configurationV1.configurationSet(parameterNumber: 8, size: 1, scaledConfigurationValue: 5).format(),

	// Defines the type of report sent for Reporting Group 1 for the whole device.  1->Battery Report, 4->Meter Report for Watt, 8->Meter Report for kWh
    zwave.configurationV1.configurationSet(parameterNumber: 101, size: 4, scaledConfigurationValue: 4).format(), //watts

    // If parameter 3 is 0, report every 15 Seconds (for Watts) for Reporting Group 1 for the whole device.
	zwave.configurationV1.configurationSet(parameterNumber: 111, size: 4, scaledConfigurationValue: 15).format(),

    // Defines the type of report sent for Reporting Group 2 for the whole device.  1->Battery Report, 4->Meter Report for Watt, 8->Meter Report for kWh
    zwave.configurationV1.configurationSet(parameterNumber: 102, size: 4, scaledConfigurationValue: 8).format(), //kWh

    // If parameter 3 is 0, report every 60 seconds (for kWh) for Reporting Group 2 for the whole device.
	zwave.configurationV1.configurationSet(parameterNumber: 112, size: 4, scaledConfigurationValue: 60).format(),

	// Defines the type of report sent for Reporting Group 3 for the whole device.  1->Battery Report, 4->Meter Report for Watt, 8->Meter Report for kWh
    zwave.configurationV1.configurationSet(parameterNumber: 103, size: 4, scaledConfigurationValue: 1).format(), //battery
    
    // If parameter 3 is 0, report every 15 minutes (for battery) for Reporting Group 2 for the whole device.    
    zwave.configurationV1.configurationSet(parameterNumber: 113, size: 4, scaledConfigurationValue: 900).format() //900 seconds
        
    ])

    cmd
}