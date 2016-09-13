/**
 *  FortrezZ Flow Meter Reset Manager
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
 *  This SmartApp resets the FortrezZ Flow Meter Interface at the 1st of every month at a time you specify.
 *  NOTE: This has been tested and works with my DH for the flow meter, which can be found here:
 *  https://raw.githubusercontent.com/constjs/jcdevhandlers/master/devicetypes/jscgs350/fortrezz-flow-meter-interface.src/fortrezz-flow-meter-interface.groovy
 *
 *  Revision History
 *  ----------------
 *  09-12-2016 : Initial release
 *
 */

definition(
    name: "FortrezZ Flow Meter Reset Manager",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Resets meter at the start of every month",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    section("Choose a FortrezZ water meter to reset monthly:") {
        input(name: "meter", type: "capability.energyMeter", title: "Water Meter", description: null, required: true, submitOnChange: true)
    }    
    section("Reset Time") {
        input "time", "time", title: "At this time"
    }    
}

def installed() {
	log.debug "Flow Meter Reset Manager SmartApp installed, check for 1st day of month and schedule another check for the next day"
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
    log.debug "Check for 1st day of month..."
    log.debug "...day of the month today is ${currentDayOfMonth}"
    if (currentDayOfMonth == 1) {
        log.debug "...Resetting flow meter because it's the first day of the month."
        meter.resetMeter()
    } else {
        log.debug "...Flow meter reset not scheduled for today because it's not the first day of the month."
    }
    log.debug "Check complete, now schedule the SmartApp to check the next day."
    initialize()
}