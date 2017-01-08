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
	log.debug "Aeon HEM v1 Reset Manager SmartApp installed, check for the user defined schedule and schedule another check for the next day"
    resetTheMeter()
}

def updated() {
}

def initialize() {
	unschedule()
    def scheduleTime = timeToday(time, location.timeZone)
    def timeNow = now() + (2*1000) // ST platform has resolution of 1 minutes, so be safe and check for 2 minutes) 
    log.debug "Current time is ${(new Date(timeNow)).format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    scheduleTime = scheduleTime + 1 // Next day schedule
    log.debug "Scheduling next meter reset check at ${scheduleTime.format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    schedule(scheduleTime, resetTheMeter)
}

def resetTheMeter() {
    Calendar localCalendar = Calendar.getInstance(TimeZone.getDefault());
    def currentDayOfMonth = localCalendar.get(Calendar.DAY_OF_MONTH);
    log.debug "Check for the day of month..."
    log.debug "...day of the month today is ${currentDayOfMonth}"
    log.debug "...day user requested a reset is ${day}"
    if (currentDayOfMonth == day) {
        log.debug "...Resetting HEM because it's when the user requested it."
        meter.resetMeter()
    } else {
        log.debug "...HEM reset not scheduled for today because it's not when the user requested it."
    }
    log.debug "Check complete, now schedule the SmartApp to check the next day."
    initialize()
}