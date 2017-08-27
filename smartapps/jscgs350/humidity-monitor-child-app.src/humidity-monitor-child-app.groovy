/**
 *  Humidity Monitor Child App
 *
 *  Based on Its too cold code by SmartThings and Brian Critchlow
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
    name: "Humidity Monitor Child App",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Turn on a switch when humidity rises above the threshold, and off when it falls below the threshold.",
    category: "My Apps",
    parent: "jscgs350:Humidity Monitor Parent App",
    iconUrl: "https://graph.api.smartthings.com/api/devices/icons/st.Weather.weather9-icn",
    iconX2Url: "https://graph.api.smartthings.com/api/devices/icons/st.Weather.weather9-icn?displaySize=2x"
)

preferences {
	section("Monitor the humidity of:") {
		input "humiditySensor1", "capability.relativeHumidityMeasurement"
	}
	section("Humidity threshold:") {
		input "humidity1", "number", title: "Percentage ?"
	}
	section("Control this switch:") {
		input "switch1", "capability.switch", required: false
	}
}

def installed() {
	subscribe(humiditySensor1, "humidity", humidityHandler)
}

def updated() {
	unsubscribe()
	subscribe(humiditySensor1, "humidity", humidityHandler)
}

def humidityHandler(evt) {
	def currentHumidity = Double.parseDouble(evt.value.replace("%", ""))
	def tooHumid = humidity1
	def mySwitch = settings.switch1
	if (currentHumidity > tooHumid) {
			switch1?.on()
        } else {
        	switch1?.off()
	}
}