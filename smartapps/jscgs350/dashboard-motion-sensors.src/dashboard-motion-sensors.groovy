/**
 *  Motion Sensor Dashboard SmartApp for SmartThings
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
 *  This SmartApp helps you see all your motion sensors in a single view for the devices you selected.
 *
 *  Revision History
 *  ----------------
 *  02-14-2016 : v1.0.0  Initial release
 *  02-29-2016 : Faormatting and variable name changes
 *  10-11-2016 : Changed the app to show motion and inactive in separate lists vs. being all in one.
 *
 */

definition(
    name: "Dashboard - Motion Sensors",
    namespace: "jscgs350",
    author: "jscgs350",
    description: "SmartApp to report motion sensor statuses in a single view.",
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
		title:      "Devices Dashboard",
		nextPage:   null,
		install:    true,
		uninstall:  true
	]

	if (settings.motiondevices == null) {
			return pageConfigure()
	}
    
	def motionlist = ""
	def nomotionlist = ""
    def badlist = ""
	def errorlist = ""
	    
	return dynamicPage(pageProperties) {
    	def rightNow = new Date()
		settings.motiondevices.each() {
			def lastmotion = it.currentValue('motion')
			try {
				if (lastmotion) {
                	if (lastmotion == "active") {
						motionlist += "$it.displayName\n"}
                    if (lastmotion == "inactive") {
						nomotionlist += "$it.displayName\n"}
				} else {
					badlist += "$it.displayName\n"	
				}

			} catch (e) {
					log.trace "Caught error checking a device."
					log.trace e
					errorlist += "$it.displayName\n"
			}
		}

		if (motionlist) {
			section("ACTIVE - Motion Sensors") {
				paragraph motionlist.trim()
			}
		}
        
		if (nomotionlist) {
			section("INACTIVE - Motion Sensors") {
				paragraph nomotionlist.trim()
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

	def inputMotionDevices = [name:"motiondevices",type:"capability.motionSensor",title:"Which motion sensors?",multiple:true,required:true]

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
			input inputMotionDevices
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