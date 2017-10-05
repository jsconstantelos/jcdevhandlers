/**
 *  Notify Me When A Switch Turns On
 *
 *  Author: SmartThings
 */
definition(
    name: "Notify Me When A Switch Turns On",
    namespace: "jscgs350",
    author: "SmartThings",
    description: "Get a text message sent to your phone when a switch is turned off.",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png"
)

preferences {
	def inputSwitchDevices = [name:"switchdevices",type:"capability.switch",title:"Which switches to monitor?",multiple:true,required:true]
    section("Switches to monitor:") {
        input "switches1", "capability.switch", title: "Switches?", multiple: true
    }
	section("Phone number to text?"){
        input "phone1", "phone", title: "Phone number?"
	}
}

def installed()
{
	subscribe(switches1, "switch.on", switchOnHandler)
}

def updated()
{
	unsubscribe()
	subscribe(switches1, "switch.on", switchOnHandler)
}

def switchOnHandler(evt) {
	log.trace "$evt.value: $evt, $settings"
    settings.switches1.each() {
        def lastSwitch = it.currentValue('switch')
        try {
            if (lastSwitch) {
                if (lastSwitch == 'off') {
                    sendSms(phone1, "Your $it.displayName was turned ON!")}
            }
        } catch (e) {
            log.trace "Caught error checking a device."
            log.trace e
        }
    }
	
}