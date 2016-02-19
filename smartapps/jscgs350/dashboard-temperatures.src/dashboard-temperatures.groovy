/**
 *  Temperatures Dashboard SmartApp for SmartThings
 *
 *  Copyright 2015 J.Constantelos
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
 *  Contributors
 *  ----------------
 *  Based off of code from Brandon Gordon (https://github.com/notoriousbdg) - BatteryMonitor SmartApp (https://github.com/notoriousbdg/SmartThings.BatteryMonitor)
 *
 *  Overview
 *  ----------------
 *  This SmartApp helps you see all your temperatures in a single view for the devices you selected capable of reporting temperature readings.
 *
 *  Revision History
 *  ----------------
 *  2015-11-12  v1.0.0  Initial release
 *
 */

definition(
    name: "Dashboard - Temperatures",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "SmartApp to report temperature readings in a single view.",
    category: "My Apps",
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
		title:      "Temperatures Dashboard",
		nextPage:   null,
		install:    true,
		uninstall:  true
	]

	if (settings.tempdevices == null) {
			return pageConfigure()
	}
    
	def goodlist = ""
	def badlist = ""
	def errorlist = ""
	    
	return dynamicPage(pageProperties) {
    	def rightNow = new Date()
		settings.tempdevices.each() {
			def lastTemp = it.currentValue('temperature')
			try {
				if (lastTemp) {
					goodlist += "$lastTemp° : $it.displayName\n"
				} else {
					badlist += "$it.displayName\n"	
				}

			} catch (e) {
					log.trace "Caught error checking a device."
					log.trace e
					errorlist += "$it.displayName\n"
			}
		}

		if (goodlist) {
			section("Devices and Current Temps") {
				paragraph goodlist.trim()
			}
		}

		if (badlist) {
			section("Devices NOT Reporting Temps") {
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

	def inputTempDevices = [name:"tempdevices",type:"capability.temperatureMeasurement",title:"Which temperature devices?",multiple:true,required:true]

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
			input inputTempDevices
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
	log.trace "Launching Temperatures Dashboard"
}