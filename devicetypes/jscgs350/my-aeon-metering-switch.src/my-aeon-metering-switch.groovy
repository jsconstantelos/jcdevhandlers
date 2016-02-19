/**
 *  Aeon Metering Switch
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
 *  Version: v2
 *
 *  Updates:
 *  -------
 *  02-16-2016 : Removed posting to the Activity Feed (Recently tab) in the phone app and event log.
 *  02-17-2017 : Added the ability to change the icon
 *
 */
metadata {
	// Automatically generated. Make future change here.
	definition (name: "My Aeon Metering Switch", namespace: "jscgs350", author: "SmartThings") {
		capability "Energy Meter"
		capability "Actuator"
		capability "Switch"
		capability "Power Meter"
		capability "Polling"
		capability "Refresh"
		capability "Sensor"
        capability "Configuration"
        capability "Sensor"

        attribute "power", "string"
        attribute "powerDisp", "string"
        attribute "powerOne", "string"
        attribute "powerTwo", "string"
        
        attribute "energyDisp", "string"
        attribute "energyOne", "string"
        
        command "reset"
        command "configure"
        
		fingerprint inClusters: "0x25,0x32"
	}

    preferences {
        input "disableOnOff", "boolean", 
            title: "Disable On/Off switch?", 
            defaultValue: false, 
            displayDuringSetup: true
        input "debugOutput", "boolean", 
            title: "Enable debug logging?", 
            defaultValue: false, 
            displayDuringSetup: true
    }

	tiles(scale: 2) {
		multiAttributeTile(name:"switch", type: "lighting", width: 6, height: 4, decoration: "flat", canChangeIcon: true, canChangeBackground: true){
			tileAttribute ("device.switch", key: "PRIMARY_CONTROL") {
				attributeState "on", label: '${name}', action: "switch.off", icon: "st.switches.switch.on", backgroundColor: "#79b821"
				attributeState "off", label: '${name}', action: "switch.on", icon: "st.switches.switch.off", backgroundColor: "#ffffff"
			}
            tileAttribute ("statusText", key: "SECONDARY_CONTROL") {
           		attributeState "statusText", label:'${currentValue}'       		
            }
		}

// Watts row

        valueTile("powerDisp", "device.powerDisp", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
            state ("default", icon: "st.secondary.activity", label:'Now ${currentValue}')
        }
        
        valueTile("powerOne", "device.powerOne", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
            state("default", label:'Low ${currentValue}')
        }
        
        valueTile("powerTwo", "device.powerTwo", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
            state("default", label:'High ${currentValue}')
        }
//

		valueTile("energy", "device.energy", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'${currentValue} kWh'
		}
        valueTile("energyOne", "device.energyOne", width: 6, height: 2, inactiveLabel: false, decoration: "flat") {
            state("default", label: '${currentValue}', backgroundColor:"#ffffff")
        } 
        standardTile("reset", "device.energy", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'Reset ALL', action:"reset", icon:"st.secondary.refresh-icon"
		}
		standardTile("configure", "device.power", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "configure", label:'', action:"configuration.configure", icon:"st.secondary.configure"
		}
		standardTile("refresh", "device.power", width: 2, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'', action:"refresh.refresh", icon:"st.secondary.refresh"
		}
        valueTile("statusText", "statusText", inactiveLabel: false, width: 2, height: 2) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}
		main "powerDisp"
		details(["switch", "energyOne", "refresh","reset","configure"])
	}
}

def updated() {
    state.onOffDisabled = ("true" == disableOnOff)
    state.debug = ("true" == debugOutput)
    log.debug "updated(disableOnOff: ${disableOnOff}(${state.onOffDisabled}), debugOutput: ${debugOutput}(${state.debug}))"
    response(configure())
}

def parse(String description) {
	def result = null
	def cmd = zwave.parse(description, [0x20: 1, 0x32: 1])
	if (cmd) {
		result = createEvent(zwaveEvent(cmd))
	}
        
    def statusTextmsg = ""
    statusTextmsg = "Currently using ${device.currentState('powerDisp')?.value} (total consumed ${device.currentState('energy')?.value}kWh).\nMaximum of ${device.currentState('powerTwo')?.value}"
    sendEvent("name":"statusText", "value":statusTextmsg)
    if (state.debug) log.debug statusTextmsg

	return result
}

def zwaveEvent(physicalgraph.zwave.commands.meterv1.MeterReport cmd) {
    if (state.debug) log.debug "zwaveEvent received ${cmd}"
    def dispValue
    def newValue
    def timeString = new Date().format("yyyy-MM-dd h:mm a", location.timeZone)
	if (cmd.scale == 0) {
		[name: "energy", value: cmd.scaledMeterValue, unit: "kWh", displayed: false]
	} else if (cmd.scale == 1) {
		[name: "energy", value: cmd.scaledMeterValue, unit: "kVAh", displayed: false]
	}
	else {
            newValue = Math.round( cmd.scaledMeterValue )       // really not worth the hassle to show decimals for Watts
//			newValue = cmd.scaledMeterValue
            if (newValue != state.powerValue) {
                dispValue = newValue+"w"
                sendEvent(name: "powerDisp", value: dispValue, unit: "", displayed: false)
                
                if (newValue < state.powerLow) {
                    dispValue = newValue+"w"+"on "+timeString
                    sendEvent(name: "powerOne", value: dispValue as String, unit: "", displayed: false)
                    state.powerLow = newValue
                }
                if (newValue > state.powerHigh) {
                    dispValue = newValue+"w "+"on "+timeString
                    sendEvent(name: "powerTwo", value: dispValue as String, unit: "", displayed: false)
                    state.powerHigh = newValue
                }
                state.powerValue = newValue
                [name: "power", value: newValue, unit: "W", displayed: false]
            }
	}
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicReport cmd)
{
	[
		name: "switch", value: cmd.value ? "on" : "off", type: "physical"
	]
}

def zwaveEvent(physicalgraph.zwave.commands.switchbinaryv1.SwitchBinaryReport cmd)
{
	[
		name: "switch", value: cmd.value ? "on" : "off", type: "digital"
	]
}

def zwaveEvent(physicalgraph.zwave.Command cmd) {
	// Handles all Z-Wave commands we aren't interested in
	[:]
}

def on() {
    if (state.onOffDisabled) {
        if (state.debug) log.debug "On/Off disabled"
        delayBetween([
            zwave.basicV1.basicGet().format(),
            zwave.switchBinaryV1.switchBinaryGet().format()
        ], 5)
    }
    else {
        delayBetween([
            zwave.basicV1.basicSet(value: 0xFF).format(),
            zwave.switchBinaryV1.switchBinaryGet().format()
        ])
    }
}


def off() {
    if (state.onOffDisabled) {
        if (state.debug) log.debug "On/Off disabled"
        delayBetween([
            zwave.basicV1.basicGet().format(),
            zwave.switchBinaryV1.switchBinaryGet().format()
        ], 5)
    }
    else {
        delayBetween([
            zwave.basicV1.basicSet(value: 0x00).format(),
            zwave.switchBinaryV1.switchBinaryGet().format()
        ])
    }
}

def poll() {
    refresh()
}

def refresh() {
    if (state.debug) log.debug "${device.name} refresh"
	delayBetween([
		zwave.switchBinaryV1.switchBinaryGet().format(),
		zwave.meterV2.meterGet(scale: 0).format(),
		zwave.meterV2.meterGet(scale: 2).format()
	])
}

def reset() {
    if (state.debug) log.debug "${device.name} reset"

    state.powerHigh = 0
    state.powerLow = 99999
    
	def timeString = new Date().format("yyyy-MM-dd h:mm a", location.timeZone)
    sendEvent(name: "energyOne", value: "Last Reset On:\n"+timeString, unit: "")
    sendEvent(name: "powerOne", value: "", unit: "")    
    sendEvent(name: "powerDisp", value: "", unit: "")    
    sendEvent(name: "powerTwo", value: "", unit: "")    

    def cmd = delayBetween( [
        zwave.meterV2.meterReset().format(),
        zwave.meterV2.meterGet(scale: 0).format()
    ])
    
    cmd
}

def configure() {
    if (state.debug) log.debug "${device.name} configure"
	delayBetween([
    zwave.configurationV1.configurationSet(parameterNumber: 3, size: 1, scaledConfigurationValue: 1).format(),      // Disable selective reporting, so always update based on schedule below <set to 1 to reduce network traffic>
    zwave.configurationV1.configurationSet(parameterNumber: 4, size: 2, scaledConfigurationValue: 5).format(),     // (DISABLED by first option) Don't send unless watts have changed by 50 <default>
    zwave.configurationV1.configurationSet(parameterNumber: 8, size: 1, scaledConfigurationValue: 10).format(),     // (DISABLED by first option) Or by 10% <default>
    
    zwave.configurationV1.configurationSet(parameterNumber: 101, size: 4, scaledConfigurationValue: 4).format(),   // Combined energy in Watts
    zwave.configurationV1.configurationSet(parameterNumber: 111, size: 4, scaledConfigurationValue: 15).format(),   // Every 15 Seconds (for Watts)
    
    zwave.configurationV1.configurationSet(parameterNumber: 102, size: 4, scaledConfigurationValue: 8).format(),    // Combined energy in kWh
    zwave.configurationV1.configurationSet(parameterNumber: 112, size: 4, scaledConfigurationValue: 60).format(),  // every 60 seconds (for kWh)
    
    zwave.configurationV1.configurationSet(parameterNumber: 103, size: 4, scaledConfigurationValue: 0).format(),    // Disable report 3
    zwave.configurationV1.configurationSet(parameterNumber: 113, size: 4, scaledConfigurationValue: 0).format()   // Disable report 3
	])
}