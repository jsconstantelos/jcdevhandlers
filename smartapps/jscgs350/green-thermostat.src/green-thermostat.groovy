/**
 *  HVAC Auto Off
 *
 *  Author: jprosiak@sbcglobal.net (xxKeoxx)
 *  Date: 2016-04-05
 */

definition(
    name: "Green Thermostat",
    namespace: "xxKeoxx",
    author: "jprosiak@sbcglobal.net",
    description: "Automatically turn off thermostat if a contact sensor is open. Turn it back on when everything is closed up.",
    category: "Green Living",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience%402x.png",
    oauth: true
)

preferences {
	section("Control") {
		input("thermostat", "capability.thermostat", title: "Thermostat")
	}
    
    section("Open/Close") {
    	input("sensors", "capability.contactSensor", title: "Sensors", multiple: true)
        input("delay", "number", title: "Delay (minutes) before turning thermostat off")
    }
}

def installed() {
	log.debug "Installed with settings: ${settings}"
	initialize()
}

def updated() {
	log.debug "Updated with settings: ${settings}"
	unsubscribe()
    unschedule()
	initialize()
}

def initialize() {
	state.changed = false
    state.thermostatMode = thermostat.currentValue("thermostatMode")
    subscribe(thermostat, 'thermostatMode', "thermostatChange")
	subscribe(sensors, 'contact', "sensorChange")
    def result = contactOpenList()
    if (result){
    	turnOff()
    }
    log.debug "initialize State Info: $state"
}

def contactOpenList() {
	def result = sensors.findAll() { it.currentValue('contact') == 'open'; }
    return result
    log.debug "Open results: $result"
}

def thermostatChange(evt){
    log.debug "$thermostat $evt.value happened"
	if (thermostat.currentValue("thermostatMode") != "off"){
    	state.thermostatMode = thermostat.currentValue("thermostatMode")
		log.debug "thermostat mode is " + thermostat.currentValue("thermostatMode")
        turnOff()
    }
}

def sensorChange(evt) {
	log.debug "Desc: sensor event happened $evt.value , $state"
    def result = contactOpenList()
    log.debug "Desc: $evt.value , $result , $result.size"
    if(evt.value == 'open' && (result.size() <= 1)) {
        state.thermostatMode = thermostat.currentValue("thermostatMode")
        log.debug "Thermostat mode is ${state.thermostatMode}"
        log.debug "Scheduling to turn off ${thermostat}"
    	runIn(delay * 60, 'turnOff')
	} else if(evt.value == 'closed' && !result) {
        log.debug "getting ready to run restore ${thermostat}"
        unschedule()
    	restore()
    } else if (evt.value == 'closed' && result) {
    	def sensorList = result.join(", ")
        sendPush("left the thermostat off because these contacts are open: ${sensorList}")
    }
}


def turnOff() {
    log.debug "turnOff method happened $state"
    def result = contactOpenList()
    log.debug "result is: $result"
    //if (result && (state.changed == false)){
    if (result && (thermostat.currentValue("thermostatMode") != "off")) {
    	def sensorList = result.join(", ")
    	log.debug "Turning off thermostat.  The following contacts are open: $sensorList"   	
    	thermostat.off()
        //thermostat.setThermostatMode("off")
    	state.changed = true
        //state.thermostatMode = thermostat.currentValue("thermostatMode")
    	log.debug "State: $state"
		sendPush("I changed ${thermostat} to OFF because The following contacts are open: ${sensorList}")
	} else {
        log.debug "Thermostat is in state: " + thermostat.currentValue("thermostatMode")
    }
}

def restore() {
    log.debug "Thermostat state is currently: " + thermostat.currentValue("thermostatMode")
	if (thermostat.currentValue("thermostatMode") != state.thermostatMode){
    	log.debug "Setting thermostat to $state.thermostatMode"
		if (state.thermostatMode == "heat") {
        	thermostat.heat()
        }
		if (state.thermostatMode == "cool") {
        	thermostat.cool()
        }
		if (state.thermostatMode == "auto") {
        	thermostat.auto()
        }
		if (state.thermostatMode == "off") {
        	thermostat.off()
        }
		if (state.thermostatMode == "emergencyHeat") {
        	thermostat.emergencyHeat()
        }
    	state.changed = false
    	sendPush("I changed ${thermostat} back to ${state.thermostatMode} because everything is closed.")
    } else {
    	log.debug "Restore not ran because there were no contact sensors open and ${thermostat} was already set to ${state.thermostatMode}"
        log.debug "No push notification will be sent"
    }
}
