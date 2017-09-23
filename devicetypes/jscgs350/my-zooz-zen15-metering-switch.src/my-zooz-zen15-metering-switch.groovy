/**
 *  Zooz ZEN15 Metering Switch
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
 *  09-23-2016 : Initial Commit.
 *
 */
metadata {
	definition (name: "My Zooz ZEN15 Metering Switch", namespace: "jscgs350", author: "SmartThings") {
		capability "Energy Meter"
		capability "Actuator"
		capability "Switch"
        capability "Outlet"
		capability "Power Meter"
		capability "Polling"
		capability "Refresh"
		capability "Sensor"
		capability "Voltage Measurement"
		capability "Configuration"
		capability "Refresh"
		capability "Health Check"

        attribute "current", "number"
		attribute "kwhCosts", "string"
		attribute "history", "string"
        attribute "powerLow", "string"
        attribute "powerHigh", "string"
        attribute "voltageLow", "string"
        attribute "voltageHigh", "string"
        attribute "currentLow", "string"
        attribute "currentHigh", "string"
        
		command "resetWatts"
		command "resetEnergy"
		command "resetVolts"
        command "resetAmps"
		command "resetMeter"
        command "configure"
        command "refreshHistory"
	}

    preferences {
        input "disableOnOff", "boolean", title: "Disable On/Off switch?", defaultValue: false, displayDuringSetup: true
        input "debugOutput", "boolean", title: "Enable debug logging?", defaultValue: false, displayDuringSetup: true
        input "displayEvents", "boolean", title: "Display all events in the Recently tab and the device's event log?", defaultValue: false, required: false, displayDuringSetup: true
        input "kWhCost", "string", title: "Enter your cost per kWh (or just use the default, or use 0 to not calculate):", defaultValue: 0.16, required: false, displayDuringSetup: true
        input "decimalPositions", "number", title: "How many decimal positions do you want to display? (range 0 - 3)", defaultValue: 3, range: "0..3", required: false, displayDuringSetup: true
        input "overloadProtection", "number", title: "Overload protection will turn the switch relay off once power exceeds 16.5A for over 5 seconds.  We DO NOT recommend changing this parameter’s value as it may result in device damage and malfunction. Values: 0 – Disabled; 1 – Enabled (DEFAULT).", defaultValue: 1, range: "0..1", required: false, displayDuringSetup: true
        input "powerFailureRecovery", "number", title: "Choose the recovery state if a power outage occurs.  0 – Switch remembers the state prior to power outage (DEFAULT); 1 – Switch automatically turns ON once power is restored; 2 – Switch automatically turns OFF once power is restored.", defaultValue: 0, range: "0..2", required: false, displayDuringSetup: true
        input "ledIndicator", "number", title: "LED Indicator Control.  0 – LED indicator will always be on (DEFAULT); 1 – LED indicator will stay on for only 5 seconds only whenever the device is turned on or off.", defaultValue: 1, range: "0..1", required: false, displayDuringSetup: true
        input "onoffNotifications", "number", title: "On/Off Status Change Notifications.  0 – disabled (no notifications!); 1 – sends notification if status is changed manually or remotely via Z-Wave (DEFAULT); 2 – sends notification ONLY if status is changed manually.", defaultValue: 1, range: "0..2", required: false, displayDuringSetup: true
        input "wattsChanged", "number", title: "Power Report Value Threshold.  Send values for watts when they've changed by this amount from the previous value.  If you have report frequency enabled, then consider diabling this or setting it high.  0 disables the switch from sending values. (range 0 - 65,535W)", defaultValue: 50, range: "0..65535", required: false, displayDuringSetup: true
        input "wattsPercent", "number", title: "Power Report Percentage Threshold.  Send values for watts when they've changed by this percent from the previous value.  If you have report frequency enabled, then consider diabling this or setting it high. 0 disables the switch from sending values. (range 0 - 99%)", defaultValue: 10, range: "0..99", required: false, displayDuringSetup: true
        input "secondsWatts", "number", title: "Power Report Frequency.  Send values for watts every X amount of seconds.  If you have the other watt thresholds set very low, then this value should be 0 (disabled) or very high.  0 disables the switch from sending values. (range 0 - 2,678,400 seconds)", defaultValue: 120, range: "0..2678400", required: false, displayDuringSetup: true
        input "secondsKwh", "number", title: "Energy Report Frequency. Send kWh data every how many seconds.  0 disables the switch from sending values. (range 0 - 2,678,400 seconds)", defaultValue: 300, range: "0..2678400", required: false, displayDuringSetup: true
        input "secondsVolts", "number", title: "Voltage Report Frequency. Send volts data every how many seconds.  0 disables the switch from sending values. (range 0 - 2,678,400 seconds)", defaultValue: 0, range: "0..2678400", required: false, displayDuringSetup: true
        input "secondsAmps", "number", title: "Electricity Report Frequency. Send Amps data every how many seconds.  0 disables the switch from sending values. (range 0 - 2,678,400 seconds)", defaultValue: 0, range: "0..2678400", required: false, displayDuringSetup: true
    }

	tiles(scale: 2) {
		multiAttributeTile(name:"switch", type: "generic", width: 6, height: 4, decoration: "flat"){
			tileAttribute ("device.switch", key: "PRIMARY_CONTROL") {
				attributeState "on", label: '${name}', action: "switch.off", icon: "st.switches.switch.on", backgroundColor: "#00A0DC"
				attributeState "off", label: '${name}', action: "switch.on", icon: "st.switches.switch.off", backgroundColor: "#ffffff"
			}
            tileAttribute ("power", key: "SECONDARY_CONTROL") {
           		attributeState "device.power", label:'Currently using ${currentValue} watts', icon: "https://raw.githubusercontent.com/constjs/jcdevhandlers/master/img/device-activity-tile@2x.png"
            }
        }
		standardTile("energy", "device.energy", width: 3, height: 1, decoration: "flat") {
			state "energy", label:'${currentValue} kWh'
		}
		valueTile("kwhCosts", "device.kwhCosts", width: 3, height: 1, inactiveLabel: false, decoration: "flat") {
			state("default", label: 'Cost ${currentValue}', backgroundColor:"#ffffff")
		}
		standardTile("voltage", "device.voltage", width: 3, height: 1, decoration: "flat") {
			state "voltage", label:'${currentValue} volts'
		}
		standardTile("current", "device.current", width: 3, height: 1, decoration: "flat") {
			state "current", label:'${currentValue} amps'
		}
		standardTile("refresh", "device.refresh", width: 6, height: 2, decoration: "flat") {
			state "refresh", label:'Refresh', action: "refresh", icon:"st.secondary.refresh-icon"
		}
		standardTile("resetWatts", "device.resetWatts", width: 3, height: 1, decoration: "flat") {
			state "default", label:'Reset Watts Min/Max', action: "resetWatts", icon:"st.secondary.refresh-icon"
		}
		standardTile("resetEnergy", "device.resetEnergy", width: 3, height: 1, decoration: "flat") {
			state "default", label:'Reset kWh/Costs', action: "resetEnergy", icon:"st.secondary.refresh-icon"
		}
		standardTile("resetVolts", "device.resetVolts", width: 3, height: 1, decoration: "flat") {
			state "default", label:'Reset Volts Min/Max', action: "resetVolts", icon:"st.secondary.refresh-icon"
		}
		standardTile("resetAmps", "device.resetAmps", width: 3, height: 1, decoration: "flat") {
			state "default", label:'Reset Amps Min/Max', action: "resetAmps", icon:"st.secondary.refresh-icon"
		}
		standardTile("history", "device.history", decoration:"flat",width: 6, height: 3) {
			state "history", label:'${currentValue}', action: "refreshHistory"
		}
		standardTile("power2", "device.power", width: 3, height: 1, decoration: "flat") {
			state "power", icon: "st.secondary.activity", label:'${currentValue} W'
		}
		main "power2"
		details(["switch", "energy", "kwhCosts", "voltage", "current", "history", "resetWatts", "resetEnergy", "resetVolts", "resetAmps", "refresh"])
	}
}

def updated() {
	// Device-Watch simply pings if no device events received for 32min(checkInterval)
	sendEvent(name: "checkInterval", value: 2 * 15 * 60 + 2 * 60, displayed: false, data: [protocol: "zwave", hubHardwareId: device.hub.hardwareID])
    state.onOffDisabled = ("true" == disableOnOff)
    state.debug = ("true" == debugOutput)
    state.displayDisabled = ("true" == displayEvents)
    log.debug "Updated: disableOnOff: ${disableOnOff}(${state.onOffDisabled}), debugOutput: ${debugOutput}(${state.debug}), displayEvents: ${displayEvents}(${state.displayDisabled})"
    log.debug "overloadProtection: ${overloadProtection}, powerFailureRecovery: ${powerFailureRecovery}, ledIndicator: ${ledIndicator}, onoffNotifications: ${onoffNotifications}, wattsChanged: ${wattsChanged}, wattsPercent: ${wattsPercent}, secondsWatts: ${secondsWatts}, secondsKwh: ${secondsKwh}, secondsVolts: ${secondsVolts}, secondsAmps: ${secondsAmps}, decimalPositions: ${decimalPositions})"
    response(configure())
}

def parse(String description) {
	if (state.debug) log.debug "Incoming to parse: ${description}"
	def result = null
	def cmd = zwave.parse(description, [0x20: 1, 0x25: 1, 0x27: 1, 0x2B: 1, 0x2C: 1, 0x32: 3, 0x59: 1, 0x5A: 1,	0x5E: 2, 0x70: 2, 0x72: 2, 0x73: 1, 0x7A: 2, 0x85: 2, 0x86: 1, 0x98: 1])
	if (cmd) {
		result = zwaveEvent(cmd)		
	}
	else {
		log.warn "Unable to parse: $description"
	}
	return result
}

def zwaveEvent(physicalgraph.zwave.commands.meterv3.MeterReport cmd) {
    def dispValue
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    if (cmd.scale == 0) {
        if (cmd.scaledMeterValue != state.energyValue) {
            state.energyValue = cmd.scaledMeterValue
            if (decimalPositions == 2) {
                dispValue = String.format("%3.2f",cmd.scaledMeterValue)
            } else if (decimalPositions == 1) {
                dispValue = String.format("%3.1f",cmd.scaledMeterValue)
            } else if (decimalPositions == 0) {
                dispValue = Math.round(cmd.scaledMeterValue)
            } else {
                dispValue = String.format("%3.3f",cmd.scaledMeterValue)
            }
            BigDecimal costDecimal = cmd.scaledMeterValue * (kWhCost as BigDecimal)
            def costDisplay = "\$"
            costDisplay += String.format("%3.2f",costDecimal)
            sendEvent(name: "kwhCosts", value: costDisplay as String, unit: "", displayed: false)
            if (state.displayDisabled) {
                sendEvent(name: "energy", value: dispValue, unit: "kWh", displayed: true)
            } else {
            	sendEvent(name: "energy", value: dispValue, unit: "kWh", displayed: false)
            }
        }
    } else if (cmd.scale==2) {
        if (cmd.scaledMeterValue < 2000) {
            if (cmd.scaledMeterValue != state.powerValue) {
                state.powerValue = cmd.scaledMeterValue
                if (decimalPositions == 2) {
                    dispValue = String.format("%3.2f",cmd.scaledMeterValue)
                } else if (decimalPositions == 1) {
                    dispValue = String.format("%3.1f",cmd.scaledMeterValue)
                } else if (decimalPositions == 0) {
                    dispValue = Math.round(cmd.scaledMeterValue)
                } else {
                    dispValue = String.format("%3.3f",cmd.scaledMeterValue)
                }
                if (cmd.scaledMeterValue < state.powerLowVal) {
                    def dispLowValue = dispValue+" watts on "+timeString
                    sendEvent(name: "powerLow", value: dispLowValue as String, unit: "", displayed: false)
                    state.powerLowVal = cmd.scaledMeterValue
                    response(refreshHistory())
                }
                if (cmd.scaledMeterValue > state.powerHighVal) {
                    def dispHighValue = dispValue+" watts on "+timeString
                    sendEvent(name: "powerHigh", value: dispHighValue as String, unit: "", displayed: false)
                    state.powerHighVal = cmd.scaledMeterValue
                    response(refreshHistory())
                }
                if (state.displayDisabled) {
                	sendEvent(name: "power", value: dispValue, unit: "watts", displayed: true)
                } else {
                    sendEvent(name: "power", value: dispValue, unit: "watts", displayed: false)
                }
            }
        }
    } else if (cmd.scale==4) {
        if (cmd.scaledMeterValue != state.voltageValue) {
            state.voltageValue = cmd.scaledMeterValue
            if (decimalPositions == 2) {
                dispValue = String.format("%3.2f",cmd.scaledMeterValue)
            } else if (decimalPositions == 1) {
                dispValue = String.format("%3.1f",cmd.scaledMeterValue)
            } else if (decimalPositions == 0) {
                dispValue = Math.round(cmd.scaledMeterValue)
            } else {
                dispValue = String.format("%3.3f",cmd.scaledMeterValue)
            }
            if (cmd.scaledMeterValue < state.voltageLowVal) {
                def dispLowValue = dispValue+" volts on "+timeString
                sendEvent(name: "voltageLow", value: dispLowValue as String, unit: "", displayed: false)
                state.voltageLowVal = cmd.scaledMeterValue
                response(refreshHistory())
            }
            if (cmd.scaledMeterValue > state.voltageHighVal) {
                def dispHighValue = dispValue+" volts on "+timeString
                sendEvent(name: "voltageHigh", value: dispHighValue as String, unit: "", displayed: false)
                state.voltageHighVal = cmd.scaledMeterValue
                response(refreshHistory())
            }
            if (state.displayDisabled) {
                sendEvent(name: "voltage", value: dispValue, unit: "volts", displayed: true)
            } else {
                sendEvent(name: "voltage", value: dispValue, unit: "volts", displayed: false)
            }
        }
    } else if (cmd.scale==5) {
        if (cmd.scaledMeterValue != state.ampsValue) {
            state.ampsValue = cmd.scaledMeterValue
            if (decimalPositions == 2) {
                dispValue = String.format("%3.2f",cmd.scaledMeterValue)
            } else if (decimalPositions == 1) {
                dispValue = String.format("%3.1f",cmd.scaledMeterValue)
            } else if (decimalPositions == 0) {
                dispValue = Math.round(cmd.scaledMeterValue)
            } else {
                dispValue = String.format("%3.3f",cmd.scaledMeterValue)
            }
            if (cmd.scaledMeterValue < state.currentLowVal) {
                def dispLowValue = dispValue+" amps on "+timeString
                sendEvent(name: "currentLow", value: dispLowValue as String, unit: "", displayed: false)
                state.currentLowVal = cmd.scaledMeterValue
                response(refreshHistory())
            }
            if (cmd.scaledMeterValue > state.currentHighVal) {
                def dispHighValue = dispValue+" amps on "+timeString
                sendEvent(name: "currentHigh", value: dispHighValue as String, unit: "", displayed: false)
                state.currentHighVal = cmd.scaledMeterValue
                response(refreshHistory())
            }
            if (state.displayDisabled) {
                sendEvent(name: "current", value: dispValue, unit: "amps", displayed: true)
            } else {
                sendEvent(name: "current", value: dispValue, unit: "amps", displayed: false)
            }
        }
    }
}

def zwaveEvent(physicalgraph.zwave.commands.basicv1.BasicReport cmd)
{
	def result = []
	result << createSwitchEvent(cmd.value, "physical")
	return result
}

def zwaveEvent(physicalgraph.zwave.commands.switchbinaryv1.SwitchBinaryReport cmd)
{
	def result = []
	result << createSwitchEvent(cmd.value, "digital")
	return result
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

// PING is used by Device-Watch in attempt to reach the Device
def ping() {
	refresh()
}

def refresh() {
    if (state.debug) log.debug "${device.label} refresh"
	delayBetween([
		zwave.switchBinaryV1.switchBinaryGet().format(),
		zwave.meterV3.meterGet(scale: 0).format(),
		zwave.meterV3.meterGet(scale: 2).format(),
        zwave.meterV3.meterGet(scale: 4).format(),
        zwave.meterV3.meterGet(scale: 5).format()
	])
}

def resetWatts() {
    if (state.debug) log.debug "${device.label} watts min/max reset"
    state.powerHighVal = 0
    state.powerLowVal = 999999
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "powerLow", value: "Value reset on "+timeString, unit: "")    
    sendEvent(name: "powerHigh", value: "Value reset on "+timeString, unit: "")
    def cmd = delayBetween( [
        zwave.meterV3.meterGet(scale: 2).format()
    ])
    cmd
    response(refreshHistory())
}

def resetEnergy() {
    if (state.debug) log.debug "${device.label} reset kWh/Cost values"
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "kwhCosts", value: "(reset)", unit: "", displayed: false)
    def cmd = delayBetween( [
        zwave.meterV3.meterReset().format(),
        zwave.meterV3.meterGet(scale: 0).format()
    ])
    cmd
    response(refreshHistory())
}

def resetVolts() {
    if (state.debug) log.debug "${device.label} volts min/max reset"
    state.voltageHighVal = 0
    state.voltageLowVal = 999999
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "voltageLow", value: "Value reset on "+timeString, unit: "")    
    sendEvent(name: "voltageHigh", value: "Value reset on "+timeString, unit: "")
    def cmd = delayBetween( [
        zwave.meterV3.meterGet(scale: 4).format()
    ])
    cmd
    response(refreshHistory())
}

def resetAmps() {
    if (state.debug) log.debug "${device.label} amps min/max reset"
    state.currentHighVal = 0
    state.currentLowVal = 999999
	def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
    sendEvent(name: "currentLow", value: "Value reset on "+timeString, unit: "")    
    sendEvent(name: "currentHigh", value: "Value reset on "+timeString, unit: "")
    def cmd = delayBetween( [
        zwave.meterV3.meterGet(scale: 5).format()
    ])
    cmd
    response(refreshHistory())
}

def refreshHistory() {
	if (state.debug) log.debug "${device.label} mix/max history values refreshed"
    def timeString = new Date().format("MM-dd-yy h:mm a", location.timeZone)
	def historyDisp = ""
    historyDisp = "Minimum/Maximum Readings as of ${timeString}\n-------------------------------------------------------------------------\nPower Low : ${device.currentState('powerLow')?.value}\nPower High : ${device.currentState('powerHigh')?.value}\nVoltage Low : ${device.currentState('voltageLow')?.value}\nVoltage High : ${device.currentState('voltageHigh')?.value}\nCurrent Low : ${device.currentState('currentLow')?.value}\nCurrent High : ${device.currentState('currentHigh')?.value}\n"
    sendEvent(name: "history", value: historyDisp, displayed: false)
}

def configure() {
    log.debug "${device.label} configuring..."
	delayBetween([
    zwave.configurationV2.configurationSet(parameterNumber: 20, size: 1, scaledConfigurationValue: overloadProtection).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 21, size: 1, scaledConfigurationValue: powerFailureRecovery).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 24, size: 1, scaledConfigurationValue: ledIndicator).format(),
	zwave.configurationV2.configurationSet(parameterNumber: 27, size: 1, scaledConfigurationValue: onoffNotifications).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 151, size: 2, scaledConfigurationValue: wattsChanged).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 152, size: 1, scaledConfigurationValue: wattsPercent).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 171, size: 4, scaledConfigurationValue: secondsWatts).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 172, size: 4, scaledConfigurationValue: secondsKwh).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 173, size: 4, scaledConfigurationValue: secondsVolts).format(),
    zwave.configurationV2.configurationSet(parameterNumber: 174, size: 4, scaledConfigurationValue: secondsAmps).format(),
	])
}