/*
 *  Color Temperature Bulb Management
*/

definition(
	name: "Color Temperature Bulb Management",
	namespace: "jscgs350",
	author: "jscgs350",
	description: "Color Temperature Bulb Management",
	category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
	section("Set these bulbs to 5000k...") {input "bulbs", "capability.colorTemperature", title: "Which bulbs do you want to manage?", multiple:true, required: false}
//    section("And set to this temperature...") {input "colorTemp", type: "number", title: "Color Temperature? (2700-6500)", required: false, defaultValue:"5000"}
}

def installed() {
	unsubscribe()
    unschedule()
	initialize()
}

def updated() {
	unsubscribe()
    unschedule()
	initialize()
}

def initialize() {
	log.debug("initialize() with settings: ${settings}")
    if(bulbs) {subscribe(bulbs, "switch.on", bulbHandler)}
}

def bulbHandler(evt) {
    def colorTemp = 5000
    for(bulb in bulbs) {if(bulb.currentValue("switch") == "on") {bulb.setColorTemperature(colorTemp)}}
} 