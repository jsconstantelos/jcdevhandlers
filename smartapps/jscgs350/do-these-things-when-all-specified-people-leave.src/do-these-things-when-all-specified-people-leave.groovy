/*
 *  Do these things when all specified people leave
 *
*/

// Automatically generated. Make future change here.
definition(
    name: "Do these things when all specified people leave",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Do these things when all specified people leave",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience%402x.png"
    )

preferences {

	section("When all of these people leave home") {
		input "people", "capability.presenceSensor", multiple: true, required: true
	}
    
    section("Change these thermostats") {
        input "thermostat", "capability.thermostat", title: "Which?", multiple:true
    }

    section("To this Fan setting") {
        input "fanSetpoint", "enum", title: "Which setting?", multiple:false, 
        metadata:[values:["On","Auto","Circulate"]]
    }

	section("Turn ON all of these switches") {
		input "switches", "capability.switch", multiple: true, required: false
	}

/*    section {
        input("recipients", "contact", title: "Send notifications to") {
            input(name: "sms", type: "phone", title: "Send A Text To", description: null, required: false)
            input(name: "pushNotification", type: "bool", title: "Send a push notification", description: null, defaultValue: true)
        }
    }*/
}

def installed() {
	log.debug "Installed with settings: ${settings}"
	subscribe(people, "presence", presence)
}

def updated() {
	log.debug "Updated with settings: ${settings}"
	unsubscribe()
	subscribe(people, "presence", presence)
}

def presence(evt) {
	log.debug "evt.name: $evt.value"
	if (evt.value == "not present") {
		log.debug "checking if everyone is away"
		if (everyoneIsAway()) {
			log.debug "people are now away so going to change things..."
			changeThermo ()
            changeSwitch ()
            send "$thermostat fan mode set to '${fanSetpoint}', and turning $switches ON because people have left"
       	}
	}
}

def changeThermo() {
	log.debug "Setting $thermostat fan mode to $fanSetpoint because people have left"
    if (fanSetpoint == "On"){
        thermostat.fanon()
    }
    if (fanSetpoint == "Auto"){
        thermostat.fanauto()
    }
    if (fanSetpoint == "Circulate"){
        thermostat.fancir()
    }
}

def changeSwitch() {
	log.debug "Turning $switches ON"
	switches.on()
}

private everyoneIsAway() {
	def result = true
	for (person in people) {
		if (person.currentPresence == "present") {
			result = false
			break
		}
	}
	return result
}

def send(msg) {
	sendPush(msg)
}
/*
def send(msg) {
    if (location.contactBookEnabled) {
        sendNotificationToContacts(msg, recipients)
    }
    else {
        if (sms) {
            sendSms(sms, msg)
        }
        if (pushNotification) {
            sendPush(msg)
        }
    }
}
*/