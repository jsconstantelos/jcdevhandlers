/**
 *  Thermostat Manager
 *  Allows you to set single/multiple thermostats to different temp during different days of the week unlimited number of times (one app instance for each change)
 *
 *  Taken from : Samer Theodossy. modified by jscgs350 to add fan mode changes.
 *  Update - 2014-11-20
 */

// Automatically generated. Make future change here.
definition(
    name: "Thermostat Manager Child",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Program thermostat(s) from within SmartThings",
    category: "My Apps",
    parent: "jscgs350:Thermostat Manager",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    section("Set these thermostats") {
        input "thermostat", "capability.thermostat", title: "Which?", multiple:true

    }

    section("To these temperatures") {
        input "heatingSetpoint", "decimal", title: "When Heating"
        input "coolingSetpoint", "decimal", title: "When Cooling"
    }

    section("To this Fan setting") {
        input "fanSetpoint", "enum", title: "Which setting?", multiple:false, 
        metadata:[values:["On","Auto","Circulate"]]
    }

    section("Configuration") {
        input "dayOfWeek", "enum",
                        title: "Which day of the week?",
                        multiple: false,
                        metadata: [
                    values: [
                    'All Week',
                    'Monday to Friday',
                    'Saturday & Sunday',
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday'
                ]
                        ]
        input "time", "time", title: "At this time"
    }
/*
    section {
        input("recipients", "contact", title: "Send notifications to") {
            input(name: "sms", type: "phone", title: "Send A Text To", description: null, required: false)
            input(name: "pushNotification", type: "bool", title: "Send a push notification", description: null, required: false)
        }
    }
*/
}

def installed() {
        // subscribe to these events
        initialize()
}

def updated() {
        // we have had an update
        // remove everything and reinstall
        initialize()
}

def initialize() {
        unschedule()
		def scheduleTime = timeToday(time, location.timeZone)
        def timeNow = now() + (2*1000) // ST platform has resolution of 1 minutes, so be safe and check for 2 minutes) 
        log.debug "Current time is ${(new Date(timeNow)).format("EEE MMM dd yyyy HH:mm z", location.timeZone)}, scheduled check time is ${scheduleTime.format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
        if (scheduleTime.time < timeNow) { // If we have passed current time we're scheduled for next day
	        log.debug "Current scheduling check time $scheduleTime has passed, scheduling check for tomorrow"
        	scheduleTime = scheduleTime + 1 // Next day schedule
        }
        log.debug "Temp change schedule set for $dayOfWeek at time ${scheduleTime.format("HH:mm z", location.timeZone)} to $heatingSetpoint in heat and $coolingSetpoint in cool and the fan to $fanSetpoint"
        log.debug "Scheduling next temp check at ${scheduleTime.format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
        schedule(scheduleTime, setTheTemp)
}

def setTheTemp() {
    def doChange = false
    Calendar localCalendar = Calendar.getInstance(TimeZone.getDefault());
    int currentDayOfWeek = localCalendar.get(Calendar.DAY_OF_WEEK);

    // some debugging in order to make sure things are working correclty
    log.debug "Calendar DOW: " + currentDayOfWeek
    log.debug "SET DOW: " + dayOfWeek

	// Check the condition under which we want this to run now
    // This set allows the most flexibility.
    if(dayOfWeek == 'All Week'){
            doChange = true
    }
    else if((dayOfWeek == 'Monday' || dayOfWeek == 'Monday to Friday') && currentDayOfWeek == Calendar.instance.MONDAY){
            doChange = true
    }

    else if((dayOfWeek == 'Tuesday' || dayOfWeek == 'Monday to Friday') && currentDayOfWeek == Calendar.instance.TUESDAY){
            doChange = true
    }

    else if((dayOfWeek == 'Wednesday' || dayOfWeek == 'Monday to Friday') && currentDayOfWeek == Calendar.instance.WEDNESDAY){
            doChange = true
    }

    else if((dayOfWeek == 'Thursday' || dayOfWeek == 'Monday to Friday') && currentDayOfWeek == Calendar.instance.THURSDAY){
            doChange = true
    }

    else if((dayOfWeek == 'Friday' || dayOfWeek == 'Monday to Friday') && currentDayOfWeek == Calendar.instance.FRIDAY){
            doChange = true
    }

    else if((dayOfWeek == 'Saturday' || dayOfWeek == 'Saturday & Sunday') && currentDayOfWeek == Calendar.instance.SATURDAY){
            doChange = true
    }

    else if((dayOfWeek == 'Sunday' || dayOfWeek == 'Saturday & Sunday') && currentDayOfWeek == Calendar.instance.SUNDAY){
            doChange = true
    }

    // If we have hit the condition to schedule this then lets do it
    if(doChange == true){
        log.debug "Setting temperature in $thermostat to $heatingSetpoint in heat and $coolingSetpoint in cool and the fan to $fanSetpoint"
        thermostat.setHeatingSetpoint(heatingSetpoint)
        thermostat.setCoolingSetpoint(coolingSetpoint)
        if (fanSetpoint == "On"){
            thermostat.fanOn()
        }
        if (fanSetpoint == "Auto"){
            thermostat.fanAuto()
        }
        if (fanSetpoint == "Circulate"){
            thermostat.fanCirculate()
        }
		sendMessage "$thermostat heat set to '${heatingSetpoint}' and cool to '${coolingSetpoint}' and the fan to '${fanSetpoint}'"
    }
    else {
        log.debug "Temp change not scheduled for today."
    }

    log.debug "Scheduling next check"

    initialize() // Setup the next check schedule
}

def sendMessage(msg) {
/*    if (location.contactBookEnabled) {
        sendNotificationToContacts(msg, recipients)
    }
    else {
        if (sms) {
            sendSms(sms, msg)
        }
        if (pushNotification) {
            sendPush(msg)
        }
    }*/
}