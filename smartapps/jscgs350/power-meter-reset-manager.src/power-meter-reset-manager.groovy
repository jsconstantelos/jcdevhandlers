/**
 *  Power Meter Reset Manager for devices using my DTH.  This was previously just for the Aeon HEM v1.
 *
 *  Copyright 2017 jscgs350
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
 *  Revision History
 *  ----------------
 *  11-22-2016 : Initial release
 *  02-16-2017 : Fixed scheduling issue and improved handling when the app is initially installed and when it's updated.
 *  10-03-2018 : Added reset ability for devices using stock DTH's (reset command)
 *  12-18-2018 : Removed resetMeter in favor of just using reset since ST's stock DTH's use reset, and not resetMeter.  My respective custom DTH's have also been updated.  Also fixed scheduling issues.
 *
 */

definition(
    name: "Power Meter Reset Manager",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Resets power metering device using my DTH's on a specified day/time of every month",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    section("Choose an power metering device to reset:") {
        input "meters", "capability.energyMeter", title:"Select devices to be reset", multiple:true, required:true
    }
    section("Reset Time of Day") {
        input "time", "time", title: "At this time of day"
    }    
    section("Reset Day of Month") {
        input "day", "number", title: "On this day of the month"
    }
}

def installed() {
	log.debug "Power Meter Reset Manager SmartApp installed, now preparing to schedule the first reset."
    resetTheMeter()
}

def updated() {
	log.debug "Power Meter Reset Manager SmartApp updated, and/or initialized due to a first time install, so update the user defined schedule."
/*	unschedule()
    def scheduleTime = timeToday(time, location.timeZone)
    def timeNow = now()
    log.debug "Current time is ${(new Date(timeNow)).format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    log.debug "Scheduling meter reset check at ${scheduleTime.format("EEE MMM dd yyyy HH:mm z", location.timeZone)}"
    schedule(scheduleTime, resetTheMeter)*/
    resetTheMeter()
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
    log.debug "Power Meter reset schedule triggered..."
    log.debug "...checking for the day of month requested by the user"
    log.debug "...the day of the month right now is ${currentDayOfMonth}"
    log.debug "...the day the user requested a reset is ${day}"
    if (currentDayOfMonth == day) {
        log.debug "...resetting the meter because it's when the user requested it."
//		settings.meters*.resetMeter()
        settings.meters*.reset()
    } else {
        log.debug "...meter reset not scheduled for today because it's not when the user requested it."
    }
    log.debug "Process completed, now schedule the reset to check on the next day."
    initialize()
}