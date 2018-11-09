/**
 *  Dashboard - Lights, Switches, and Outlets Child SmartApp for SmartThings
 *
 *  Copyright 2016 J.Constantelos
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
 *  09-17-2016 : v1.0.0  Initial release (parent/child app)
 *
 */

definition(
    name: "Dashboard - Lights, Switches, and Outlets Child",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "SmartApp to report Lights, Switches, and Outlets status in a single view.",
    category: "My Apps",
    parent: "jscgs350:Dashboard - Lights, Switches, and Outlets Parent",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    page name:"pageStatus"
    page name:"pageConfigure"
}

//***************************
//Show Status page
//***************************
def pageStatus() {
	def pageProperties = [
		name:       "pageStatus",
		title:      "Devices Dashboard",
		nextPage:   null,
		install:    true,
		uninstall:  true
	]
	if (settings.switchdevices == null) {
			return pageConfigure()
	}
	def onlist = ""
	def offlist = ""
    def badlist = ""
	def errorlist = ""
	return dynamicPage(pageProperties) {
    	def rightNow = new Date()
		settings.switchdevices.each() {
			def lastSwitch = it.currentValue('switch')
			try {
				if (lastSwitch) {
                	if (lastSwitch == 'on') {
						onlist += "$it.displayName\n"}
                    if (lastSwitch == 'off') {
						offlist += "$it.displayName\n"}
				} else {
					badlist += "$it.displayName\n"	
				}
			} catch (e) {
					log.trace "Caught error checking a device."
					log.trace e
					errorlist += "$it.displayName\n"
			}
		}
		if (onlist) {
			section("ON - Lights, Switches, or Outlets") {
				paragraph onlist.trim()
			}
		}
		if (offlist) {
			section("OFF - Lights, Switches, or Outlets") {
				paragraph offlist.trim()
			}
		}
		if (badlist) {
			section("Devices NOT Reporting States") {
				paragraph badlist.trim()
			}
		}
		if (errorlist) {
			section("Devices with Errors") {
				paragraph errorlist.trim()
			}
		}
		section("Menu") {
			href "pageStatus", title:"Refresh", description:"Tap to refresh the status of devices"
			href "pageConfigure", title:"Configure", description:"Tap to manage your list of devices"
		}
	}
}

//***************************
//Show Configure Page
//***************************
def pageConfigure() {
	def helpPage = "Select devices that you wish to check when you open this SmartApp."

	def inputSwitchDevices = [name:"switchdevices",type:"capability.switch",title:"Which switch devices?",multiple:true,required:true]

	def pageProperties = [name:"pageConfigure",
		title:          "Dashboard Configurator",
		nextPage:       "pageStatus",
		uninstall:      true
	]
	return dynamicPage(pageProperties) {
		section("About This App") {
			paragraph helpPage
		}
		section("Devices To Check") {
			input inputSwitchDevices
		}
		section([title:"Available Options", mobileOnly:true]) {
			label title:"Assign a name for your app (optional)", required:false
		}
	}
}

def installed() {
	initialize()
}

def updated() {
	initialize()
}

def initialize() {
	log.trace "Devices Dashboard"
}