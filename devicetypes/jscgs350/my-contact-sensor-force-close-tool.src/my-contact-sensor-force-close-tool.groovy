/**
 *  Contact Sensor Reset - Force a closed state in the SmartThings app, not the actual device.
 */

metadata {
	definition (name: "My Contact Sensor Force Close Tool", namespace: "jscgs350", author: "SmartThings") {
        capability "Refresh"
        capability "Sensor"
        capability "Contact Sensor"
	}

	// UI tile definitions 
	tiles(scale: 2) {
        standardTile("contact", "device.contact", inactiveLabel: false, width: 2, height: 2) {
			state "open", label: '${name}', icon: "st.contact.contact.open", backgroundColor: "#ffa81e"
			state "closed", label: '${name}', icon: "st.contact.contact.closed", backgroundColor: "#79b821"
		}
        standardTile("refresh", "device.switch", width: 4, height: 2, inactiveLabel: false, decoration: "flat") {
			state "default", label:'FORCE CLOSE', action:"refresh.refresh", icon: "st.contact.contact.closed"
		}
		main (["contact"])
		details(["contact", "refresh"])
    }
}

def refresh() {
	log.debug "Open/Close sensor is stuck in an open state, so we'll force a closed state..."
	sendEvent(name: "contact", value: "closed")
}
