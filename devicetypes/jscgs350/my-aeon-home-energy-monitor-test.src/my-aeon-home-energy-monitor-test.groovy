metadata {
    definition (name: "My Aeon Home Energy Monitor TEST", namespace: "jscgs350", author: "jscgs350") 
{
    capability "Energy Meter"
    capability "Power Meter"
    capability "Configuration"
    capability "Sensor"
    capability "Refresh"
    capability "Polling"
    capability "Battery"
    
    attribute "currentWATTS", "string"  // Used to show current watts being used on the main tile
    attribute "nobattery", "string"		// Used within the main tile to not show battery info if selected by the user

}
// tile definitions
	tiles(scale: 2) {
		multiAttributeTile(name:"currentWATTS", type: "generic", width: 6, height: 4, decoration: "flat"){
			tileAttribute ("device.currentWATTS", key: "PRIMARY_CONTROL") {
				attributeState "default", action: "refresh", label: '${currentValue}', icon: "https://raw.githubusercontent.com/constjs/jcdevhandlers/master/img/device-activity-tile@2x.png", backgroundColor: "#79b821"
			}
            tileAttribute ("device.battery", key: "SECONDARY_CONTROL") {
                attributeState("battery", label:'${currentValue}% battery', icon: "https://raw.githubusercontent.com/constjs/jcdevhandlers/master/img/battery-icon-614x460.png")
                attributeState("nobattery", label:'none', icon: "https://raw.githubusercontent.com/constjs/jcdevhandlers/master/img/nobattery.png")
            }
		}    

        main (["currentWATTS"])
        details(["currentWATTS"])
        }

        preferences {
        	input "displayBatteryLevel", "boolean",
            	title: "Display battery level on main tile?", 
            	defaultValue: true,
                required: false,
            	displayDuringSetup: true
        }
}

def updated() {
    state.displayBattery = ("true" == displayBatteryLevel)
    response(configure())
}

def parse(String description) {
    def result = null
    def cmd = zwave.parse(description, [0x31: 1, 0x32: 1, 0x60: 3, 0x80: 1])
    if (cmd) {
        result = createEvent(zwaveEvent(cmd))
    }
    return result
}

def zwaveEvent(physicalgraph.zwave.commands.batteryv1.BatteryReport cmd) {
	log.debug "Battery level report sent from the meter: ${cmd}"
	if (state.displayBattery) {
        def map = [:]
        map.name = "battery"
        map.unit = "%"
        if (cmd.batteryLevel == 0xFF) {
        	log.debug "Low battery alert!"
            map.value = 1
            map.descriptionText = "${device.displayName} has a low battery"
            map.isStateChange = true
        } else {
            map.value = cmd.batteryLevel
            sendEvent(name: "battery", value: map.value as String, displayed: false)
        }
    } else {
    	log.debug "Battery report disabled..."
        def map = [:]
        map.name = "nobattery"
        map.unit = ""
        map.value = "no battery"
        sendEvent(name: "nobattery", value: "no battery" as String, displayed: false)
    }
    return map
}

def configure() {
    log.debug "${device.name} configuring..."
	if (state.displayBattery) {
    	log.debug "Battery display enabled..."
    } else { 
        log.debug "Battery display DISABLED..."
    }
}