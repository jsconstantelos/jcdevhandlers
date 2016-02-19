/**
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
 */
definition(
    name: "Virtual Temp Device Child",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Virtual Temp Device Child",
    category: "My Apps",
    parent: "jscgs350:Virtual Temp Device Parent",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    section("Choose a target virtual temperature device... "){
        input "target", "capability.temperatureMeasurement", title: "Tile"
    }
    section("Choose one or more source temperature sensors... "){
        input "sensors", "capability.temperatureMeasurement", title: "Sensors", multiple: true
    }
}

def installed() {
    initialize()
}

def updated() {
    unsubscribe()
    initialize()
}

def initialize() {
    subscribe(sensors, "temperature", temperatureHandler)
}

def temperatureHandler(evt) {
    def sum     = 0
    def count   = 0
    def average = 0

    for (sensor in settings.sensors) {
        count += 1
        sum   += sensor.currentTemperature
    }

    average = sum/count
    log.debug "average: $average"

    settings.target.parse("temperature: ${average}")
}