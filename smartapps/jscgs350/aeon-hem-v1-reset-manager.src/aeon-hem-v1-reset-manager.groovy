/**
 *  Aeon HEMv1 Reset Manager
 *
 *  Copyright 2016 jscgs350
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
 *  Overview
 *  ----------------
 *  This SmartApp resets the Aeon HEM v1 on a user specified day every month at a time you specify.
 *  NOTE: This has been tested and only works with my DH for the Aeon HEM v1, which can be found here:
 *  https://github.com/constjs/jcdevhandlers/tree/master/devicetypes/jscgs350
 *
 *  Revision History
 *  ----------------
 *  11-22-2016 : Initial release
 *  02-16-2017 : Fixed scheduling issue and improved handling when the app is initially installed and when it's updated.
 *
 */

definition(
    name: "Aeon HEM v1 Reset Manager",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Resets the HEM on a specified day/time of every month",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    section("Choose an Aeon HEM v1 to reset:") {
        input(name: "meter", type: "capability.energyMeter", title: "Which Aeon HEM v1? (tap here)", description: null, required: true, submitOnChange: true)
    }    
    section("Reset Time of Day") {
        input "time", "time", title: "At this time of day"
    }    
    section("Reset Day of Month") {
        input "day", "number", title: "On this day of the month"
    }
}

def installed() {
	log.debug "Aeon HEM v1 Reset Manager SmartApp installed, now preparing to schedule the first reset."
}

def updated() {
	log.debug "Aeon HEM v1 Reset Manager SmartApp updated, so update the user defined schedule and schedule another check for the next day."
	unschedule()
    def scheduleTime = timeToday(time, location.timeZone)
    def timeNow = now()
    log.debug "Current time is ${(new Date(timeNow)).format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    log.debug "Scheduling meter reset check at ${scheduleTime.format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    schedule(scheduleTime, resetTheMeter)
}

def initialize() {
	unschedule()
    def scheduleTime = timeToday(time, location.timeZone)
    def timeNow = now()
    log.debug "Current time is ${(new Date(timeNow)).format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    scheduleTime = scheduleTime + 1 // Next day schedule
    log.debug "Scheduling next meter reset check at ${scheduleTime.format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    schedule(scheduleTime, resetTheMeter)
}

def resetTheMeter() {
    Calendar localCalendar = Calendar.getInstance(TimeZone.getDefault());
    def currentDayOfMonth = localCalendar.get(Calendar.DAY_OF_MONTH);
    log.debug "Aeon HEM v1 meter reset schedule triggered..."
    log.debug "...checking for the day of month requested by the user"
    log.debug "...the day of the month right now is ${currentDayOfMonth}"
    log.debug "...the day the user requested a reset is ${day}"
    if (currentDayOfMonth == day) {
        log.debug "...resetting the meter because it's when the user requested it."
        meter.resetMeter()
    } else {
        log.debug "...meter reset not scheduled for today because it's not when the user requested it."
    }
    log.debug "Process completed, now schedule the reset to check on the next day."
    initialize()
}