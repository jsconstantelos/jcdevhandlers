/*
 * SmartThings example Code for Google sheets logging
 *
 * Copyright 2016 Charles Schwer
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at:
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 * for the specific language governing permissions and limitations under the License.
 */

definition(
        name: "Google Sheets Logging",
        namespace: "cschwer",
        author: "Charles Schwer",
        description: "Log to Google Sheets",
        category: "My Apps",
        iconUrl: "https://raw.githubusercontent.com/loverso-smartthings/googleDocsLogging/master/img/logoSheets.png",
        iconX2Url: "https://raw.githubusercontent.com/loverso-smartthings/googleDocsLogging/master/img/logoSheets@2x.png",
        iconX3Url: "https://raw.githubusercontent.com/loverso-smartthings/googleDocsLogging/master/img/logoSheets@2x.png")

preferences {
    section("Contact Sensors to Log") {
        input "contacts", "capability.contactSensor", title: "Doors open/close", required: false, multiple: true
        input "contactLogType", "enum", title: "Values to log", options: ["open/closed", "true/false", "1/0"], defaultValue: "open/closed", required: true, multiple: false
    }
    
    section("Motion Sensors to Log") {
        input "motions", "capability.motionSensor", title: "Motion Sensors", required: false, multiple: true
        input "motionLogType", "enum", title: "Values to log", options: ["active/inactive", "true/false", "1/0"], defaultValue: "active/inactive", required: true, multiple: false
    }
    
    section("Thermostat Settings") {
        input "heatingSetPoints", "capability.thermostat", title: "Heating Setpoints", required: false, multiple: true
        input "coolingSetPoints", "capability.thermostat", title: "Cooling Setpoints", required: false, multiple: true
        input "thermOperatingStates", "capability.thermostat", title: "Operating States", required: false, multiple: true
    }
    
    section("Locks to Log") {
        input "locks", "capability.lock", title: "Locks", multiple: true, required: false
        input "lockLogType", "enum", title: "Values to log", options: ["locked/unlocked", "true/false", "1/0"], defaultValue: "locked/unlocked", required: true, multiple: false
    }
    
    section("Log Other Devices") {
        input "temperatures", "capability.temperatureMeasurement", title: "Temperatures", required: false, multiple: true
        input "humidities", "capability.relativeHumidityMeasurement", title: "Humidity Sensors", required: false, multiple: true
        input "illuminances", "capability.illuminanceMeasurement", title: "Illuminance Sensors", required: false, multiple: true
        input "presenceSensors", "capability.presenceSensor", title: "Presence Sensors", required: false, multiple: true
        input "switches", "capability.switch", title: "Switches", required: false, multiple: true
        input "dimmerSwitches", "capability.switchLevel", title: "Dimmer Switches", required: false, multiple: true
        input "energyMeters", "capability.energyMeter", title: "Energy Meters", required: false, multiple: true
        input "powerMeters", "capability.powerMeter", title: "Power Meters", required: false, multiple: true
        input "batteries", "capability.battery", title: "Batteries", multiple: true, required: false
        input "sensors", "capability.sensor", title: "Sensors", required: false, multiple: true
        input "sensorAttributes", "text", title: "Sensor Attributes (comma delimited)", required: false
    }
//      input "detectors", "capability.smokeDetector", title: "Smoke/CarbonMonoxide Detectors", required: false, multiple: true
//      input "watersensors", "capability.waterSensor", title: "Water Sensors", required: false, multiple: true
//      input "accelerations", "capability.accelerationSensor", title: "Acceleration Sensors", required: false, multiple: true

    section ("Google Sheets") {
        input "urlKey", "text", title: "Script URL key", required: true
        input "appsDomain", "text", title: "Apps domainname", description: "Only set this if not using google.com", required: false
    }
    
    section ("Technical settings") {
        input "queueTime", "enum", title:"Time to queue events before pushing to Google (in minutes)", options: ["0", "1", "5", "10", "15"], defaultValue:"5"
        input "resetVals", "enum", title:"Reset the state values (queue, schedule, etc)", options: ["yes", "no"], defaultValue: "no"
    }

    section("About") {
        paragraph "Version 1.1"
        href url:"https://github.com/loverso-smartthings/googleDocsLogging", style:"embedded", required:false, title:"Installation instructions"
    }
}

def installed() {
    setOriginalState()
    initialize()
}

def updated() {
    log.debug "Updated"
    unsubscribe()
    initialize()
    if (settings.resetVals == "yes") {
        setOriginalState()
        settings.resetVals = "no"
    }
}

def initialize() {
    log.debug "Initialized"
    subscribe(locks, "lock", handleLockEvent)
    subscribe(batteries, "battery", handleNumberEvent)
    subscribe(contacts, "contact", handleContactEvent)
    subscribe(motions, "motion", handleMotionEvent)
    subscribe(heatingSetPoints, "heatingSetpoint", handleNumberEvent)
    subscribe(coolingSetPoints, "coolingSetpoint", handleNumberEvent)
    subscribe(thermOperatingStates, "thermostatOperatingState", handleStringEvent)
    subscribe(temperatures, "temperature", handleNumberEvent)
    subscribe(energyMeters, "energy", handleNumberEvent)
    subscribe(powerMeters, "power", handleNumberEvent)
    subscribe(humidities, "humidity", handleNumberEvent)
    subscribe(illuminances, "illuminance", handleNumberEvent)
    subscribe(presenceSensors, "presence", handleStringEvent)
    subscribe(switches, "switch", handleStringEvent)
    subscribe(dimmerSwitches, "switch", handleStringEvent)
    subscribe(dimmerSwitches, "level", handleNumberEvent)
    if (sensors != null && sensorAttributes != null) {
        sensorAttributes.tokenize(',').each {
            subscribe(sensors, it, handleStringEvent)
        }
    }
}

def setOriginalState() {
    log.debug "Set original state"
    unschedule()
    atomicState.queue = [:]
    atomicState.failureCount=0
    atomicState.scheduled=false
    atomicState.lastSchedule=0
}

def handleStringEvent(evt) {
log.debug "handling string event ${evt}"
    if (settings.queueTime.toInteger() > 0) {
        queueValue(evt) { it }
    } else {
        sendValue(evt) { it }
    }
}

def handleNumberEvent(evt) {
    if (settings.queueTime.toInteger() > 0) {
        queueValue(evt) { it.toString() }
    } else {
        sendValue(evt) { it.toString() }
    }
}

def handleContactEvent(evt) {
    // default to open/close, the value of the event
    def convertClosure = { it }
    if (contactLogType == "true/false")
        convertClosure = { it == "open" ? "true" : "false" }
    else if ( contactLogType == "1/0")
        convertClosure = { it == "open" ? "1" : "0" }

    if (settings.queueTime.toInteger() > 0) {
        queueValue(evt, convertClosure)
    } else {
        sendValue(evt, convertClosure)
    }
}

def handleMotionEvent(evt) {
    // default to active/inactive, the value of the event
    def convertClosure = { it }
    if (motionLogType == "true/false")
        convertClosure = { it == "active" ? "true" : "false" }
    else if (motionLogType == "1/0")
        convertClosure = { it == "active" ? "1" : "0" }

    if (settings.queueTime.toInteger() > 0) {
        queueValue(evt, convertClosure)
    } else {
        sendValue(evt, convertClosure)
    }
}

def handleLockEvent(evt) {
    // default to locked/unlocked, the value of the event
    def convertClosure = { it }
    if (lockLogType == "true/false") {
        convertClosure = { it == "locked" ? "true" : "false" }
    } else if (lockLogType == "1/0") {
        convertClosure = { it == "locked" ? "1" : "0" }
    }
    if (settings.queueTime.toInteger() > 0) {
        queueValue(evt, convertClosure)
    } else {
        sendValue(evt, convertClosure)
    }
}

private def baseUrl() {
    String url = "https://script.google.com/"
    if (settings.appsDomain != null) url += "a/"
    url += "macros/"
    if (settings.appsDomain != null) url += "${appsDomain}/"
    url += "s/${urlKey}/exec?"

    log.debug "url ["+url+"]"
    return url
}

private sendValue(evt, Closure convert) {
    def keyId = URLEncoder.encode(evt.displayName.trim()+ " " +evt.name)
    def value = URLEncoder.encode(convert(evt.value))

    log.debug "Logging to GoogleSheets ${keyId} = ${value}"
    
    def url = baseUrl() + "${keyId}=${value}"
    log.debug "${url}"
    
    def putParams = [
        uri: url
    ]

    httpGet(putParams) { response ->
        log.debug(response.status)
        if (response.status != 200 ) {
            log.debug "Google logging failed, status = ${response.status}"
        }
    }
}

private queueValue(evt, Closure convert) {
    checkAndProcessQueue()
    if ( evt?.value ) {
        
        def keyId = URLEncoder.encode(evt.displayName.trim()+ " " +evt.name)
        def value = URLEncoder.encode(convert(evt.value))
    
        log.debug "Logging to queue ${keyId} = ${value}"
        
        if ( atomicState.queue == [:] ) {
            // format time in the same wasy as sheets does
            def eventTime = URLEncoder.encode(evt.date.format( 'M/d/yyyy HH:mm:ss', location.timeZone ))
            addToQueue("Time", eventTime)
        }
        addToQueue(keyId, value)
        
        log.debug(atomicState.queue)

        scheduleQueue()
    }
}

/*
 * atomicState acts differently from state, so we have to get the map, put the new item and copy the map back to the atomicState
 */
private addToQueue(key, value) {
    def queue = atomicState.queue
    queue.put(key, value)
    atomicState.queue = queue
}

private checkAndProcessQueue() {
    if (atomicState.scheduled && ((now() - atomicState.lastSchedule) > (settings.queueTime.toInteger()*120000))) {
        // if event has been queued for twice the amount of time it should be, then we are probably stuck
        sendEvent(name: "scheduleFailure", value: now())
        unschedule()
        processQueue()
    }
}

def scheduleQueue() {
    if (atomicState.failureCount >= 3) {
        log.debug "Too many failures, clearing queue"
        sendEvent(name: "queueFailure", value: now())
        resetState()
    }
    
    if (!atomicState.scheduled) {
        runIn(settings.queueTime.toInteger() * 60, processQueue)
        atomicState.scheduled=true
        atomicState.lastSchedule=now()
    } 
}


private resetState() {
    atomicState.queue = [:]
    atomicState.failureCount=0
    atomicState.scheduled=false
}

def processQueue() {
    atomicState.scheduled=false
    log.debug "Processing Queue"
    if (atomicState.queue != [:]) {
        def url = baseUrl()
        for ( e in atomicState.queue ) { url+="${e.key}=${e.value}&" }
        url = url[0..-2]
        log.debug(url)
        try {
            def putParams = [
                uri: url
            ]

            httpGet(putParams) { response ->
                log.debug(response.status)
                if (response.status != 200 ) {
                    log.debug "Google logging failed, status = ${response.status}"
                    atomicState.failureCount = atomicState.failureCount+1
                    scheduleQueue()
                } else {
                    log.debug "Google accepted event(s)"
                    resetState()
                }
            }
            atomicState.queue = [:]
            atomicState.failureCount=0
            atomicState.scheduled=false
        } catch(e) {
            def errorInfo = "Error sending value: ${e}"
            log.error errorInfo
        }
    }
}