/**
 *  Copyright 2014 SmartThings
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *      http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 */
metadata {
	// Automatically generated. Make future change here.
	definition (name: "My Simulated Presence Sensor", namespace: "jscgs350", author: "jscgs350") {
		capability "Contact Sensor"
        capability "Switch"
		command "open"
		command "close"
	}
	tiles {
		standardTile("contact", "device.contact", width: 2, height: 2) {
			state("open", label:'Away', icon:"st.presence.tile.not-present", backgroundColor:"#ffffff", action: "close")
			state("closed", label:'Present', icon:"st.presence.tile.present", backgroundColor:"#00a0dc", action: "open")
		}
		main "contact"
		details "contact"
	}
}
def parse(String description) {
	def pair = description.split(":")
	createEvent(name: pair[0].trim(), value: pair[1].trim())
}
def on() {
	sendEvent(name: "switch", value: "on")
    sendEvent(name: "contact", value: "closed")
}
def off() {
	sendEvent(name: "switch", value: "off")
    sendEvent(name: "contact", value: "open")
}
def open() {
	sendEvent(name: "contact", value: "open")
    sendEvent(name: "switch", value: "off")
}
def close() {
    sendEvent(name: "contact", value: "closed")
    sendEvent(name: "switch", value: "on")
}