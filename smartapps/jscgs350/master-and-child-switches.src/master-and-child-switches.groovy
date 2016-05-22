/**
 *  Master and Child Switches
 */

definition(
    name: "Master and Child Switches",
    namespace: "jscgs350",
    author: "SmartThings",
    description: "Pick a master switch to control other switches.  Kind of like a traditional switched outlet.  Can also be used with a virtual master switch.",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience%402x.png")


preferences {
	section("When this master switch is turned on or off...") {
		input name: "master", title: "Which Switch?", type: "capability.switch", required: true
	}
    section("Turn on or off all of these switches as well") {
		input "switches", "capability.switch", multiple: true, required: false
	}
	section("Turn off but not on all of these switches") {
		input "offSwitches", "capability.switch", multiple: true, required: false
	}
	section("And turn on but not off all of these switches") {
		input "onSwitches", "capability.switch", multiple: true, required: false
	}
}

def installed() {
	subscribeToEvents()
}

def updated() {
	unsubscribe()
	subscribeToEvents()
}

def subscribeToEvents() {
	subscribe(master, "switch.on", onHandler, [filterEvents: false])
	subscribe(master, "switch.off", offHandler, [filterEvents: false])
}

def onHandler(evt) {
	log.debug evt.value
	log.debug onSwitches()
	onSwitches()?.on()
}

def offHandler(evt) {
	log.debug evt.value
	log.debug offSwitches()
	offSwitches()?.off()
}

private onSwitches() {
	if(switches && onSwitches) { switches + onSwitches }
	else if(switches) { switches }
	else { onSwitches }
}

private offSwitches() {
	if(switches && offSwitches) { switches + offSwitches }
	else if(switches) { switches }
	else { offSwitches }
}